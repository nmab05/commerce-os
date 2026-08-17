/* Commerce OS — Listing Optimizer integration adapter
 * Loads after index.html and listing-optimizer.js.
 * Enhances the existing Integrated Item Research > Listing workflow without marketplace writes.
 */
(function(global){
  'use strict';
  function ready(){return global.CommerceOSListingOptimizer&&global.state&&typeof global.selectedResearchItem==='function'}
  function researchFor(item){return (global.state.compResearch&&global.state.compResearch[item.id])||{}}
  function packagesFor(item){return global.CommerceOSListingOptimizer.optimizeAll(item,researchFor(item))}
  function primaryPackage(item){return packagesFor(item)[0]}
  function summary(packages){
    const p=packages[0],s=p.scores;
    const names=packages.map(x=>x.platform).join(' / ');
    const price=p.price&&p.price.eligible?` • Evidence price from $${Number(p.price.recommended).toFixed(2)}`:' • Price: research required';
    return `Optimization score: <b>${s.overall}/100</b> • Title ${s.title}/100 • Description ${s.description}/100 • Research ${s.research}/100 • Targets: <b>${names}</b>${price}`;
  }
  function enhanceListingDraft(){
    if(!ready())return false;
    const item=global.selectedResearchItem();if(!item)return false;
    const packages=packagesFor(item),pkg=packages[0];
    const platform=String(pkg.platform||'eBay').toLowerCase();
    const title=document.getElementById('researchProposedTitle'),desc=document.getElementById('researchProposedDescription'),box=document.getElementById('listingResearchSummary');
    if(title)title.value=global.CommerceOSListingOptimizer.buildTitle(item,platform);
    if(desc)desc.value=global.CommerceOSListingOptimizer.buildDescription(item,platform);
    if(box)box.innerHTML=summary(packages);
    global.state.listingOptimizationPackages=global.state.listingOptimizationPackages||{};
    global.state.listingOptimizationPackages[item.id]=packages;
    if(typeof global.persist==='function')global.persist();
    return packages;
  }
  function addIntelligentProposals(){
    if(!ready())return 0;
    const item=global.selectedResearchItem();if(!item)return 0;
    const packages=packagesFor(item);let n=0;
    global.state.optimizationQueue=global.state.optimizationQueue||[];
    packages.forEach(pkg=>pkg.recommendations.forEach(r=>{
      if(r.type==='research')return;
      const platform=r.platform||pkg.platform||'Generic';
      const type=`${r.type}-${String(platform).toLowerCase()}`;
      const duplicate=global.state.optimizationQueue.some(q=>q.itemId===item.id&&q.type===type&&q.status!=='rejected'&&String(q.proposed)===String(r.proposed));
      if(duplicate)return;
      if(typeof global.proposal==='function'){
        const q=global.proposal(item,type,r.priority,`${r.field} • ${platform}`,r.current,r.proposed,`Listing intelligence (${platform}): ${r.reason}`);
        q.platform=platform;
        global.state.optimizationQueue.unshift(q);
      }
      n++;
    }));
    if(typeof global.persist==='function')global.persist();
    if(typeof global.renderOptimizationQueue==='function')global.renderOptimizationQueue();
    if(typeof global.toastMsg==='function')global.toastMsg(`${n} marketplace-specific listing proposal(s) added.`);
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
  global.CommerceOSListingOptimizerIntegration={install,enhanceListingDraft,addIntelligentProposals,packagesFor,primaryPackage};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})(window);
