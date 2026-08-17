/* Commerce OS — Autopilot Vendoo dataset adapter
 * Overrides ranking/queue source selection without changing the validated core engine.
 */
(function(global){
  'use strict';
  const base=global.CommerceOSAutopilot;if(!base)return;
  function appState(){try{if(typeof state!=='undefined'&&state)return state}catch(e){}return global.state||{}}
  function inventory(){const v=global.CommerceOSVendooAutopilotBridge?.items?.()||[];if(v.length)return v;return base.appInventory?base.appInventory():((appState().inventory)||[])}
  const sold=x=>String(x.status||'').toLowerCase()==='sold';
  function rank(){return inventory().filter(x=>!sold(x)).map(base.scoreItem).sort((a,b)=>b.impactScore-a.impactScore||b.expectedCash-a.expectedCash)}
  function queue(limit=25){
    const s=appState(),items=inventory(),ranked=rank(),rows=ranked.filter(r=>r.action!=='hold').slice(0,Math.max(1,limit));let queued=0;
    s.optimizationQueue=s.optimizationQueue||[];
    rows.forEach(r=>{const item=items.find(x=>String(x.id)===String(r.itemId));if(!item)return;const type=`autopilot-${r.action}`;const duplicate=s.optimizationQueue.some(q=>String(q.itemId)===String(item.id)&&q.type===type&&q.status!=='rejected');if(duplicate)return;if(typeof global.proposal==='function'){s.optimizationQueue.unshift(global.proposal(item,type,r.priority,r.field,r.current,r.proposed,`Autopilot recommendation: ${r.reasons.join('; ')}`));queued++}});
    s.autopilotRuns=s.autopilotRuns||[];s.autopilotRuns.unshift({ranAt:new Date().toISOString(),itemsScored:ranked.length,queued,topImpact:rows[0]?.impactScore||0,source:global.CommerceOSVendooAutopilotBridge?.items?.().length?'vendoo':'inventory'});
    if(global.CommerceOSPerformanceLearning?.captureForecast)rows.forEach(r=>{try{global.CommerceOSPerformanceLearning.captureForecast(r)}catch(e){}});
    if(typeof global.persist==='function')global.persist();if(typeof global.renderOptimizationQueue==='function')global.renderOptimizationQueue();return {rows,queued};
  }
  global.CommerceOSAutopilot={...base,appInventory:inventory,rank,queue};
})(window);
