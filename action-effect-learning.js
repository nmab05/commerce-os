/* Commerce OS — Action Effect Learning
 * Converts closed experiment results into bounded action-effect priors.
 */
(function(global){
  'use strict';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const key=v=>String(v||'').trim().toLowerCase();
  function ensure(){global.state.actionEffects=global.state.actionEffects||{updatedAt:null,global:{},byCategory:{},byBrand:{}}}
  function effectScore(summary){
    const l=summary?.lift||{},t=summary?.treatment||{},c=summary?.control||{};
    const n=Math.min(t.n||0,c.n||0),confidence=clamp(n/20,0,1);
    const sell=clamp((l.sellThrough||0)*2.2,-1,1);
    const days=clamp((l.daysToSale||0)/45,-1,1);
    const margin=clamp((l.margin||0)/40,-1,1);
    const price=clamp((l.price||0)/40,-1,1);
    const raw=sell*.45+days*.2+margin*.25+price*.1;
    return {score:clamp(raw*confidence,-.5,.5),confidence,sample:n,components:{sell,days,margin,price}};
  }
  function train(){
    ensure();const exps=(global.state.experiments||[]).filter(e=>e.status==='closed'&&e.result);
    const model={updatedAt:new Date().toISOString(),global:{},byCategory:{},byBrand:{},experiments:exps.length};
    exps.forEach(e=>{
      const eff=effectScore(e.result),action=key(e.action);if(!action)return;
      const bucket=model.global[action]||(model.global[action]={weighted:0,weight:0,sample:0,experiments:0});
      bucket.weighted+=eff.score*Math.max(1,eff.sample);bucket.weight+=Math.max(1,eff.sample);bucket.sample+=eff.sample;bucket.experiments++;
      const assigns=(global.state.experimentAssignments||[]).filter(a=>a.experimentId===e.id&&a.arm==='treatment');
      assigns.forEach(a=>{const item=(global.state.inventory||[]).find(x=>String(x.id)===String(a.itemId));if(!item)return;[[model.byCategory,key(item.category)],[model.byBrand,key(item.brand)]].forEach(([root,k])=>{if(!k)return;root[k]=root[k]||{};const b=root[k][action]||(root[k][action]={weighted:0,weight:0,sample:0});b.weighted+=eff.score;b.weight+=1;b.sample+=1})});
    });
    const finalize=root=>Object.values(root).forEach(v=>{if(v&&typeof v==='object'&&'weighted'in v)v.score=v.weight?v.weighted/v.weight:0;else if(v&&typeof v==='object')finalize(v)});finalize(model.global);finalize(model.byCategory);finalize(model.byBrand);
    global.state.actionEffects=model;if(typeof global.persist==='function')global.persist();return model;
  }
  function getModel(){ensure();const closed=(global.state.experiments||[]).filter(e=>e.status==='closed'&&e.result).length;const m=global.state.actionEffects;if(!m.updatedAt||m.experiments!==closed)return train();return m}
  function estimate(item,action){
    const m=getModel(),a=key(action),vals=[];
    const g=m.global[a];if(g)vals.push({score:g.score,weight:Math.min(4,1+(g.sample||0)/10),source:'global'});
    const c=m.byCategory[key(item.category)]?.[a];if(c)vals.push({score:c.score,weight:2,source:'category'});
    const b=m.byBrand[key(item.brand)]?.[a];if(b)vals.push({score:b.score,weight:2,source:'brand'});
    if(!vals.length)return {score:0,confidence:'none',sources:[],sample:0};
    const weight=vals.reduce((s,x)=>s+x.weight,0),score=vals.reduce((s,x)=>s+x.score*x.weight,0)/weight,sample=(g?.sample||0);
    return {score:clamp(score,-.5,.5),confidence:sample>=20?'high':sample>=8?'medium':'low',sources:vals.map(x=>x.source),sample};
  }
  function rankActions(item,actions){return actions.map(action=>({action,...estimate(item,action)})).sort((a,b)=>b.score-a.score)}
  global.CommerceOSActionEffects={train,getModel,estimate,rankActions,effectScore};
})(window);