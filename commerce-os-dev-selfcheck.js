/* Commerce OS dev runtime self-check */
(function(global){
  function run(){
    const tests=[];
    const add=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});
    add('Core app state',!!global.state);
    add('Inventory state',Array.isArray(global.state?.inventory));
    add('Listing optimizer loaded',!!global.CommerceOSListingOptimizer);
    add('Integration adapter loaded',!!global.CommerceOSListingOptimizerIntegration);
    add('Research item selector',!!document.getElementById('researchItemSelect'));
    add('Listing title field',!!document.getElementById('researchProposedTitle'));
    add('Listing description field',!!document.getElementById('researchProposedDescription'));
    add('Approval queue',Array.isArray(global.state?.optimizationQueue));
    add('Optimizer package function',typeof global.generateListingOptimizationPackage==='function');
    add('Approval-first proposal function',typeof global.createListingResearchProposals==='function');
    const failed=tests.filter(t=>!t.ok);
    const result={ok:failed.length===0,checkedAt:new Date().toISOString(),tests};
    global.__commerceOSDevSelfCheck=result;
    return result;
  }
  global.runCommerceOSDevSelfCheck=run;
})(window);