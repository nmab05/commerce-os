/* Commerce OS — Pre-merge self-check */
(function(global){
  'use strict';
  function run(){
    const tests=[];const add=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});
    add('State exists',!!global.state);
    add('Inventory array',Array.isArray(global.state?.inventory));
    add('Approval queue array',Array.isArray(global.state?.optimizationQueue));
    add('State compatibility',!!global.CommerceOSStateCompatibility&&typeof global.CommerceOSStateCompatibility.migrate==='function');
    add('Listing optimizer',!!global.CommerceOSListingOptimizer&&typeof global.CommerceOSListingOptimizer.optimize==='function');
    add('Listing integration',!!global.CommerceOSListingOptimizerIntegration);
    add('Bulk optimizer',!!global.CommerceOSBulkListingOptimizer&&typeof global.CommerceOSBulkListingOptimizer.run==='function');
    add('Stale engine',!!global.CommerceOSStaleInventory&&typeof global.CommerceOSStaleInventory.decide==='function');
    add('Sell-through calibration',!!global.CommerceOSSellthroughCalibration);
    add('Performance learning',!!global.CommerceOSPerformanceLearning);
    add('Portfolio economics',!!global.CommerceOSPortfolioEconomics&&typeof global.CommerceOSPortfolioEconomics.rank==='function');
    add('Experiment framework',!!global.CommerceOSExperiments);
    add('Experiment approval guard',!!global.CommerceOSExperimentApproval);
    add('Action-effect learning',!!global.CommerceOSActionEffects);
    add('Decision policy learning',!!global.CommerceOSDecisionPolicy&&typeof global.CommerceOSDecisionPolicy.choose==='function');
    add('Autopilot',!!global.CommerceOSAutopilot&&typeof global.CommerceOSAutopilot.rank==='function'&&typeof global.CommerceOSAutopilot.queue==='function');
    add('Research UI selector',!!document.getElementById('researchItemSelect'));
    add('Proposed title field',!!document.getElementById('researchProposedTitle'));
    add('Proposed description field',!!document.getElementById('researchProposedDescription'));
    add('Approval proposal factory',typeof global.proposal==='function');
    add('No direct marketplace writer exposed',typeof global.writeMarketplaceListing!=='function'&&typeof global.autoPublishListing!=='function','Autopilot remains recommendation-only');
    try{
      const before=(global.state.optimizationQueue||[]).length;
      const rows=global.CommerceOSAutopilot?.rank?.()||[];
      add('Autopilot rank returns array',Array.isArray(rows));
      add('Autopilot excludes sold items',!rows.some(r=>String((global.state.inventory||[]).find(x=>String(x.id)===String(r.itemId))?.status||'').toLowerCase()==='sold'));
      add('Autopilot one row per item',new Set(rows.map(r=>String(r.itemId))).size===rows.length);
      add('Autopilot learned-policy wiring',!global.CommerceOSDecisionPolicy||rows.every(r=>Object.prototype.hasOwnProperty.call(r,'baseAction')&&Object.prototype.hasOwnProperty.call(r,'effectEvidence')));
      add('Self-check is non-mutating',before===(global.state.optimizationQueue||[]).length);
    }catch(e){add('Autopilot smoke test',false,e.message)}
    const failed=tests.filter(t=>!t.ok),result={ok:failed.length===0,checkedAt:new Date().toISOString(),passed:tests.length-failed.length,failed:failed.length,tests};
    global.__commerceOSPremergeSelfCheck=result;return result;
  }
  global.runCommerceOSPremergeSelfCheck=run;
})(window);