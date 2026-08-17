/* Commerce OS — Experiment / Control Framework
 * Measures intervention lift without assuming causality from every post-change sale.
 */
(function(global){
  'use strict';
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const days=(a,b)=>{const x=new Date(a),y=new Date(b);return Number.isNaN(x)||Number.isNaN(y)?null:Math.max(0,(y-x)/86400000)};
  const key=v=>String(v||'').trim().toLowerCase();
  function ensure(){global.state.experiments=global.state.experiments||[];global.state.experimentAssignments=global.state.experimentAssignments||[];global.state.experimentOutcomes=global.state.experimentOutcomes||[]}
  function stratKey(item){return [key(item.category),key(item.brand),Math.round(num(item.ask)/25)*25,Math.min(4,Math.floor(num(item.daysListed)/180))].join('|')}
  function eligibleItems(){return (global.state.inventory||[]).filter(x=>key(x.status)!=='sold')}
  function createExperiment(action,options={}){
    ensure();const id=`EXP-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const items=eligibleItems().filter(x=>!options.itemIds||options.itemIds.includes(x.id));
    const by={};items.forEach(x=>(by[stratKey(x)] ||= []).push(x));
    const assignments=[];
    Object.values(by).forEach(group=>{
      const sorted=group.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
      sorted.forEach((item,i)=>assignments.push({experimentId:id,itemId:item.id,arm:i%2===0?'treatment':'control',stratum:stratKey(item),assignedAt:new Date().toISOString()}));
    });
    const exp={id,action,label:options.label||action,createdAt:new Date().toISOString(),status:'active',minDays:options.minDays||14,maxDays:options.maxDays||60};
    global.state.experiments.push(exp);global.state.experimentAssignments.push(...assignments);if(typeof global.persist==='function')global.persist();return {experiment:exp,assignments};
  }
  function markIntervention(experimentId,itemId,details={}){
    ensure();const a=global.state.experimentAssignments.find(x=>x.experimentId===experimentId&&String(x.itemId)===String(itemId));if(!a||a.arm!=='treatment')return false;
    a.interventionAt=new Date().toISOString();a.intervention=details;if(typeof global.persist==='function')global.persist();return true;
  }
  function deriveOutcomes(experimentId){
    ensure();const exp=global.state.experiments.find(x=>x.id===experimentId);if(!exp)return [];
    const ass=global.state.experimentAssignments.filter(x=>x.experimentId===experimentId),items=global.state.inventory||[];
    return ass.map(a=>{
      const item=items.find(x=>String(x.id)===String(a.itemId));if(!item)return null;
      const sold=key(item.status)==='sold'||num(item.priceSold)>0;
      const start=a.interventionAt||a.assignedAt, soldDate=item.soldDate||null;
      const d=sold&&soldDate?days(start,soldDate):null;
      const price=num(item.priceSold),fees=num(item.marketplaceFees),shipping=num(item.shippingExpenses),cost=num(item.itemCost),margin=sold?price-fees-shipping-cost:0;
      return {experimentId,itemId:item.id,arm:a.arm,sold,daysToSale:d,price,margin,ask:num(item.ask),stratum:a.stratum};
    }).filter(Boolean);
  }
  function mean(arr){return arr.length?arr.reduce((s,x)=>s+x,0)/arr.length:0}
  function summarize(experimentId){
    const rows=deriveOutcomes(experimentId),t=rows.filter(x=>x.arm==='treatment'),c=rows.filter(x=>x.arm==='control');
    const metric=group=>({n:group.length,sold:group.filter(x=>x.sold).length,sellThrough:group.length?group.filter(x=>x.sold).length/group.length:0,avgDays:mean(group.filter(x=>x.daysToSale!=null).map(x=>x.daysToSale)),avgPrice:mean(group.filter(x=>x.sold).map(x=>x.price)),avgMargin:mean(group.filter(x=>x.sold).map(x=>x.margin))});
    const tm=metric(t),cm=metric(c);
    return {experimentId,treatment:tm,control:cm,lift:{sellThrough:tm.sellThrough-cm.sellThrough,daysToSale:cm.avgDays-tm.avgDays,price:tm.avgPrice-cm.avgPrice,margin:tm.avgMargin-cm.avgMargin},rows};
  }
  function closeExperiment(id){ensure();const e=global.state.experiments.find(x=>x.id===id);if(!e)return false;e.status='closed';e.closedAt=new Date().toISOString();e.result=summarize(id);if(typeof global.persist==='function')global.persist();return e.result}
  function list(){ensure();return global.state.experiments.map(e=>({...e,summary:summarize(e.id)}))}
  global.CommerceOSExperiments={createExperiment,markIntervention,deriveOutcomes,summarize,closeExperiment,list,stratKey};
})(window);
