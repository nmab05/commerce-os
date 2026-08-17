/* Commerce OS — Sell-through calibration from observed history */
(function(global){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const norm=s=>String(s||'').trim().toLowerCase();
  const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
  function soldRows(items){return (items||[]).filter(x=>norm(x.status)==='sold'&&Number(x.priceSold||0)>0)}
  function saleDays(x){
    if(x.listedDate&&x.soldDate){const a=new Date(x.listedDate),b=new Date(x.soldDate);if(!isNaN(a)&&!isNaN(b))return Math.max(1,Math.round((b-a)/86400000))}
    return Number(x.daysListed||0)||0;
  }
  function groupStats(rows,keyFn){
    const g={};rows.forEach(x=>{const k=norm(keyFn(x))||'unknown';(g[k]=g[k]||[]).push(x)});
    const out={};Object.entries(g).forEach(([k,a])=>{const days=a.map(saleDays).filter(Boolean),discounts=a.map(x=>Number(x.ask)>0?Number(x.priceSold)/Number(x.ask):0).filter(Boolean);out[k]={n:a.length,medianDays:median(days),medianSaleToAsk:median(discounts),platforms:[...new Set(a.map(x=>x.soldPlatform).filter(Boolean))]}});return out;
  }
  function train(items){
    const sold=soldRows(items),all=(items||[]).filter(x=>['active','sold'].includes(norm(x.status)));
    const model={version:'1.0.0',trainedAt:new Date().toISOString(),soldCount:sold.length,eligibleCount:all.length,confidence:sold.length>=75?'high':sold.length>=25?'medium':'low',overall:{medianDays:median(sold.map(saleDays).filter(Boolean)),medianSaleToAsk:median(sold.map(x=>Number(x.ask)>0?Number(x.priceSold)/Number(x.ask):0).filter(Boolean))},category:groupStats(sold,x=>x.category),brand:groupStats(sold,x=>x.brand),platform:groupStats(sold,x=>x.soldPlatform)};
    return model;
  }
  function empiricalProbability(item,model,horizonDays=90){
    if(!model||model.soldCount<8)return null;
    const c=model.category[norm(item.category)],b=model.brand[norm(item.brand)];
    const candidates=[c&&c.n>=3?c:null,b&&b.n>=3?b:null,model.overall].filter(Boolean);
    let md=0,w=0;
    candidates.forEach((s,i)=>{const weight=i===0?3:i===1?2:1;if(s.medianDays){md+=s.medianDays*weight;w+=weight}});
    md=w?md/w:(model.overall.medianDays||180);
    const age=Number(item.daysListed||0),market=(global.state?.compResearch?.[item.id])||{},rec=Number(market.recommended||market.recommendedPrice||0),ask=Number(item.ask||0);
    let p=1-Math.exp(-horizonDays/Math.max(20,md));
    if(age>md*2)p*=0.72;else if(age<md*.5)p*=1.08;
    if(rec&&ask){const ratio=ask/rec;if(ratio>1.25)p*=0.65;else if(ratio>1.1)p*=0.82;else if(ratio<.85)p*=1.08}
    const coverage=(item.marketplaces||[]).length;if(coverage>=3)p*=1.08;else if(coverage<=1)p*=0.9;
    return clamp(p,.03,.92);
  }
  function blend(item,heuristic,model){const e=empiricalProbability(item,model);if(e==null)return {probability:heuristic,source:'heuristic',empirical:null};const weight=model.confidence==='high'?.75:model.confidence==='medium'?.55:.35;return {probability:clamp(e*weight+heuristic*(1-weight),.03,.92),source:`blended-${model.confidence}`,empirical:e}}
  global.CommerceOSSellthroughCalibration={train,empiricalProbability,blend,soldRows};
})(typeof window!=='undefined'?window:globalThis);