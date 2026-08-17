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
    global.state.performanceLearning=global.state.performanceLearning||{forecasts:[],outcomes:[],tuning:{cashWeight:1,marginWeight:1,opportunityWeight:1,probabilityScale:1}};
    if(!Array.isArray(global.state.performanceLearning.forecasts))global.state.performanceLearning.forecasts=[];
    if(!Array.isArray(global.state.performanceLearning.outcomes))global.state.performanceLearning.outcomes=[];
    global.state.performanceLearning.tuning=global.state.performanceLearning.tuning||{cashWeight:1,marginWeight:1,opportunityWeight:1,probabilityScale:1};
    global.state.sellthroughCalibration=global.state.sellthroughCalibration||null;
    global.state.actionEffects=global.state.actionEffects||{updatedAt:null,global:{},byCategory:{},byBrand:{}};
    global.state.schemaVersion=Math.max(Number(global.state.schemaVersion||0),7);
    global.state.lastCompatibilityCheckAt=new Date().toISOString();
    if(typeof global.persist==='function')global.persist();
    return {schemaVersion:global.state.schemaVersion,arrayKeys:ARRAY_KEYS,objectKeys:OBJECT_KEYS};
  }
  global.CommerceOSStateCompatibility={migrate,ARRAY_KEYS,OBJECT_KEYS};
})(window);
