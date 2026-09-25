/* Bedienelemente: Vorgabewerte, Speichern zwischen Besuchen, Zuruecksetzen,
   der Synchronisierungsrechner und die beiden Dialoge. */

// Einstellungen bleiben zwischen Besuchen erhalten. Nur im Browser des Nutzers,
// nichts verlaesst das Geraet. Die Sprache hat ihren eigenen Schluessel.
var EINSTELLUNGEN_SCHLUESSEL='activitylayersSettings';

// Jedes Bedienelement, das ein Generator liest, gehoert in diese Liste.
var CONTROL_IDS=[
  'cadColor',
  'cadSize',
  'dotColor',
  'dotR',
  'driftFactor',
  'elevColor',
  'elevDotColor',
  'elevFill',
  'elevFillColor',
  'elevH',
  'elevLabels',
  'elevLineW',
  'elevShadowColor',
  'elevShadowOffset',
  'elevW',
  'fps',
  'gaugeArcColor',
  'gaugeBgColor',
  'gaugeNumberColor',
  'gaugeRingColor',
  'gaugeUnitColor',
  'hrColor',
  'hrHeartColor',
  'hrSize',
  'inclineNumberColor',
  'inclineUnit',
  'inclineWedgeColor',
  'lapColor',
  'lapSize',
  'maxSpeed',
  'mileColor',
  'mileDecimals',
  'mileLineDistColor',
  'offset',
  'powerColor',
  'powerSize',
  'sg1',
  'sg2',
  'hrColor2',
  'hrColor3',
  'hrZone2',
  'hrZone3',
  'hrZones',
  'powerColor2',
  'powerColor3',
  'powerZone2',
  'powerZone3',
  'powerZones',
  'paceColor',
  'paceSize',
  'shadowColor',
  'tempColor',
  'tempSize',
  'shadowOffset',
  'ghostW',
  'ghostColor',
  'ghostAlpha',
  'smooth',
  'compPreset',
  'speedAnchor',
  'speedOffX',
  'speedOffY',
  'elevAnchor',
  'elevOffX',
  'elevOffY',
  'hrAnchor',
  'hrOffX',
  'hrOffY',
  'inclineAnchor',
  'inclineOffX',
  'inclineOffY',
  'mileAnchor',
  'mileOffX',
  'mileOffY',
  'cadAnchor',
  'cadOffX',
  'cadOffY',
  'powerAnchor',
  'powerOffX',
  'powerOffY',
  'tempAnchor',
  'tempOffX',
  'tempOffY',
  'paceAnchor',
  'paceOffX',
  'paceOffY',
  'lapAnchor',
  'lapOffX',
  'lapOffY',
  'compW',
  'compH',
  'sv1',
  'sv2',
  'trackColor',
  'trackW',
  'unit'
];

stelleEinstellungenWiederHer();
var btnIds=['btnSetting','btnRouteSetting','btnElevSetting','btnHRSetting','btnInclineSetting','btnMileSetting',
  'btnCadSetting','btnPowerSetting','btnTempSetting','btnPaceSetting','btnLapSetting',
  'btnSpeedJsx','btnRouteJsx','btnElevJsx','btnHRJsx','btnInclineJsx','btnMileJsx',
  'btnCadJsx','btnPowerJsx','btnTempJsx','btnPaceJsx','btnLapJsx'];
var syncCalcResult={offset:null,drift:null};

var DEF_VIDEO={fps:'29.97',unit:'mph',smooth:'3',offset:'0',driftFactor:'1.0',
               compPreset:'1920x1080',compW:'1920',compH:'1080'};
var DEF_ROUTE={trackW:'4',dotR:'8',shadowOffset:'5',trackColor:'#ff6600',dotColor:'#fca300',shadowColor:'#000000',
               ghostW:'4',ghostColor:'#8892a4',ghostAlpha:'0.55'};
var DEF_GAUGE={gaugeBgColor:'#000000',gaugeRingColor:'#ffffff',gaugeArcColor:'#aa0000',gaugeNumberColor:'#ffffff',gaugeUnitColor:'#6d6d7e'};
var DEF_ELEV={elevW:'1920',elevH:'300',elevLineW:'2',elevColor:'#38bdf8',elevFill:'1',elevFillColor:'#ffffff',elevDotColor:'#38bdf8',elevShadowColor:'#000000',elevShadowOffset:'4'};

// Lage aller Overlays. Sie ist bewusst fuer beide Ausgabeformate dieselbe -
// vorher sass dasselbe Overlay in Resolve mittig und in After Effects unten
// links.
var POSITION_SCHLUESSEL=['speed','elev','hr','incline','mile','cad','power','temp','pace','lap'];
var DEF_POSITION={elev:'bottom-center'};
// Die drei Lagefelder eines Overlays einzeln lesen. buildTextOverlaySetting
// hat einen Parameter namens cfg und kommt deshalb nicht an die Funktion cfg().
function lageFelder(schluessel){
  function w(id){ var el=document.getElementById(id); return el?el.value:''; }
  var o={};
  o[schluessel+'Anchor']=w(schluessel+'Anchor');
  o[schluessel+'OffX']=w(schluessel+'OffX');
  o[schluessel+'OffY']=w(schluessel+'OffY');
  return o;
}

function positionZuruecksetzen(schluessel){
  var el=document.getElementById(schluessel+'Anchor');
  if(el) el.value=DEF_POSITION[schluessel]||'bottom-left';
  ['OffX','OffY'].forEach(function(feld){
    var f=document.getElementById(schluessel+feld);
    if(f) f.value='0';
  });
}

function applyDefaults(defs){ Object.keys(defs).forEach(function(id){var el=document.getElementById(id);if(el)el.value=defs[id];}); }

function sammleEinstellungen(){
  var werte={};
  for(var i=0;i<CONTROL_IDS.length;i++){
    var el=document.getElementById(CONTROL_IDS[i]);
    if(el) werte[CONTROL_IDS[i]]=(el.type==='checkbox')?el.checked:el.value;
  }
  return werte;
}

function wendeEinstellungenAn(werte){
  if(!werte||typeof werte!=='object') return 0;
  var uebernommen=0;
  for(var i=0;i<CONTROL_IDS.length;i++){
    var id=CONTROL_IDS[i], el=document.getElementById(id);
    if(!el||!(id in werte)) continue;
    if(el.type==='checkbox') el.checked=!!werte[id];
    else if(el.tagName==='SELECT'){
      // nur uebernehmen, wenn die Option noch existiert
      var ok=false;
      for(var o=0;o<el.options.length;o++) if(el.options[o].value===String(werte[id])) ok=true;
      if(ok) el.value=String(werte[id]);
    } else el.value=String(werte[id]);
    uebernommen++;
  }
  return uebernommen;
}

// ---- Benannte Vorlagen --------------------------------------------------
// Der zuletzt genutzte Zustand wird ohnehin gemerkt. Vorlagen sind darueber
// hinaus mehrere benannte Zustaende, die bleiben, bis man sie loescht.
var VORLAGEN_SCHLUESSEL='activitylayersPresets';

function vorlagenLesen(){
  try{
    var o=JSON.parse(localStorage.getItem(VORLAGEN_SCHLUESSEL)||'{}');
    return (o&&typeof o==='object'&&!Array.isArray(o))?o:{};
  }catch(e){ return {}; }
}
function vorlagenSchreiben(o){
  try{ localStorage.setItem(VORLAGEN_SCHLUESSEL, JSON.stringify(o)); return true; }
  catch(e){ setStatus('Presets could not be saved — this browser is out of storage','err'); return false; }
}
function vorlagenListeFuellen(auswahl){
  var sel=document.getElementById('presetList');
  if(!sel) return;
  var o=vorlagenLesen(), namen=Object.keys(o).sort();
  sel.innerHTML='';
  var leer=document.createElement('option');
  leer.value='';
  leer.textContent=translateStaticValue(namen.length?'Choose a preset':'None saved yet', uiLanguage);
  sel.appendChild(leer);
  for(var i=0;i<namen.length;i++){
    var opt=document.createElement('option');
    opt.value=namen[i]; opt.textContent=namen[i];
    sel.appendChild(opt);
  }
  sel.value=(auswahl&&namen.indexOf(auswahl)>=0)?auswahl:'';
}

// Nach dem Laden muessen Vorschau und abgeleitete Werte nachziehen - die
// Felder direkt zu setzen loest von sich aus kein Ereignis aus.
function vorlageNachziehen(){
  try{ leinwandAuswahlAngleichen(); }catch(e){}
  if(rawPoints.length){
    try{ reprocess(); }catch(e){ console.error(e); }
  }
  speichereEinstellungen();
}

function vorlageSpeichern(){
  var feld=document.getElementById('presetName');
  var name=(feld.value||'').replace(/\s+/g,' ').trim();
  if(!name){ setStatus('Give the preset a name first','err'); feld.focus(); return; }
  var o=vorlagenLesen();
  o[name]=sammleEinstellungen();
  if(!vorlagenSchreiben(o)) return;
  vorlagenListeFuellen(name);
  setStatus('Preset saved: '+name,'ok');
}

function vorlageLaden(name){
  if(!name) return;
  var o=vorlagenLesen();
  if(!o[name]){ setStatus('That preset is gone','err'); vorlagenListeFuellen(); return; }
  var n=wendeEinstellungenAn(o[name]);
  document.getElementById('presetName').value=name;
  vorlageNachziehen();
  setStatus('Preset loaded: '+name,'ok');
}

function vorlageLoeschen(){
  var sel=document.getElementById('presetList'), name=sel.value;
  if(!name){ setStatus('Choose a preset to delete','err'); return; }
  var o=vorlagenLesen();
  delete o[name];
  if(!vorlagenSchreiben(o)) return;
  vorlagenListeFuellen();
  document.getElementById('presetName').value='';
  setStatus('Preset deleted: '+name,'ok');
}

function vorlageAusgeben(){
  var sel=document.getElementById('presetList'), name=sel.value;
  var werte, titel;
  if(name){ werte=vorlagenLesen()[name]; titel=name; }
  else { werte=sammleEinstellungen(); titel=(document.getElementById('presetName').value||'preset').trim(); }
  if(!werte){ setStatus('Nothing to export','err'); return; }
  var inhalt=JSON.stringify({activitylayersPreset:1, name:titel, values:werte}, null, 2);
  dl(inhalt, sanitizeFilename('Activity Layers preset - '+titel)+'.json');
}

function vorlageEinlesen(datei){
  var leser=new FileReader();
  leser.onload=function(e){
    var d=null;
    try{ d=JSON.parse(e.target.result); }catch(err){}
    if(!d||!d.values||typeof d.values!=='object'){
      setStatus('That is not an Activity Layers preset','err'); return;
    }
    var name=(String(d.name||datei.name.replace(/\.[^.]+$/,''))).replace(/\s+/g,' ').trim() || 'Imported preset';
    var o=vorlagenLesen();
    o[name]=d.values;
    if(!vorlagenSchreiben(o)) return;
    vorlagenListeFuellen(name);
    vorlageLaden(name);
  };
  leser.readAsText(datei);
}

(function(){
  var sel=document.getElementById('presetList');
  if(!sel) return;
  vorlagenListeFuellen();
  sel.addEventListener('change',function(){ vorlageLaden(this.value); });
  document.getElementById('presetSave').addEventListener('click',vorlageSpeichern);
  document.getElementById('presetDelete').addEventListener('click',vorlageLoeschen);
  document.getElementById('presetExport').addEventListener('click',vorlageAusgeben);
  var datei=document.getElementById('presetFile');
  document.getElementById('presetImport').addEventListener('click',function(){ datei.click(); });
  datei.addEventListener('change',function(){
    if(datei.files[0]) vorlageEinlesen(datei.files[0]);
    datei.value='';
  });
})();

function speichereEinstellungen(){
  try{ localStorage.setItem(EINSTELLUNGEN_SCHLUESSEL, JSON.stringify(sammleEinstellungen())); }catch(e){}
}

function stelleEinstellungenWiederHer(){
  var werte=null;
  try{ werte=JSON.parse(localStorage.getItem(EINSTELLUNGEN_SCHLUESSEL)||'null'); }catch(e){}
  return wendeEinstellungenAn(werte)>0;
}

(function(){
  ['input','change'].forEach(function(art){
    document.addEventListener(art,function(e){
      if(e.target&&e.target.id&&CONTROL_IDS.indexOf(e.target.id)>=0) speichereEinstellungen();
    },true);
  });
  // Die Zuruecksetzen-Knoepfe setzen Werte direkt und loesen kein Ereignis aus.
  // Dieser Zuhoerer laeuft beim Hochblubbern, also nach ihnen.
  document.addEventListener('click',function(e){
    var t=e.target;
    while(t&&t!==document){ if(t.className&&String(t.className).indexOf('reset-btn')>=0){ speichereEinstellungen(); return; } t=t.parentNode; }
  });
})();

document.getElementById('syncInfoHeader').addEventListener('click',function(){
  var body=document.getElementById('syncInfoBody'), arrow=document.getElementById('syncInfoArrow');
  var open=body.style.display==='block';
  body.style.display=open?'none':'block';
  arrow.classList.toggle('open',!open);
});

document.getElementById('copyDur').addEventListener('click',function(){
  var dur=document.getElementById('statDur').textContent;
  if(!navigator.clipboard){return;}
  navigator.clipboard.writeText(dur).then(function(){
    var btn=document.getElementById('copyDur');
    btn.textContent=localizeRuntimeText('copied!'); btn.style.color='var(--success)';
    setTimeout(function(){btn.textContent=localizeRuntimeText('copy');btn.style.color='';},1600);
  });
});

document.getElementById('btnSyncHelper').addEventListener('click',function(){document.getElementById('syncModal').classList.add('open');});
document.getElementById('syncClose').addEventListener('click',function(){document.getElementById('syncModal').classList.remove('open');});
document.getElementById('syncModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});

var supportButton=document.getElementById('btnSupport');
var supportHeaderButton=document.getElementById('btnSupportHeader');
var supportButtons=[supportButton,supportHeaderButton];
var lastSupportTrigger=supportButton;
var supportModal=document.getElementById('supportModal');
function openSupportModal(){
  supportModal.classList.add('open');
  supportModal.setAttribute('aria-hidden','false');
  document.getElementById('supportClose').focus();
}
function closeSupportModal(){
  supportModal.classList.remove('open');
  supportModal.setAttribute('aria-hidden','true');
  if(lastSupportTrigger) lastSupportTrigger.focus();
}
supportButtons.forEach(function(button){
  button.addEventListener('click',function(){lastSupportTrigger=this;openSupportModal();});
});
document.getElementById('supportClose').addEventListener('click',closeSupportModal);
supportModal.addEventListener('click',function(e){if(e.target===this)closeSupportModal();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&supportModal.classList.contains('open'))closeSupportModal();});

document.getElementById('btnSupportProject').addEventListener('click',function(){
  window.open('https://buymeacoffee.com/hellowebcode','_blank','noopener');
  closeSupportModal();
});

['sv1','sg1','sv2','sg2'].forEach(function(id){
  document.getElementById(id).addEventListener('input',function(){
    var v=this.value.replace(/[^0-9]/g,'');
    var out='';
    for(var i=0;i<v.length&&i<8;i++){
      if(i===2||i===4||i===6) out+=':';
      out+=v[i];
    }
    this.value=out;
  });
});

function tcToSec(tc,fps){

  if(!tc||tc.trim()==='')return NaN;
  var parts=tc.trim().split(':');
  if(parts.length===1){var n=parseFloat(parts[0]);return isNaN(n)?NaN:n;}
  if(parts.length===4){
    var h=parseInt(parts[0])||0,m=parseInt(parts[1])||0,s=parseInt(parts[2])||0,f=parseInt(parts[3])||0;
    return h*3600+m*60+s+f/(fps||29.97);
  }
  if(parts.length===3){var h=parseInt(parts[0])||0,m=parseInt(parts[1])||0,s=parseFloat(parts[2])||0;return h*3600+m*60+s;}
  return NaN;
}

document.getElementById('syncCalc').addEventListener('click',function(){
  var fps=parseFloat(document.getElementById('fps').value)||29.97;
  var v1=tcToSec(document.getElementById('sv1').value,fps);
  var g1=tcToSec(document.getElementById('sg1').value,fps);
  var v2=tcToSec(document.getElementById('sv2').value,fps);
  var g2=tcToSec(document.getElementById('sg2').value,fps);
  var res=document.getElementById('syncResult');
  var applyBtn=document.getElementById('syncApply');
  if(isNaN(v1)||isNaN(g1)){res.textContent=localizeRuntimeText('Enter event 1 values');res.style.color='var(--danger)';applyBtn.disabled=true;return;}
  // Modell: video = gps * drift + offset. Mit zwei Ereignissen ergibt sich der
  // Faktor aus beiden Differenzen; erst danach laesst sich der Versatz bestimmen.
  // Vorher wurde der Versatz so berechnet, als waere der Faktor 1 - dadurch lag
  // das erste Ereignis daneben, sobald es nicht am Trackanfang lag.
  var drift=1.0;
  if(!isNaN(v2)&&!isNaN(g2)&&g2!==g1){
    drift=Math.round(((v2-v1)/(g2-g1))*100000)/100000;
  }
  var offset=Math.round((v1-drift*g1)*100)/100;
  syncCalcResult={offset:offset,drift:drift};
  var msg=(uiLanguage==='de'?'GPS-Versatz: ':'GPS Offset: ')+offset+'s';
  if(!isNaN(v2)&&!isNaN(g2)&&g2!==g1) msg+=(uiLanguage==='de'?'   Abweichung: ':'   Drift: ')+drift;
  res.textContent=msg; res.style.color='var(--accent)';
  applyBtn.disabled=false;
});

document.getElementById('syncApply').addEventListener('click',function(){
  document.getElementById('offset').value=syncCalcResult.offset;
  document.getElementById('driftFactor').value=syncCalcResult.drift;
  document.getElementById('syncModal').classList.remove('open');
  if(rawPoints.length) reprocess();
  setStatus('Sync applied — offset: '+syncCalcResult.offset+'s, drift: '+syncCalcResult.drift,'ok');
});

// Leinwandgroesse: die Auswahl fuellt die beiden Zahlenfelder, eine Eingabe
// von Hand stellt die Auswahl auf "Custom".
var COMP_DESIGN_W=1920, COMP_DESIGN_H=1080;
function leinwandMass(id,vorgabe){
  var el=document.getElementById(id);
  var n=el?parseInt(el.value,10):NaN;
  if(!isFinite(n)) return vorgabe;
  return Math.max(64,Math.min(16384,Math.round(n)));
}
function leinwandAuswahlAngleichen(){
  var sel=document.getElementById('compPreset');
  if(!sel) return;
  var mass=leinwandMass('compW',COMP_DESIGN_W)+'x'+leinwandMass('compH',COMP_DESIGN_H);
  var treffer=false;
  for(var i=0;i<sel.options.length;i++) if(sel.options[i].value===mass) treffer=true;
  sel.value=treffer?mass:'custom';
}
(function(){
  var sel=document.getElementById('compPreset');
  if(!sel) return;
  sel.addEventListener('change',function(){
    if(this.value==='custom') return;
    var t=this.value.split('x');
    document.getElementById('compW').value=t[0];
    document.getElementById('compH').value=t[1];
    speichereEinstellungen();
  });
  ['compW','compH'].forEach(function(id){
    document.getElementById(id).addEventListener('input',leinwandAuswahlAngleichen);
    document.getElementById(id).addEventListener('change',leinwandAuswahlAngleichen);
  });
  leinwandAuswahlAngleichen();
})();

document.getElementById('resetVideo').addEventListener('click',function(){applyDefaults(DEF_VIDEO);syncUnitOptions();if(rawPoints.length)reprocess();});
document.getElementById('resetRoute').addEventListener('click',function(){applyDefaults(DEF_ROUTE);});
document.getElementById('resetGauge').addEventListener('click',function(){applyDefaults(DEF_GAUGE);positionZuruecksetzen('speed');if(speedData.length)drawGauge();});
document.getElementById('resetHR').addEventListener('click',function(){
  positionZuruecksetzen('hr');
  document.getElementById('hrColor').value='#ef4444';
  document.getElementById('hrHeartColor').value='#ef4444';
  document.getElementById('hrSize').value='0.07';
  if(hrData.length) drawHR();
});
document.getElementById('resetCad').addEventListener('click',function(){
  positionZuruecksetzen('cad');
  document.getElementById('cadColor').value='#a855f7';
  document.getElementById('cadSize').value='0.07';
});
document.getElementById('resetPower').addEventListener('click',function(){
  positionZuruecksetzen('power');
  document.getElementById('powerColor').value='#f59e0b';
  document.getElementById('powerSize').value='0.07';
});
document.getElementById('resetTemp').addEventListener('click',function(){
  positionZuruecksetzen('temp');
  document.getElementById('tempColor').value='#0ea5e9';
  document.getElementById('tempSize').value='0.07';
});
document.getElementById('resetPace').addEventListener('click',function(){
  positionZuruecksetzen('pace');
  document.getElementById('paceColor').value='#14b8a6';
  document.getElementById('paceSize').value='0.07';
});
document.getElementById('resetLap').addEventListener('click',function(){
  positionZuruecksetzen('lap');
  document.getElementById('lapColor').value='#38bdf8';
  document.getElementById('lapSize').value='0.06';
});
['hrColor','hrHeartColor'].forEach(function(id){
  var el=document.getElementById(id);
  if(el) el.addEventListener('input',function(){if(hrData.length) drawHR();});
});

document.getElementById('resetIncline').addEventListener('click',function(){
  positionZuruecksetzen('incline');
  document.getElementById('inclineNumberColor').value='#22c55e';
  document.getElementById('inclineWedgeColor').value='#22c55e';
  document.getElementById('inclineUnit').value='pct';
});

document.getElementById('resetMile').addEventListener('click',function(){
  positionZuruecksetzen('mile');
  document.getElementById('mileColor').value='#38bdf8';
  document.getElementById('mileLineDistColor').value='#111111';
  document.getElementById('mileDecimals').value='1';
});

document.getElementById('resetElev').addEventListener('click',function(){
  positionZuruecksetzen('elev');
  applyDefaults(DEF_ELEV);
});

document.getElementById('elevLabels').addEventListener('change',function(){if(rawPoints.length) drawElev();});
