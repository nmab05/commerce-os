/* Commerce OS — Listing Optimizer integration adapter
 * Loads after index.html and listing-optimizer.js.
 * Enhances the existing Integrated Item Research > Listing workflow without marketplace writes.
 */
(function(global){
  'use strict';
  function ready(){return global.CommerceOSListingOptimizer&&global.state&&typeof global.selectedResearchItem==='function'}
  function researchFor(item){return (global.state.compResearch&&global.state.compResearch[item.id])||{}}
  function packageFor(item){return global.CommerceOSListingOptimizer.optimize(item,researchFor(item))}
  function summary(pkg){
    const s=pkg.scores;
    const price=pkg.price&&pkg.price.eligible?` • Evidence price: $${Number(pkg.price.recommended).toFixed(2)}`:' • Price: research required';
    return `Optimization score: <b>${s.overall}/100</b> • Title ${s.title}/100 • Description ${s.description}/100 • Research ${s.research}/100${price}`;
  }
  function enhanceListingDraft(){
    if(!ready())return false;
    const item=global.selectedResearchItem();if(!item)return false;
    const pkg=packageFor(item);
    const title=document.getElementById('researchProposedTitle');
    const desc=document.getElementById('researchProposedDescription');
    const box=document.getElementById('listingResearchSummary');
    if(title)title.value=global.CommerceOSListingOptimizer.buildTitle(item);
    if(desc)desc.value=global.CommerceOSListingOptimizer.buildDescription(item,researchFor(item));
    if(box)box.innerHTML=summary(pkg);
    global.state.listingOptimizationPackages=global.state.listingOptimizationPackages||{};
    global.state.listingOptimizationPackages[item.id]=pkg;
    if(typeof global.persist==='function')global.persist();
    return pkg;
  }
  function addIntelligentProposals(){
    if(!ready())return 0;
    const item=global.selectedResearchItem();if(!item)return 0;
    const pkg=packageFor(item);let n=0;
    global.state.optimizationQueue=global.state.optimizationQueue||[];
    pkg.recommendations.forEach(r=>{
      if(r.type==='research')return;
      const duplicate=global.state.optimizationQueue.some(q=>q.itemId===item.id&&q.type===r.type&&q.status!=='rejected'&&String(q.proposed)===String(r.proposed));
      if(duplicate)return;
      if(typeof global.proposal==='function')global.state.optimizationQueue.unshift(global.proposal(item,r.type,r.priority,r.field,r.current,r.proposed,`Listing intelligence: ${r.reason}`));
      n++;
    });
    if(typeof global.persist==='function')global.persist();
    if(typeof global.renderOptimizationQueue==='function')global.renderOptimizationQueue();
    if(typeof global.toastMsg==='function')global.toastMsg(`${n} intelligent listing proposal(s) added.`);
    return n;
  }
  function install(){
    if(!ready())return setTimeout(install,100);
    const oldLoad=global.loadResearchItem;
    if(typeof oldLoad==='function'&&!oldLoad.__optimizerWrapped){
      const wrapped=function(){const out=oldLoad.apply(this,arguments);setTimeout(enhanceListingDraft,0);return out};
      wrapped.__optimizerWrapped=true;global.loadResearchItem=wrapped;
    }
    global.generateListingResearchDraft=enhanceListingDraft;
    global.createListingResearchProposals=addIntelligentProposals;
    global.generateListingOptimizationPackage=enhanceListingDraft;
  }
  global.CommerceOSListingOptimizerIntegration={install,enhanceListingDraft,addIntelligentProposals,packageFor};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})(window);
