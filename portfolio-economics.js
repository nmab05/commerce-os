/* Commerce OS — Portfolio Economics
 * Ranks active inventory by expected cash recovery and opportunity cost.
 * Uses empirical sold-history calibration and bounded performance learning when available.
 * No automatic marketplace writes.
 */
(function(global){
  'use strict';
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function researchFor(item){return (global.state?.compResearch&&global.state.compResearch[item.id])||{}}
  function photoFor(item){return (global.state?.photoResearch&&global.state.photoResearch[item.id])||{}}
  function listingPkg(item){if(!global.CommerceOSListingOptimizer)return null;return global.CommerceOSListingOptimizer.optimize(item,researchFor(item))}
  function marketValue(item,research){return num(research.recommended??research.recommendedPrice??research.med??item.ask)}
  function heuristicSaleProbability(item,research,pkg){
    const age=num(item.daysListed);let p=.48;
    const conf=String(research.confidence||'').toLowerCase();
    if(conf==='high')p+=.13;else if(conf==='medium')p+=.07;
    if(pkg)p+=(pkg.scores.overall-50)/250;
    if((item.marketplaces||[]).length>=2)p+=.07;if((item.marketplaces||[]).length>=3)p+=.04;
    if(age>180)p-=.07;if(age>365)p-=.08;if(age>730)p-=.08;
    const mv=marketValue(item,research),ask=num(item.ask);
    if(mv&&ask>mv*1.2)p-=.12;else if(mv&&ask<=mv*1.05)p+=.05;
    return clamp(p,.08,.9);
  }
  function calibrationModel(){
    if(!global.CommerceOSSellthroughCalibration)return null;
    const current=global.state?.sellthroughCalibration;
    const soldCount=global.CommerceOSSellthroughCalibration.soldRows(global.state?.inventory||[]).length;
    if(!current||current.soldCount!==soldCount){global.state.sellthroughCalibration=global.CommerceOSSellthroughCalibration.train(global.state?.inventory||[]);if(typeof global.persist==='function')global.persist()}
    return global.state.sellthroughCalibration;
  }
  function saleProbabilityDetail(item,research,pkg){
    const heuristic=heuristicSaleProbability(item,research,pkg),model=calibrationModel();let detail;
    if(global.CommerceOSSellthroughCalibration&&model){const b=global.CommerceOSSellthroughCalibration.blend(item,heuristic,model);detail={...b,heuristic,modelConfidence:model.confidence,soldSample:model.soldCount}}
    else detail={probability:heuristic,source:'heuristic',empirical:null,heuristic,modelConfidence:'none',soldSample:0};
    if(global.CommerceOSPerformanceLearning){const tuned=global.CommerceOSPerformanceLearning.applyProbability(detail.probability);detail={...detail,untunedProbability:detail.probability,probability:tuned,source:detail.source+'+feedback'}}
    return detail;
  }
  function saleProbability(item,research,pkg){return saleProbabilityDetail(item,research,pkg).probability}
  function scoreItem(item){
    const research=researchFor(item),pkg=listingPkg(item),photo=photoFor(item);
    const mv=marketValue(item,research),ask=num(item.ask),cost=num(item.itemCost),age=num(item.daysListed);
    const probabilityDetail=saleProbabilityDetail(item,research,pkg),probability=probabilityDetail.probability;
    const expectedCash=mv*probability,expectedGrossMargin=Math.max(0,mv-cost)*probability;
    const trappedCapital=cost>0?cost:Math.min(ask*.2,25),agePenalty=clamp(age/730,0,1);
    const listingDeficit=pkg?(100-pkg.scores.overall)/100:.5,photoDeficit=photo.overall?Math.max(0,100-num(photo.overall))/100:.25,coverageDeficit=(item.marketplaces||[]).length<=1?.6:(item.marketplaces||[]).length===2?.25:0;
    const opportunity=trappedCapital*(.5+agePenalty)+mv*(listingDeficit*.18+photoDeficit*.08+coverageDeficit*.08);
    const priorityScore=global.CommerceOSPerformanceLearning?global.CommerceOSPerformanceLearning.applyPriority({expectedCash,expectedGrossMargin,opportunity}):clamp(Math.round(expectedCash*.55+expectedGrossMargin*.25+opportunity*.35),0,100);
    const row={itemId:item.id,title:item.title,ask,cost,marketValue:mv,probability,probabilitySource:probabilityDetail.source,empiricalProbability:probabilityDetail.empirical,heuristicProbability:probabilityDetail.heuristic,calibrationConfidence:probabilityDetail.modelConfidence,soldSample:probabilityDetail.soldSample,expectedCash,expectedGrossMargin,trappedCapital,ageDays:age,priorityScore,listingScore:pkg?.scores.overall??null,marketplaces:(item.marketplaces||[]).length};
    return row;
  }
  function rank(){const rows=(global.state?.inventory||[]).filter(x=>String(x.status).toLowerCase()!=='sold').map(scoreItem).sort((a,b)=>b.priorityScore-a.priorityScore||b.expectedCash-a.expectedCash);if(global.CommerceOSPerformanceLearning)rows.slice(0,100).forEach(global.CommerceOSPerformanceLearning.captureForecast);return rows}
  function queueTop(limit=25){
    const rows=rank().slice(0,Math.max(1,limit));let queued=0;global.state.optimizationQueue=global.state.optimizationQueue||[];
    rows.forEach(r=>{const item=(global.state.inventory||[]).find(x=>x.id===r.itemId);if(!item)return;const action=`Prioritize for cash recovery — expected cash $${r.expectedCash.toFixed(2)} at ${(r.probability*100).toFixed(0)}% sale probability`;const duplicate=global.state.optimizationQueue.some(q=>q.itemId===item.id&&q.type==='portfolio-priority'&&q.status!=='rejected');if(duplicate)return;if(typeof global.proposal==='function')global.state.optimizationQueue.unshift(global.proposal(item,'portfolio-priority',r.priorityScore>=70?'high':'medium','Action','Routine queue',action,`Portfolio economics score ${r.priorityScore}/100; market value $${r.marketValue.toFixed(2)}; expected gross margin $${r.expectedGrossMargin.toFixed(2)}; ${r.ageDays} days listed; probability source ${r.probabilitySource} using ${r.soldSample} sold record(s).`));queued++});
    if(typeof global.persist==='function')global.persist();if(typeof global.renderOptimizationQueue==='function')global.renderOptimizationQueue();return {rows,queued};
  }
  global.CommerceOSPortfolioEconomics={scoreItem,rank,queueTop,saleProbability,saleProbabilityDetail,heuristicSaleProbability,calibrationModel};
})(window);