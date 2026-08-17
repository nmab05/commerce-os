/* Commerce OS — Vendoo / Autopilot bridge
 * Makes the latest analyzed Vendoo dataset durable and available to Autopilot
 * without requiring reconciliation into the legacy prototype inventory first.
 * Read-only source: marketplace writes remain approval-first.
 */
(function(global){
  'use strict';
  function appState(){try{if(typeof state!=='undefined'&&state)return state}catch(e){}return global.state||{}}
  function ensure(){const s=appState();s.vendooBridge=s.vendooBridge||{};if(!Array.isArray(s.vendooBridge.latestItems))s.vendooBridge.latestItems=[];return s}
  function saveItems(items,fileName){
    const s=ensure();
    s.vendooBridge.latestItems=Array.isArray(items)?items:[];
    s.vendooBridge.lastDatasetSavedAt=new Date().toISOString();
    if(fileName)s.vendooBridge.lastFileName=fileName;
    s.vendooBridge.lastCount=s.vendooBridge.latestItems.length;
    if(typeof global.persist==='function')global.persist();
    return s.vendooBridge.latestItems;
  }
  function items(){const s=ensure();return s.vendooBridge.latestItems||[]}
  function activeItems(){return items().filter(x=>String(x.status||'').toLowerCase()!=='sold')}
  function status(){const s=ensure();return {count:items().length,active:activeItems().length,fileName:s.vendooBridge.lastFileName||'',savedAt:s.vendooBridge.lastDatasetSavedAt||''}}
  global.CommerceOSVendooAutopilotBridge={ensure,saveItems,items,activeItems,status};
})(window);
