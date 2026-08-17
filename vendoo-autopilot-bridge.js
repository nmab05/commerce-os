/* Commerce OS — Vendoo / Autopilot bridge
 * Persists the latest analyzed Vendoo dataset for read-only Autopilot scoring.
 * Marketplace writes remain approval-first.
 */
(function(global){
  'use strict';
  function appState(){try{if(typeof state!=='undefined'&&state)return state}catch(e){}return global.state||{}}
  function ensure(){const s=appState();s.vendooBridge=s.vendooBridge||{};if(!Array.isArray(s.vendooBridge.latestItems))s.vendooBridge.latestItems=[];return s}
  function saveItems(items,fileName){const s=ensure();s.vendooBridge.latestItems=Array.isArray(items)?items:[];s.vendooBridge.lastDatasetSavedAt=new Date().toISOString();if(fileName)s.vendooBridge.lastFileName=fileName;s.vendooBridge.lastCount=s.vendooBridge.latestItems.length;if(typeof global.persist==='function')global.persist();return s.vendooBridge.latestItems}
  function items(){return ensure().vendooBridge.latestItems||[]}
  function activeItems(){return items().filter(x=>String(x.status||'').toLowerCase()!=='sold')}
  function status(){const s=ensure();return {count:items().length,active:activeItems().length,fileName:s.vendooBridge.lastFileName||'',savedAt:s.vendooBridge.lastDatasetSavedAt||''}}
  function install(){
    ensure();
    if(typeof global.importVendooCSV!=='function'||global.importVendooCSV.__autopilotBridgeWrapped)return;
    const wrapped=async function(e){
      const f=e?.target?.files?.[0];if(!f)return;
      try{
        const raw=global.parseCSV(await f.text(),','),normalized=raw.map((r,i)=>global.adaptVendoo(r,i)).filter(x=>x.title&&x.title!=='Untitled');
        if(!normalized.length)throw new Error('No recognizable Vendoo rows found.');
        saveItems(normalized,f.name);
        const s=appState();s.vendooBridge.lastImportAt=new Date().toISOString();s.phase3=s.phase3||{};s.phase3.vendooImported=true;
        if(typeof global.analyzeVendooItems==='function')global.analyzeVendooItems(normalized);
        if(typeof global.buildRecon==='function')global.buildRecon(normalized);
        if(typeof global.persist==='function')global.persist();
        if(typeof global.renderVendooStatus==='function')global.renderVendooStatus();
        if(global.importMsg)global.importMsg.textContent=`Loaded ${normalized.length} Vendoo item(s) for Autopilot and reconciliation.`;
        if(typeof global.toastMsg==='function')global.toastMsg(`${normalized.length} Vendoo rows loaded for Autopilot.`);
      }catch(err){if(global.vendooSyncStatus)global.vendooSyncStatus.innerHTML=`<span style="color:#b42318">Vendoo analysis failed: ${String(err.message||err)}</span>`}
      if(e?.target)e.target.value='';
    };
    wrapped.__autopilotBridgeWrapped=true;global.importVendooCSV=wrapped;
  }
  global.CommerceOSVendooAutopilotBridge={ensure,saveItems,items,activeItems,status,install};
  install();
})(window);
