/* Herunterladen: einzelne Dateien, die beiden Sammelknoepfe und das ZIP. */

function dl(content,filename){
  var b=new Blob([content],{type:'text/plain'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  promptSupport();
}

var supportPromptTimer=null;
function promptSupport(){
  if(sessionStorage.getItem('supportModalShown')==='true') return;
  clearTimeout(supportPromptTimer);
  supportPromptTimer=setTimeout(function(){
    openSupportModal();
    sessionStorage.setItem('supportModalShown','true');
  },700);
}

[['btnSpeedJsx',buildSpeedJsx,'Speed_Overlay'],
 ['btnRouteJsx',buildRouteJsx,'Route_Overlay'],
 ['btnElevJsx',buildElevJsx,'Elevation_Overlay'],
 ['btnHRJsx',buildHRJsx,'HR_Overlay'],
 ['btnInclineJsx',buildInclineJsx,'Incline_Overlay'],
 ['btnMileJsx',buildMileJsx,'Mile_Marker_Overlay'],
 ['btnCadJsx',buildCadenceJsx,'Cadence_Overlay'],
 ['btnPowerJsx',buildPowerJsx,'Power_Overlay'],
 ['btnTempJsx',buildTempJsx,'Temperature_Overlay'],
 ['btnPaceJsx',buildPaceJsx,'Pace_Overlay'],
 ['btnLapJsx',buildLapJsx,'Lap_Marker_Overlay']
].forEach(function(spec){
  document.getElementById(spec[0]).addEventListener('click',function(){
    var content=spec[1]();
    if(!content){ setStatus('No data for this overlay in this file','err'); return; }
    dl(content,makeFilename(spec[2]+'_AE','jsx'));
    setStatus('Downloaded '+spec[2]+'_AE.jsx','ok');
  });
});
document.getElementById('btnSetting').addEventListener('click',function(){dl(buildSetting(),makeFilename('Speed_Overlay','setting'));setStatus('Downloaded Speed_Overlay.setting','ok');});
document.getElementById('btnRouteSetting').addEventListener('click',function(){dl(buildRouteSetting(),makeFilename('Route_Overlay','setting'));setStatus('Downloaded Route_Overlay.setting','ok');});
document.getElementById('btnElevSetting').addEventListener('click',function(){var s=buildElevSetting();if(!s){setStatus('No elevation data in this file','err');return;}dl(s,makeFilename('Elevation_Overlay','setting'));setStatus('Downloaded Elevation_Overlay.setting','ok');});

document.getElementById('btnHRSetting').addEventListener('click',function(){
  if(!hrData.length){setStatus('No heart rate data in this file','err');return;}
  dl(buildHRSetting(),makeFilename('HR_Overlay','setting'));
  setStatus('Downloaded HR_Overlay.setting','ok');
});

document.getElementById('btnInclineSetting').addEventListener('click',function(){
  if(!gradeData.length){setStatus('No elevation data in this file (incline requires elevation)','err');return;}
  dl(buildInclineSetting(),makeFilename('Incline_Overlay','setting'));
  setStatus('Downloaded Incline_Overlay.setting','ok');
});

document.getElementById('btnMileSetting').addEventListener('click',function(){
  if(!distData.length){setStatus('No GPS data in this file','err');return;}
  dl(buildMileSetting(),makeFilename('Mile_Marker_Overlay','setting'));
  setStatus('Downloaded Mile_Marker_Overlay.setting','ok');
});

document.getElementById('btnCadSetting').addEventListener('click',function(){
  var c=buildCadenceSetting();
  if(!c){setStatus('No cadence data in this file','err');return;}
  dl(c,makeFilename('Cadence_Overlay','setting'));
  setStatus('Downloaded Cadence_Overlay.setting','ok');
});

document.getElementById('btnPowerSetting').addEventListener('click',function(){
  var c=buildPowerSetting();
  if(!c){setStatus('No power data in this file','err');return;}
  dl(c,makeFilename('Power_Overlay','setting'));
  setStatus('Downloaded Power_Overlay.setting','ok');
});

document.getElementById('btnTempSetting').addEventListener('click',function(){
  var t=buildTempSetting();
  if(!t){setStatus('No temperature data in this file','err');return;}
  dl(t,makeFilename('Temperature_Overlay','setting'));
  setStatus('Downloaded Temperature_Overlay.setting','ok');
});

document.getElementById('btnPaceSetting').addEventListener('click',function(){
  var t=buildPaceSetting();
  if(!t){setStatus('No data for this overlay in this file','err');return;}
  dl(t,makeFilename('Pace_Overlay','setting'));
  setStatus('Downloaded Pace_Overlay.setting','ok');
});

document.getElementById('btnLapSetting').addEventListener('click',function(){
  var c=buildLapSetting();
  if(!c){setStatus('No lap data in this file (.fit and .tcx files only)','err');return;}
  dl(c,makeFilename('Lap_Marker_Overlay','setting'));
  setStatus('Downloaded Lap_Marker_Overlay.setting','ok');
});

function showExportProgress(){
  document.getElementById('exportProgressWrap').style.display='block';
  updateExportProgress(0,'Preparing files…');
}
function updateExportProgress(pct,label){
  document.getElementById('exportProgressFill').style.width=Math.max(0,Math.min(100,pct))+'%';
  if(label) document.getElementById('exportProgressLabel').textContent=localizeRuntimeText(label);
}
function hideExportProgress(){
  setTimeout(function(){document.getElementById('exportProgressWrap').style.display='none';},600);
}

function exportSteps(){
  return [
    {kind:'fusion',label:'Building Speed overlay…',run:function(){return buildSetting();},name:function(){return makeFilename('Speed_Overlay','setting');}},
    {kind:'fusion',label:'Building Route overlay…',run:function(){return buildRouteSetting();},name:function(){return makeFilename('Route_Overlay','setting');}},
    {kind:'fusion',label:'Building Elevation overlay…',run:function(){return buildElevSetting();},name:function(){return makeFilename('Elevation_Overlay','setting');},optional:true},
    {kind:'fusion',label:'Building HR overlay…',run:function(){return hrData.length?buildHRSetting():null;},name:function(){return makeFilename('HR_Overlay','setting');},optional:true},
    {kind:'fusion',label:'Building Incline overlay…',run:function(){return gradeData.length?buildInclineSetting():null;},name:function(){return makeFilename('Incline_Overlay','setting');},optional:true},
    {kind:'fusion',label:'Building Mile Marker overlay…',run:function(){return distData.length?buildMileSetting():null;},name:function(){return makeFilename('Mile_Marker_Overlay','setting');},optional:true},
    {kind:'fusion',label:'Building Cadence overlay…',run:function(){return buildCadenceSetting();},name:function(){return makeFilename('Cadence_Overlay','setting');},optional:true},
    {kind:'fusion',label:'Building Power overlay…',run:function(){return buildPowerSetting();},name:function(){return makeFilename('Power_Overlay','setting');},optional:true},
    {kind:'fusion',label:'Building Temperature overlay…',run:function(){return buildTempSetting();},name:function(){return makeFilename('Temperature_Overlay','setting');},optional:true},
    {kind:'fusion',label:'Building Pace overlay…',run:function(){return buildPaceSetting();},name:function(){return makeFilename('Pace_Overlay','setting');},optional:true},
    {kind:'fusion',label:'Building Lap Marker overlay…',run:function(){return buildLapSetting();},name:function(){return makeFilename('Lap_Marker_Overlay','setting');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildSpeedJsx();},name:function(){return makeFilename('Speed_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildRouteJsx();},name:function(){return makeFilename('Route_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildElevJsx();},name:function(){return makeFilename('Elevation_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildHRJsx();},name:function(){return makeFilename('HR_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildInclineJsx();},name:function(){return makeFilename('Incline_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildMileJsx();},name:function(){return makeFilename('Mile_Marker_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildCadenceJsx();},name:function(){return makeFilename('Cadence_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildPowerJsx();},name:function(){return makeFilename('Power_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildTempJsx();},name:function(){return makeFilename('Temperature_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildPaceJsx();},name:function(){return makeFilename('Pace_Overlay_AE','jsx');},optional:true},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildLapJsx();},name:function(){return makeFilename('Lap_Marker_Overlay_AE','jsx');},optional:true}
  ];
}

function runZipExport(kind, zipName){
  showExportProgress();
  // Ohne Fehlerbehandlung bleibt die Fortschrittsanzeige bei einem Fehler
  // sichtbar stehen und die alte Erfolgsmeldung daneben.
  function abbruch(e){
    console.error(e);
    setStatus('Export failed: '+(e&&e.message?e.message:e),'err');
    hideExportProgress();
  }
  try{
    var steps=exportSteps().filter(function(s){ return !kind || s.kind===kind; });
    var zip=new JSZip();
    var folder=zip.folder('GPX Overlay');
    var BUILD_SHARE=70;
    steps.forEach(function(step,i){
      updateExportProgress((i/steps.length)*BUILD_SHARE, step.label);
      var content=step.run();
      if(content) folder.file(step.name(),content);
    });
    updateExportProgress(BUILD_SHARE,'Compressing…');
    zip.generateAsync({type:'blob'},function(meta){
      updateExportProgress(BUILD_SHARE+(meta.percent/100)*(100-BUILD_SHARE),'Compressing… '+Math.round(meta.percent)+'%');
    }).then(function(content){
      updateExportProgress(100,'Done');
      var u=URL.createObjectURL(content),a=document.createElement('a');
      a.href=u; a.download=zipName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
      setStatus('Downloaded '+zipName,'ok');
      hideExportProgress();
      promptSupport();
    })['catch'](abbruch);
  }catch(e){ abbruch(e); }
}

document.getElementById('btnDownloadFusion').addEventListener('click',function(){ runZipExport('fusion','DaVinci Resolve Overlays.zip'); });
document.getElementById('btnDownloadAe').addEventListener('click',function(){ runZipExport('ae','After Effects Overlays.zip'); });
document.getElementById('btnDownloadAll').addEventListener('click',function(){ runZipExport(null,'GPX Overlay.zip'); });
