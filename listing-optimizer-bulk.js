/* Commerce OS — Bulk Listing Optimization
 * Scores active inventory and prepares approval-first optimization batches.
 */
(function(global){
  'use strict';
  function ready(){return global.CommerceOSListingOptimizer&&global.state}
  function researchFor(item){return global.state?.compResearch?.[item.id]||{}}
  function scoreInventory(items){
    if(!ready())return [];
    return (items||[]).filter(x=>String(x.status||'').toLowerCase()!=='sold').map(item=>{
      const pkg=global.CommerceOSListingOptimizer.optimize(item,researchFor(item));
      const age=Number(item.daysListed||0),price=Number(item.ask||0);
      let urgency=(100-pkg.scores.overall)*0.55+Math.min(25,age/30)+Math.min(20,price/25);
      if(!pkg.price.eligible&&price>=75)urgency+=10;
      urgency=Math.round(Math.max(0,Math.min(100,urgency)));
      return {itemId:item.id,title:item.title,marketplaces:item.marketplaces||[],daysListed:age,ask:price,optimizationScore:pkg.scores.overall,urgency,package:pkg,recommendationCount:pkg.recommendations.length};
    }).sort((a,b)=>b.urgency-a.urgency||a.optimizationScore-b.optimizationScore);
  }
  function addBatchProposals(rows,limit=25){
    if(!ready()||typeof global.proposal!=='function')return {items:0,proposals:0};
    global.state.optimizationQueue=global.state.optimizationQueue||[];
    let items=0,proposals=0;
    (rows||[]).slice(0,limit).forEach(row=>{
      const item=(global.state.inventory||[]).find(x=>String(x.id)===String(row.itemId));if(!item)return;
      let itemAdded=0;
      row.package.recommendations.forEach(r=>{
        if(r.type==='research')return;
        const duplicate=global.state.optimizationQueue.some(q=>q.itemId===item.id&&q.type===r.type&&q.status!=='rejected'&&String(q.proposed)===String(r.proposed));
        if(duplicate)return;
        global.state.optimizationQueue.unshift(global.proposal(item,r.type,r.priority,r.field,r.current,r.proposed,`Bulk listing intelligence: ${r.reason}`));
        proposals++;itemAdded++;
      });
      if(itemAdded)items++;
    });
    global.state.bulkOptimization={lastRunAt:new Date().toISOString(),scored:(rows||[]).length,itemsQueued:items,proposalsQueued:proposals};
    if(typeof global.persist==='function')global.persist();
    if(typeof global.renderOptimizationQueue==='function')global.renderOptimizationQueue();
    return {items,proposals};
  }
  function run(limit=25){
    const rows=scoreInventory(global.state?.inventory||[]);
    global.state.bulkOptimization=global.state.bulkOptimization||{};
    global.state.bulkOptimization.rankings=rows.map(r=>({itemId:r.itemId,title:r.title,urgency:r.urgency,optimizationScore:r.optimizationScore,recommendationCount:r.recommendationCount}));
    const result=addBatchProposals(rows,limit);
    if(typeof global.toastMsg==='function')global.toastMsg(`${result.proposals} bulk optimization proposal(s) queued across ${result.items} item(s).`);
    return {rows,...result};
  }
  global.CommerceOSBulkListingOptimizer={scoreInventory,addBatchProposals,run};
})(window);
