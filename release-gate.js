/* Commerce OS release gate — dependency-free Node smoke/regression suite */
const fs=require('fs'),vm=require('vm');
global.window=global;global.document={getElementById:()=>({})};
global.persist=()=>{};global.renderOptimizationQueue=()=>{};
global.proposal=(item,type,priority,field,current,proposed,reason)=>({itemId:item.id,type,priority,field,current,proposed,reason,status:'pending'});
global.state={inventory:[],optimizationQueue:[],compResearch:{},marketResearch:{},photoResearch:{},experiments:[],experimentAssignments:[],experimentOutcomes:[],experimentProposalLinks:[],autopilotRuns:[]};
const load=f=>vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
['state-compatibility.js','listing-optimizer.js','stale-inventory-engine.js','sellthrough-calibration.js','performance-learning.js','portfolio-economics.js','action-effect-learning.js','decision-policy-learning.js','autopilot-engine.js'].forEach(load);
CommerceOSStateCompatibility.migrate();
const tests=[];const check=(name,condition)=>tests.push({name,pass:!!condition});
check('schema migrated',state.schemaVersion>=6);
check('learning store initialized',Array.isArray(state.performanceLearning.forecasts)&&Array.isArray(state.performanceLearning.outcomes));
state.inventory=[
 {id:'A',title:'Coach Brown Leather Shoulder Bag',brand:'Coach',category:'Bags',status:'Active',daysListed:420,ask:90,itemCost:15,marketplaces:['eBay'],description:'short',photos:[]},
 {id:'B',title:'Fresh Home Item With Complete Searchable Listing Title',brand:'Generic',category:'Home',status:'Active',daysListed:25,ask:30,itemCost:5,marketplaces:['eBay','Mercari'],description:'A sufficiently complete buyer-facing description for a relatively fresh listing that should not need aggressive intervention.',photos:[1,2,3,4,5,6]},
 {id:'S',title:'Sold Item',brand:'Generic',category:'Home',status:'Sold',daysListed:50,ask:25,priceSold:22,itemCost:4,marketplaces:['eBay']}
];
state.compResearch.A={recommendedPrice:65,confidence:'High',comps:[{type:'sold',price:62},{type:'sold',price:68},{type:'sold',price:66}]};
const ranked=CommerceOSAutopilot.rank();
check('sold excluded',!ranked.some(r=>r.itemId==='S'));
check('one row per active item',ranked.length===2&&new Set(ranked.map(r=>r.itemId)).size===2);
check('ranking is descending',ranked.every((r,i,a)=>i===0||a[i-1].impactScore>=r.impactScore));
const beforeForecasts=state.performanceLearning.forecasts.length;
const first=CommerceOSAutopilot.queue(25);
check('approval-only proposals',state.optimizationQueue.length===first.queued&&state.optimizationQueue.every(q=>q.status==='pending'));
check('autopilot run logged',state.autopilotRuns.length===1);
check('forecasts captured',state.performanceLearning.forecasts.length===beforeForecasts+first.rows.length);
const beforeQueue=state.optimizationQueue.length;CommerceOSAutopilot.queue(25);
check('duplicate queue protection',state.optimizationQueue.length===beforeQueue);
const title=CommerceOSListingOptimizer.buildTitle(state.inventory[0]);
check('title limit enforced',title.length<=80);
const weak=CommerceOSListingOptimizer.priceRecommendation(state.inventory[1],{});
check('no unsupported price recommendation',weak.eligible===false);
check('no direct marketplace writer',typeof global.writeMarketplaceListing!=='function'&&typeof global.autoPublishListing!=='function');
const failed=tests.filter(t=>!t.pass);tests.forEach(t=>console.log(`${t.pass?'PASS':'FAIL'} ${t.name}`));
console.log(`\n${tests.length-failed.length}/${tests.length} checks passed`);if(failed.length)process.exit(1);
