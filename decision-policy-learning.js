/* Commerce OS — Experiment-informed Decision Policy
 * Re-ranks plausible interventions using measured action effects.
 */
(function(global){
  'use strict';
  const ACTIONS=['optimize','reprice','relist','cross-list','photos'];
  const mapAction=a=>a==='cross-list'?'crosslist':a==='optimize'?'title':a;
  function candidates(item,state){
    const base=global.CommerceOSStaleInventory.decide(item,state),set=new Set([base.action]);
    const q=base.listingQuality,g=base.pricingGap,age=base.ageDays,m=base.marketplaces,photo=state.photoResearch?.[item.id];
    if(q<80)set.add('optimize');if(g.known&&Math.abs(g.gapPct)>=10)set.add('reprice');if(age>=180)set.add('relist');if(m<3)set.add('cross-list');if(photo&&Number(photo.overall)<80)set.add('photos');
    return [...set].filter(a=>a!=='hold'&&a!=='liquidate');
  }
  function choose(item,state){
    const base=global.CommerceOSStaleInventory.decide(item,state);
    if(base.action==='hold'||base.action==='liquidate'||!global.CommerceOSActionEffects)return {...base,effectEvidence:null,baseAction:base.action};
    const ranked=candidates(item,state).map(action=>{const e=global.CommerceOSActionEffects.estimate(item,mapAction(action));const baseBonus=action===base.action?.12:0;return {action,evidence:e,utility:e.score+baseBonus}}).sort((a,b)=>b.utility-a.utility);
    const best=ranked[0];
    if(!best||best.evidence.confidence==='none')return {...base,effectEvidence:null,baseAction:base.action};
    const chosen=best.utility>=0?best.action:base.action;
    const reasons=[...base.reasons];
    if(chosen!==base.action)reasons.push(`experiment evidence favors ${chosen} over ${base.action}`);
    reasons.push(`${best.evidence.confidence} action-effect confidence from ${best.evidence.sample} comparable experiment observations`);
    return {...base,action:chosen,baseAction:base.action,effectEvidence:best.evidence,actionCandidates:ranked,reasons};
  }
  function rank(items,state){return (items||[]).filter(x=>String(x.status||'').toLowerCase()!=='sold').map(x=>choose(x,state)).sort((a,b)=>b.score-a.score)}
  global.CommerceOSDecisionPolicy={choose,rank,candidates};
})(window);