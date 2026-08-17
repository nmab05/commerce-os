/* Commerce OS — Listing Optimization Intelligence
 * Pure browser-side helpers. No marketplace writes.
 * Produces approval-first recommendations from item data + saved market research.
 */
(function(global){
  'use strict';

  const STOP=new Set(['the','a','an','and','or','for','with','of','to','in','on','by','from','this','that','new','used']);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const words=v=>clean(v).split(/\s+/).filter(Boolean);
  const uniq=arr=>{const seen=new Set();return arr.filter(v=>{const k=v.toLowerCase();if(!v||seen.has(k))return false;seen.add(k);return true})};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const money=n=>Number.isFinite(Number(n))?Number(n).toFixed(2):'';

  function meaningfulTokens(item){
    const raw=[item.brand,item.category,item.condition,item.primaryColor,item.secondaryColor,item.tags,item.title]
      .filter(Boolean).join(' ')
      .replace(/[^a-zA-Z0-9'&+.-]+/g,' ');
    return uniq(words(raw).filter(w=>w.length>1&&!STOP.has(w.toLowerCase())));
  }

  function buildTitle(item,maxLength=80){
    const brand=clean(item.brand).toLowerCase()==='unknown'?'':clean(item.brand);
    const titleTokens=meaningfulTokens(item);
    const preferred=uniq([
      brand,
      ...titleTokens,
      clean(item.primaryColor),
      clean(item.secondaryColor),
      clean(item.condition)
    ].filter(Boolean));
    let out='';
    for(const token of preferred){
      const candidate=clean([out,token].filter(Boolean).join(' '));
      if(candidate.length<=maxLength)out=candidate;
    }
    return out||clean(item.title).slice(0,maxLength);
  }

  function buildDescription(item,research={}){
    const lines=[];
    const lead=clean(item.title)||buildTitle(item);
    if(lead)lines.push(lead,'');
    const facts=[
      ['Brand',item.brand&&String(item.brand).toLowerCase()!=='unknown'?item.brand:''],
      ['Category',item.category],
      ['Condition',item.condition],
      ['Color',[item.primaryColor,item.secondaryColor].filter(Boolean).join(' / ')],
      ['SKU',item.vendooMeta?.sku||item.id]
    ].filter(([,v])=>clean(v));
    if(facts.length){lines.push('Item details');facts.forEach(([k,v])=>lines.push(`• ${k}: ${clean(v)}`));}
    if(clean(item.notes))lines.push('',`Notes: ${clean(item.notes)}`);
    if(clean(item.tags))lines.push('',`Search terms: ${clean(item.tags)}`);
    if(research.confidence||research.rationale){
      lines.push('','Commerce OS research note');
      if(research.confidence)lines.push(`• Pricing confidence: ${clean(research.confidence)}`);
      if(research.rationale)lines.push(`• ${clean(research.rationale)}`);
    }
    lines.push('','Please review photos and item details carefully for condition and included components.');
    return lines.join('\n');
  }

  function titleScore(item,title){
    const t=clean(title);let score=100;const issues=[];
    if(t.length<45){score-=18;issues.push('Title is short for marketplace search coverage.');}
    if(t.length>80){score-=35;issues.push('Title exceeds the 80-character eBay limit.');}
    if(item.brand&&String(item.brand).toLowerCase()!=='unknown'&&!t.toLowerCase().includes(String(item.brand).toLowerCase())){score-=15;issues.push('Brand is missing from the title.');}
    const categoryWords=words(item.category).filter(w=>w.length>2);
    if(categoryWords.length&&!categoryWords.some(w=>t.toLowerCase().includes(w.toLowerCase()))){score-=10;issues.push('Category/product-type language may be missing.');}
    if(/\b(l@@k|wow|rare!!!|must see|amazing)\b/i.test(t)){score-=8;issues.push('Promotional filler can displace searchable attributes.');}
    if(/[^\w\s'&+./-]{3,}/.test(t)){score-=6;issues.push('Excess punctuation may reduce readability.');}
    return {score:clamp(score,0,100),issues};
  }

  function descriptionScore(item,description){
    const d=clean(description);let score=100;const issues=[];
    if(!d){return {score:0,issues:['Description is blank.']};}
    if(d.length<120){score-=35;issues.push('Description is too thin to answer common buyer questions.');}
    if(clean(item.title)&&d.toLowerCase()===clean(item.title).toLowerCase()){score-=40;issues.push('Description duplicates the title.');}
    if(item.condition&&!d.toLowerCase().includes(String(item.condition).toLowerCase())){score-=12;issues.push('Condition is not clearly stated.');}
    if(item.brand&&String(item.brand).toLowerCase()!=='unknown'&&!d.toLowerCase().includes(String(item.brand).toLowerCase())){score-=8;issues.push('Brand is not stated in the description.');}
    return {score:clamp(score,0,100),issues};
  }

  function researchScore(research={}){
    const comps=Array.isArray(research.comps)?research.comps:Array.isArray(research.rows)?research.rows:[];
    const sold=comps.filter(c=>String(c.type).toLowerCase()==='sold').length;
    const active=comps.filter(c=>String(c.type).toLowerCase()==='active').length;
    const confidence=String(research.confidence||'').toLowerCase();
    let score=Math.min(55,comps.length*11)+Math.min(25,sold*8)+Math.min(10,active*3);
    if(confidence==='high')score+=10;else if(confidence==='medium')score+=5;
    return {score:clamp(score,0,100),comps:comps.length,sold,active,confidence:confidence||'low'};
  }

  function priceRecommendation(item,research={}){
    const current=Number(item.ask||0);
    const recommended=Number(research.recommendedPrice??research.recommended??0);
    if(!recommended)return {eligible:false,current,recommended:0,delta:0,deltaPct:0,reason:'No evidence-based recommended price is saved.'};
    const delta=recommended-current;
    const deltaPct=current?delta/current*100:0;
    return {eligible:true,current,recommended,delta,deltaPct,reason:`Saved market research supports ${money(recommended)} at ${research.confidence||'unspecified'} confidence.`};
  }

  function optimize(item,research={}){
    const currentTitle=clean(item.title),proposedTitle=buildTitle(item);
    const currentDescription=String(item.description||'').trim(),proposedDescription=buildDescription(item,research);
    const ts=titleScore(item,currentTitle),ds=descriptionScore(item,currentDescription),rs=researchScore(research),price=priceRecommendation(item,research);
    const recommendations=[];
    if(proposedTitle&&proposedTitle!==currentTitle)recommendations.push({type:'title',field:'Title',priority:ts.score<65?'high':'medium',current:currentTitle,proposed:proposedTitle,reason:ts.issues.join(' ')||'Improve searchable attribute coverage.'});
    if(proposedDescription&&proposedDescription!==currentDescription)recommendations.push({type:'description',field:'Description',priority:ds.score<55?'high':'medium',current:currentDescription||'(blank)',proposed:proposedDescription,reason:ds.issues.join(' ')||'Improve buyer-facing item detail.'});
    if(price.eligible&&Math.abs(price.deltaPct)>=5)recommendations.push({type:'price',field:'Price',priority:Math.abs(price.deltaPct)>=20?'high':'medium',current:money(price.current),proposed:money(price.recommended),reason:price.reason});
    if(rs.score<45)recommendations.push({type:'research',field:'Pricing Evidence',priority:'medium',current:`${rs.comps} comparable(s)`,proposed:'Collect stronger sold/comparable evidence before changing price',reason:'Research confidence is not yet strong enough for an automated price recommendation.'});
    const overall=Math.round(ts.score*.35+ds.score*.30+rs.score*.35);
    return {version:'1.0.0',itemId:item.id,generatedAt:new Date().toISOString(),scores:{overall,title:ts.score,description:ds.score,research:rs.score},issues:{title:ts.issues,description:ds.issues},price,recommendations};
  }

  global.CommerceOSListingOptimizer={buildTitle,buildDescription,titleScore,descriptionScore,researchScore,priceRecommendation,optimize};
})(typeof window!=='undefined'?window:globalThis);
