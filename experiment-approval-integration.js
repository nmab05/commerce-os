/* Commerce OS — Experiment / Approval Integration
 * Enrolls eligible approved optimization proposals into matching active experiments.
 * Controls are protected from treatment execution; treatment logging remains explicit.
 */
(function(global){
  'use strict';
  const key=v=>String(v||'').trim().toLowerCase();
  const ACTION_MAP={
    title:'title',description:'title',price:'price','market-price':'price',refresh:'relist','stale-relist':'relist',coverage:'crosslist','stale-crosslist':'crosslist','photo-count':'photo','photo-resolution':'photo','photo-lighting':'photo','photo-background':'photo','photo-review':'photo'
  };
  function ensure(){global.state.experimentProposalLinks=global.state.experimentProposalLinks||[]}
  function actionForProposal(p){const t=key(p.type);if(ACTION_MAP[t])return ACTION_MAP[t];if(t.includes('title')||t.includes('description'))return 'title';if(t.includes('price'))return 'price';if(t.includes('relist')||t.includes('refresh'))return 'relist';if(t.includes('cross')||t.includes('coverage'))return 'crosslist';if(t.includes('photo'))return 'photo';return null}
  function assignmentsFor(itemId,action){
    const active=(global.state.experiments||[]).filter(e=>e.status==='active'&&key(e.action)===key(action));
    return (global.state.experimentAssignments||[]).filter(a=>String(a.itemId)===String(itemId)&&active.some(e=>e.id===a.experimentId)).map(a=>({...a,experiment:active.find(e=>e.id===a.experimentId)}));
  }
  function linkProposal(p){
    ensure();const action=actionForProposal(p);if(!action)return {linked:false,reason:'unsupported-action'};
    const matches=assignmentsFor(p.itemId,action);if(!matches.length)return {linked:false,reason:'no-active-experiment'};
    const a=matches[0],existing=global.state.experimentProposalLinks.find(x=>x.proposalId===p.id&&x.experimentId===a.experimentId);
    if(!existing){global.state.experimentProposalLinks.push({proposalId:p.id,itemId:p.itemId,experimentId:a.experimentId,action,arm:a.arm,linkedAt:new Date().toISOString()});}
    p.experimentId=a.experimentId;p.experimentArm=a.arm;p.experimentAction=action;
    return {linked:true,assignment:a};
  }
  function canApprove(p){
    const r=linkProposal(p);if(!r.linked)return {ok:true,reason:'not-enrolled'};
    if(r.assignment.arm==='control')return {ok:false,reason:'control-protected',experimentId:r.assignment.experimentId};
    return {ok:true,reason:'treatment',experimentId:r.assignment.experimentId};
  }
  function noteIntervention(p){
    if(!p?.experimentId||p.experimentArm!=='treatment'||!global.CommerceOSExperiments)return false;
    return global.CommerceOSExperiments.markIntervention(p.experimentId,p.itemId,{proposalId:p.id,type:p.type,field:p.field,from:p.current,to:p.proposed,approvedAt:p.approvedAt||new Date().toISOString()});
  }
  function install(){
    if(!global.state||!global.CommerceOSExperiments||typeof global.setOptimizationStatus!=='function')return setTimeout(install,120);
    if(global.setOptimizationStatus.__experimentWrapped)return;
    const old=global.setOptimizationStatus;
    const wrapped=function(id,status){
      const p=(global.state.optimizationQueue||[]).find(x=>x.id===id);
      if(p&&status==='approved'){
        const gate=canApprove(p);
        if(!gate.ok){
          p.status='experiment-control';p.experimentBlockedAt=new Date().toISOString();
          if(typeof global.persist==='function')global.persist();if(typeof global.renderOptimizationQueue==='function')global.renderOptimizationQueue();
          if(typeof global.toastMsg==='function')global.toastMsg('Control item protected: this optimization was not approved so the experiment remains valid.');
          return false;
        }
        p.approvedAt=new Date().toISOString();
      }
      const result=old.apply(this,arguments);
      if(p&&status==='approved'&&p.experimentArm==='treatment')noteIntervention(p);
      if(typeof global.persist==='function')global.persist();
      return result;
    };
    wrapped.__experimentWrapped=true;global.setOptimizationStatus=wrapped;
  }
  function autoCreateForPending(action,minItems=6){
    ensure();const candidates=(global.state.optimizationQueue||[]).filter(p=>p.status==='pending'&&actionForProposal(p)===action);
    if(candidates.length<minItems)return null;
    const existing=(global.state.experiments||[]).find(e=>e.status==='active'&&key(e.action)===key(action));if(existing)return existing;
    const itemIds=[...new Set(candidates.map(p=>p.itemId))];if(itemIds.length<minItems)return null;
    return global.CommerceOSExperiments.createExperiment(action,{itemIds,label:`Auto: ${action} optimization`}).experiment;
  }
  global.CommerceOSExperimentApproval={install,linkProposal,canApprove,noteIntervention,actionForProposal,autoCreateForPending};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})(window);
