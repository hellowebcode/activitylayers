/* Herunterladen: einzelne Dateien, die beiden Sammelknoepfe und das ZIP. */

function dl(content,filename){
  var b=new Blob([content],{type:'text/plain'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  promptSupport();
}

// Der Sitzungsspeicher kann gesperrt sein - in manchen Browsern wirft schon der
// Zugriff. Ein Hinweisfenster darf einen gelungenen Export nicht in eine
// Fehlermeldung verwandeln, deshalb faengt jeder Zugriff ab.
var supportPromptTimer=null, supportSchonGezeigt=false;
function sitzungGelesen(schluessel){
  try{ return sessionStorage.getItem(schluessel); }catch(e){ return null; }
}
function sitzungGemerkt(schluessel, wert){
  try{ sessionStorage.setItem(schluessel, wert); }catch(e){}
}
function promptSupport(){
  if(supportSchonGezeigt || sitzungGelesen('supportModalShown')==='true') return;
  clearTimeout(supportPromptTimer);
  supportPromptTimer=setTimeout(function(){
    supportSchonGezeigt=true;
    openSupportModal();
    sitzungGemerkt('supportModalShown','true');
  },700);
}

// Ein Download je Overlay. Die Pruefung des Ergebnisses steckt hier, damit sie
// bei keinem Knopf fehlen kann. Fehlt schon die Quellreihe, sagt die Meldung
// welche; liefert der Generator trotz vorhandener Reihe nichts - etwa weil der
// Versatz die ganze Aufzeichnung aus dem Video schiebt - bleibt es allgemein.
function einzelDownload(knopf, bauen, basis, endung, quelleFehlt, meldung){
  var el=document.getElementById(knopf);
  if(!el) return;
  el.addEventListener('click',function(){
    if(quelleFehlt && quelleFehlt()){ setStatus(meldung,'err'); return; }
    var inhalt=bauen();
    if(!inhalt){ setStatus('No data for this overlay in this file','err'); return; }
    dl(inhalt, makeFilename(basis, endung));
    setStatus('Downloaded '+basis+'.'+endung,'ok');
  });
}

function leer(reihe){ return function(){ return !reihe().length; }; }

[['btnSetting',        function(){return buildSetting();},         'Speed_Overlay'],
 ['btnRouteSetting',   function(){return buildRouteSetting();},    'Route_Overlay'],
 ['btnDiscSetting',    function(){return buildRouteDiscSetting();},'Route_Disc_Overlay'],
 ['btnCompassSetting', function(){return buildCompassSetting();},  'Compass_Overlay'],
 ['btnElevSetting',    function(){return buildElevSetting();},     'Elevation_Overlay'],
 ['btnHRSetting',      function(){return buildHRSetting();},       'HR_Overlay',
  leer(function(){return hrData;}),   'No heart rate data in this file'],
 ['btnInclineSetting', function(){return buildInclineSetting();},  'Incline_Overlay',
  leer(function(){return gradeData;}),'No elevation data in this file (incline requires elevation)'],
 ['btnMileSetting',    function(){return buildMileSetting();},     'Mile_Marker_Overlay',
  leer(function(){return distData;}), 'No GPS data in this file'],
 ['btnCadSetting',     function(){return buildCadenceSetting();},  'Cadence_Overlay',
  leer(function(){return cadData;}),  'No cadence data in this file'],
 ['btnPowerSetting',   function(){return buildPowerSetting();},    'Power_Overlay',
  leer(function(){return powerData;}),'No power data in this file'],
 ['btnTempSetting',    function(){return buildTempSetting();},     'Temperature_Overlay',
  leer(function(){return tempData;}), 'No temperature data in this file'],
 ['btnPaceSetting',    function(){return buildPaceSetting();},     'Pace_Overlay'],
 ['btnLapSetting',     function(){return buildLapSetting();},      'Lap_Marker_Overlay',
  leer(function(){return lapData;}),  'No lap data in this file (.fit and .tcx files only)']
].forEach(function(a){ einzelDownload(a[0], a[1], a[2], 'setting', a[3], a[4]); });

[['btnSpeedJsx',   function(){return buildSpeedJsx();},     'Speed_Overlay'],
 ['btnRouteJsx',   function(){return buildRouteJsx();},     'Route_Overlay'],
 ['btnDiscJsx',    function(){return buildRouteDiscJsx();}, 'Route_Disc_Overlay'],
 ['btnCompassJsx', function(){return buildCompassJsx();},   'Compass_Overlay'],
 ['btnElevJsx',    function(){return buildElevJsx();},      'Elevation_Overlay'],
 ['btnHRJsx',      function(){return buildHRJsx();},        'HR_Overlay'],
 ['btnInclineJsx', function(){return buildInclineJsx();},   'Incline_Overlay'],
 ['btnMileJsx',    function(){return buildMileJsx();},      'Mile_Marker_Overlay'],
 ['btnCadJsx',     function(){return buildCadenceJsx();},   'Cadence_Overlay'],
 ['btnPowerJsx',   function(){return buildPowerJsx();},     'Power_Overlay'],
 ['btnTempJsx',    function(){return buildTempJsx();},      'Temperature_Overlay'],
 ['btnPaceJsx',    function(){return buildPaceJsx();},      'Pace_Overlay'],
 ['btnLapJsx',     function(){return buildLapJsx();},       'Lap_Marker_Overlay']
].forEach(function(a){ einzelDownload(a[0], a[1], a[2]+'_AE', 'jsx'); });

// Das Ausblenden ist verzoegert. Ohne Merken wuerde der Timer eines beendeten
// Laufs die Anzeige eines gerade gestarteten wieder wegnehmen.
var ausblendTimer=null;
function showExportProgress(){
  clearTimeout(ausblendTimer); ausblendTimer=null;
  document.getElementById('exportProgressWrap').style.display='block';
  updateExportProgress(0,'Preparing files…');
}
function updateExportProgress(pct,label){
  document.getElementById('exportProgressFill').style.width=Math.max(0,Math.min(100,pct))+'%';
  if(label) document.getElementById('exportProgressLabel').textContent=localizeRuntimeText(label);
}
function hideExportProgress(){
  clearTimeout(ausblendTimer);
  ausblendTimer=setTimeout(function(){
    ausblendTimer=null;
    document.getElementById('exportProgressWrap').style.display='none';
  },600);
}

function exportSteps(){
  return [
    {kind:'fusion',label:'Building Speed overlay…',run:function(){return buildSetting();},name:function(){return makeFilename('Speed_Overlay','setting');}},
    {kind:'fusion',label:'Building Route overlay…',run:function(){return buildRouteSetting();},name:function(){return makeFilename('Route_Overlay','setting');}},
    {kind:'fusion',label:'Building Route disc overlay…',run:function(){return buildRouteDiscSetting();},name:function(){return makeFilename('Route_Disc_Overlay','setting');}},
    {kind:'fusion',label:'Building Compass overlay…',run:function(){return buildCompassSetting();},name:function(){return makeFilename('Compass_Overlay','setting');}},
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
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildRouteDiscJsx();},name:function(){return makeFilename('Route_Disc_Overlay_AE','jsx');}},
    {kind:'ae',label:'Building After Effects scripts…',run:function(){return buildCompassJsx();},name:function(){return makeFilename('Compass_Overlay_AE','jsx');}},
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

var SAMMELKNOEPFE=['btnDownloadFusion','btnDownloadAe','btnDownloadAll'];
var exportLaeuft=false;

// Waehrend ein Archiv gepackt wird, bleiben die drei Sammelknoepfe gesperrt.
// Zwei Laeufe nebeneinander fressen doppelt Speicher und schreiben sich
// gegenseitig Fortschritt und Meldung um.
function sammelKnoepfeSperren(sperren){
  SAMMELKNOEPFE.forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.disabled=sperren;
  });
}

function runZipExport(kind, zipName){
  if(exportLaeuft) return;
  exportLaeuft=true;
  sammelKnoepfeSperren(true);
  showExportProgress();
  function fertig(){ exportLaeuft=false; sammelKnoepfeSperren(false); }
  // Ohne Fehlerbehandlung bleibt die Fortschrittsanzeige bei einem Fehler
  // sichtbar stehen und die alte Erfolgsmeldung daneben.
  function abbruch(e){
    console.error(e);
    setStatus('Export failed: '+(e&&e.message?e.message:e),'err');
    hideExportProgress();
    fertig();
  }
  try{
    var steps=exportSteps().filter(function(s){ return !kind || s.kind===kind; });
    var zip=new JSZip();
    var folder=zip.folder('GPX Overlay');
    var BUILD_SHARE=70, dabei=0;
    steps.forEach(function(step,i){
      updateExportProgress((i/steps.length)*BUILD_SHARE, step.label);
      var content=step.run();
      if(content){ folder.file(step.name(),content); dabei++; }
    });
    // Ein ZIP ohne eine einzige Datei ist kein Erfolg. Das passiert, wenn der
    // Versatz die ganze Aufzeichnung aus dem Video schiebt.
    if(!dabei){
      hideExportProgress();
      setStatus('Nothing to export','err');
      fertig();
      return;
    }
    updateExportProgress(BUILD_SHARE,'Compressing…');
    zip.generateAsync({type:'blob'},function(meta){
      updateExportProgress(BUILD_SHARE+(meta.percent/100)*(100-BUILD_SHARE),'Compressing… '+Math.round(meta.percent)+'%');
    }).then(function(content){
      updateExportProgress(100,'Done');
      var u=URL.createObjectURL(content),a=document.createElement('a');
      a.href=u; a.download=zipName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
      setStatus('Downloaded '+zipName,'ok');
      hideExportProgress();
      fertig();
      promptSupport();
    })['catch'](abbruch);
  }catch(e){ abbruch(e); }
}

document.getElementById('btnDownloadFusion').addEventListener('click',function(){ runZipExport('fusion','DaVinci Resolve Overlays.zip'); });
document.getElementById('btnDownloadAe').addEventListener('click',function(){ runZipExport('ae','After Effects Overlays.zip'); });
document.getElementById('btnDownloadAll').addEventListener('click',function(){ runZipExport(null,'GPX Overlay.zip'); });
