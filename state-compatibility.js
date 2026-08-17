/* Commerce OS — State Compatibility Guardrails
 * Adds only missing keys. Never deletes or rewrites existing user data.
 */
(function(global){
  'use strict';
  const ARRAY_KEYS=['optimizationQueue','executionBatches','actionQueue','autopilotRuns','experiments','experimentAssignments','experimentOutcomes','experimentProposalLinks'];
  const OBJECT_KEYS=['compResearch','marketResearch','photoResearch','listingOptimizationPackages'];
  function migrate(){
    global.state=global.state||{};
    if(!Array.isArray(global.state.inventory))global.state.inventory=[];
    ARRAY_KEYS.forEach(k=>{if(!Array.isArray(global.state[k]))global.state[k]=[]});
    OBJECT_KEYS.forEach(k=>{if(!global.state[k]||typeof global.state[k]!=='object'||Array.isArray(global.state[k]))global.state[k]={}});
    global.state.performanceLearning=global.state.performanceLearning||{forecasts:[],outcomes:[],tuning:{}};
    global.state.sellthroughCalibration=global.state.sellthroughCalibration||null;
    global.state.actionEffectModel=global.state.actionEffectModel||null;
    global.state.schemaVersion=Math.max(Number(global.state.schemaVersion||0),6);
    global.state.lastCompatibilityCheckAt=new Date().toISOString();
    if(typeof global.persist==='function')global.persist();
    return {schemaVersion:global.state.schemaVersion,arrayKeys:ARRAY_KEYS,objectKeys:OBJECT_KEYS};
  }
  global.CommerceOSStateCompatibility={migrate,ARRAY_KEYS,OBJECT_KEYS};
})(window);
