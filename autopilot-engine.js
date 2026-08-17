/* Commerce OS — Autopilot Recommendation Engine
 * Consolidates listing quality, stale decisions, portfolio economics, calibration,
 * performance learning and experiment-informed policy into one daily queue.
 * Approval-first: no marketplace writes.
 */
(function(global){
  'use strict';
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const sold=x=>String(x.status||'').toLowerCase()==='sold';

  // The legacy prototype declares `let state` at top-level. In browsers that binding is
  // visible to later classic scripts but is not a window property. New modules therefore
  // must resolve the lexical binding rather than assuming window.state exists.
  function appState(){
    try{if(typeof state!=='undefined'&&state)return state}catch(e){}
    return global.state||{};
  }
  function appInventory(){const s=appState();return Array.isArray(s.inventory)?s.inventory:[]}

  function evidenceFor(item){
    const s=appState();
    const stale=global.CommerceOSDecisionPolicy?.choose
      ? global.CommerceOSDecisionPolicy.choose(item,s)
      : global.CommerceOSStaleInventory?.decide(item,s);
    const econ=global.CommerceOSPortfolioEconomics?.scoreItem(item);
    const research=(s.compResearch&&s.compResearch[item.id])||{};
    const photo=(s.photoResearch&&s.photoResearch[item.id])||{};
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
  function rank(){return appInventory().filter(x=>!sold(x)).map(scoreItem).sort((a,b)=>b.impactScore-a.impactScore||b.expectedCash-a.expectedCash)}
  function queue(limit=25){
    const s=appState(),inventory=appInventory();
    const ranked=rank();
    const rows=ranked.filter(r=>r.action!=='hold').slice(0,Math.max(1,limit));let queued=0;
    s.optimizationQueue=s.optimizationQueue||[];
    rows.forEach(r=>{
      const item=inventory.find(x=>String(x.id)===String(r.itemId));if(!item)return;
      const type=`autopilot-${r.action}`;
      const duplicate=s.optimizationQueue.some(q=>String(q.itemId)===String(item.id)&&q.type===type&&q.status!=='rejected');
      if(duplicate)return;
      if(typeof global.proposal==='function'){
        s.optimizationQueue.unshift(global.proposal(item,type,r.priority,r.field,r.current,r.proposed,`Autopilot recommendation: ${r.reasons.join('; ')}`));
        queued++;
      }
    });
    s.autopilotRuns=s.autopilotRuns||[];
    s.autopilotRuns.unshift({ranAt:new Date().toISOString(),itemsScored:ranked.length,queued,topImpact:rows[0]?.impactScore||0});
    if(global.CommerceOSPerformanceLearning?.captureForecast){
      rows.forEach(r=>{try{global.CommerceOSPerformanceLearning.captureForecast(r)}catch(e){}});
    }
    if(typeof global.persist==='function')global.persist();
    if(typeof global.renderOptimizationQueue==='function')global.renderOptimizationQueue();
    return {rows,queued};
  }
  global.CommerceOSAutopilot={appState,appInventory,evidenceFor,scoreItem,rank,queue};
})(window);
