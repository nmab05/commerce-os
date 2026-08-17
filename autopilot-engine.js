/* Commerce OS — Autopilot Recommendation Engine
 * Consolidates listing quality, stale decisions, portfolio economics, calibration,
 * performance learning and experiment-informed policy into one daily queue.
 * Approval-first: no marketplace writes.
 */
(function(global){
  'use strict';
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const sold=x=>String(x.status||'').toLowerCase()==='sold';
  function evidenceFor(item){
    const stale=global.CommerceOSDecisionPolicy?.choose
      ? global.CommerceOSDecisionPolicy.choose(item,global.state)
      : global.CommerceOSStaleInventory?.decide(item,global.state);
    const econ=global.CommerceOSPortfolioEconomics?.scoreItem(item);
    const research=(global.state.compResearch&&global.state.compResearch[item.id])||{};
    const photo=(global.state.photoResearch&&global.state.photoResearch[item.id])||{};
    const listing=global.CommerceOSListingOptimizer?.optimize(item,research);
    return {stale,econ,research,photo,listing};
  }
  function actionField(action,item,e){
    const stale=e.stale||{};
    if(global.CommerceOSStaleInventory&&stale.action)return global.CommerceOSStaleInventory.proposalFor(stale,item);
    return {field:'Action',current:'Keep live',proposed:action};
  }
  function scoreItem(item){
    const e=evidenceFor(item),stale=e.stale||{},econ=e.econ||{};
    const action=stale.action||'hold';
    const listingScore=e.listing?.scores?.overall??50;
    const urgency=num(stale.score);
    const economic=num(econ.priorityScore);
    const expectedCash=num(econ.expectedCash);
    const probability=num(econ.probability);
    const evidenceConfidence=(e.research.confidence||'Low');
    const effect=stale.effectEvidence||null;
    let impact=Math.round(urgency*.38+economic*.42+(100-listingScore)*.20);
    if(effect&&effect.confidence==='high')impact+=8;
    else if(effect&&effect.confidence==='medium')impact+=4;
    if(action==='hold')impact=Math.min(impact,20);
    impact=Math.max(0,Math.min(100,impact));
    const reasons=[];
    if(stale.reasons?.length)reasons.push(...stale.reasons);
    if(expectedCash)reasons.push(`expected cash $${expectedCash.toFixed(2)}`);
    if(probability)reasons.push(`${Math.round(probability*100)}% sale probability`);
    if(effect)reasons.push(`experiment effect ${effect.score>=0?'+':''}${effect.score.toFixed(2)} (${effect.confidence})`);
    const p=actionField(action,item,e);
    return {itemId:item.id,title:item.title,action,impactScore:impact,priority:impact>=70?'high':impact>=40?'medium':'low',field:p.field,current:p.current,proposed:p.proposed,reasons,evidenceConfidence,expectedCash,probability,marketValue:num(econ.marketValue),expectedGrossMargin:num(econ.expectedGrossMargin),priorityScore:economic,listingScore,staleScore:urgency,economicScore:economic,probabilitySource:econ.probabilitySource||'heuristic',effectEvidence:effect,baseAction:stale.baseAction||action};
  }
  function rank(){return (global.state.inventory||[]).filter(x=>!sold(x)).map(scoreItem).sort((a,b)=>b.impactScore-a.impactScore||b.expectedCash-a.expectedCash)}
  function queue(limit=25){
    const ranked=rank();
    const rows=ranked.filter(r=>r.action!=='hold').slice(0,Math.max(1,limit));let queued=0;
    global.state.optimizationQueue=global.state.optimizationQueue||[];
    rows.forEach(r=>{
      const item=(global.state.inventory||[]).find(x=>String(x.id)===String(r.itemId));if(!item)return;
      const type=`autopilot-${r.action}`;
      const duplicate=global.state.optimizationQueue.some(q=>String(q.itemId)===String(item.id)&&q.type===type&&q.status!=='rejected');
      if(duplicate)return;
      if(typeof global.proposal==='function'){
        global.state.optimizationQueue.unshift(global.proposal(item,type,r.priority,r.field,r.current,r.proposed,`Autopilot recommendation: ${r.reasons.join('; ')}`));
        queued++;
      }
    });
    global.state.autopilotRuns=global.state.autopilotRuns||[];
    global.state.autopilotRuns.unshift({ranAt:new Date().toISOString(),itemsScored:ranked.length,queued,topImpact:rows[0]?.impactScore||0});
    if(global.CommerceOSPerformanceLearning?.captureForecast){
      rows.forEach(r=>{try{global.CommerceOSPerformanceLearning.captureForecast(r)}catch(e){}});
    }
    if(typeof global.persist==='function')global.persist();
    if(typeof global.renderOptimizationQueue==='function')global.renderOptimizationQueue();
    return {rows,queued};
  }
  global.CommerceOSAutopilot={evidenceFor,scoreItem,rank,queue};
})(window);
