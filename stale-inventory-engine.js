/* Commerce OS — Stale Inventory Decision Engine
 * Recommends next actions without performing marketplace writes.
 */
(function(global){
  'use strict';
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  function marketplaceCount(item){return uniq(item.marketplaces||[]).length}
  function research(item,state){return state.compResearch?.[item.id]||state.marketResearch?.[item.id]||{}}
  function listingQuality(item,state){
    if(global.CommerceOSListingOptimizer){
      try{return global.CommerceOSListingOptimizer.optimize(item,research(item,state)).scores.overall}catch(e){}
    }
    let s=100;if(!item.description||String(item.description).length<80)s-=30;if(!item.title||String(item.title).length<45)s-=20;if((item.photos||[]).length<4)s-=20;return Math.max(0,s);
  }
  function pricingGap(item,state){
    const r=research(item,state),rec=num(r.recommendedPrice??r.recommended??0),ask=num(item.ask||0);
    if(!rec||!ask)return {known:false,gapPct:0,recommended:rec,ask};
    return {known:true,gapPct:(ask-rec)/rec*100,recommended:rec,ask};
  }
  function decide(item,state){
    const age=num(item.daysListed||0),markets=marketplaceCount(item),q=listingQuality(item,state),gap=pricingGap(item,state),photo=state.photoResearch?.[item.id];
    const reasons=[];let action='hold',priority='low',score=0;
    if(age>=730){score+=40;reasons.push(`${age} days listed`)}else if(age>=365){score+=30;reasons.push(`${age} days listed`)}else if(age>=180){score+=18;reasons.push(`${age} days listed`)}
    if(markets<2){score+=14;reasons.push('limited marketplace coverage')}
    if(q<60){score+=22;reasons.push(`listing quality ${q}/100`)}else if(q<75){score+=10;reasons.push(`listing quality ${q}/100`)}
    if(photo&&num(photo.overall)<65){score+=10;reasons.push(`photo score ${num(photo.overall)}/100`)}
    if(gap.known&&gap.gapPct>20){score+=22;reasons.push(`asking price ${Math.round(gap.gapPct)}% above research value`)}
    if(age<90&&q>=75&&(!gap.known||Math.abs(gap.gapPct)<=10)&&markets>=2){action='hold';score=Math.min(score,20);reasons.push('young listing with adequate coverage')}
    else if(age>=730&&(!gap.known||q<65)){action='liquidate';priority='high'}
    else if(gap.known&&gap.gapPct>20){action='reprice';priority=age>=365?'high':'medium'}
    else if(age>=365&&q>=70){action='relist';priority='high'}
    else if(markets<2&&age>=90){action='cross-list';priority=age>=365?'high':'medium'}
    else if(q<70){action='optimize';priority=age>=365?'high':'medium'}
    else if(age>=180){action='relist';priority='medium'}
    if(score>=65)priority='high';else if(score>=35&&priority==='low')priority='medium';
    return {itemId:item.id,title:item.title,action,priority,score:Math.min(100,score),ageDays:age,marketplaces:markets,listingQuality:q,pricingGap:gap,reasons};
  }
  function rank(items,state){return (items||[]).filter(x=>String(x.status||'').toLowerCase()!=='sold').map(x=>decide(x,state)).sort((a,b)=>b.score-a.score)}
  function proposalFor(decision,item){
    const map={
      'optimize':['Action','Keep live','Optimize title, description and photos'],
      'reprice':['Price',String(item.ask||''),decision.pricingGap.recommended?String(decision.pricingGap.recommended):'Research-supported lower price'],
      'relist':['Action','Keep live','Refresh / relist listing'],
      'cross-list':['Action',(item.marketplaces||[]).join(', ')||'Single marketplace','Add approved marketplace coverage'],
      'liquidate':['Action','Keep live','Move to liquidation / bundle / markdown review'],
      'hold':['Action','Keep live','No change']
    };
    const [field,current,proposed]=map[decision.action]||map.hold;
    return {field,current,proposed};
  }
  global.CommerceOSStaleInventory={decide,rank,proposalFor,listingQuality,pricingGap};
})(typeof window!=='undefined'?window:globalThis);
