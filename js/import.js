/* Dateiannahme und die drei Leser: FIT, TCX und GPX. Ergebnis ist rawPoints. */

var dropZone=document.getElementById('dropZone');
var fileInput=document.getElementById('fileInput');
var statusEl=document.getElementById('status');
dropZone.addEventListener('click',function(){fileInput.click();});
dropZone.addEventListener('keydown',function(e){
  if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInput.click();}
});
dropZone.addEventListener('dragover',function(e){e.preventDefault();dropZone.classList.add('drag-over');});
dropZone.addEventListener('dragleave',function(){dropZone.classList.remove('drag-over');});
dropZone.addEventListener('drop',function(e){e.preventDefault();dropZone.classList.remove('drag-over');if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);});
fileInput.addEventListener('change',function(){if(fileInput.files[0])handleFile(fileInput.files[0]);});

['fps','unit','smooth','offset','driftFactor'].forEach(function(id){
  document.getElementById(id).addEventListener('change',function(){if(rawPoints.length)reprocess();});
});

['trackColor','dotColor','shadowColor'].forEach(function(id){
  document.getElementById(id).addEventListener('input',function(){if(rawPoints.length) drawRoute();});
});
['gaugeBgColor','gaugeRingColor','gaugeArcColor','gaugeNumberColor','gaugeUnitColor'].forEach(function(id){
  document.getElementById(id).addEventListener('input',function(){if(speedData.length) drawGauge();});
});
['elevColor','elevFillColor','elevFill','elevDotColor'].forEach(function(id){
  var el=document.getElementById(id);
  if(el) el.addEventListener('input',function(){if(rawPoints.length) drawElev();});
  if(el && el.tagName==='SELECT') el.addEventListener('change',function(){if(rawPoints.length) drawElev();});
});

(function(){
  var feld=document.getElementById('ghostInput'), knopf=document.getElementById('ghostPick'),
      weg=document.getElementById('ghostRemove');
  if(!feld) return;
  knopf.addEventListener('click',function(){ feld.click(); });
  feld.addEventListener('change',function(){ if(feld.files[0]) handleGhostFile(feld.files[0]); feld.value=''; });
  weg.addEventListener('click',entferneGeisterspur);
})();

function setStatus(msg,cls){statusEl.textContent=localizeRuntimeText(msg);statusEl.className='status'+(cls?' '+cls:'');}
function setEnabled(on){btnIds.forEach(function(id){document.getElementById(id).disabled=!on;});
  ['btnDownloadAll','btnDownloadFusion','btnDownloadAe'].forEach(function(id){document.getElementById(id).disabled=!on;});}

var MAX_FILE_BYTES=32*1024*1024;

// Ausgangsbeschriftung der Ablegeflaeche, einmal beim Laden gesichert.
var DROP_LABEL_HTML=null, DROP_SUB_HTML=null;
(function(){
  var l=dropZone&&dropZone.querySelector('.drop-label'), u=dropZone&&dropZone.querySelector('.drop-sub');
  if(l) DROP_LABEL_HTML=l.innerHTML;
  if(u) DROP_SUB_HTML=u.innerHTML;
})();

// Vor jedem Einlesen: alles der vorherigen Aktivitaet verwerfen. Sonst bleiben
// bei einem fehlgeschlagenen Import die alten Daten unter neuem Dateinamen
// exportierbar.
function resetTrackState(){
  rawPoints=[]; speedData=[]; hrData=[]; cadData=[]; powerData=[]; tempData=[];
  paceData=[]; gradeData=[]; distData=[]; lapData=[];
  totalDistM=0; currentFilename=''; lastMapTrackId=null;
  try{ setEnabled(false); }catch(e){}
  var l=dropZone&&dropZone.querySelector('.drop-label'), u=dropZone&&dropZone.querySelector('.drop-sub');
  if(l&&DROP_LABEL_HTML!==null) l.innerHTML=DROP_LABEL_HTML;
  if(u&&DROP_SUB_HTML!==null) u.innerHTML=DROP_SUB_HTML;
}

function handleFile(file){
  var name=file.name.toLowerCase();
  if(!name.endsWith('.gpx')&&!name.endsWith('.fit')&&!name.endsWith('.tcx')){setStatus('Please upload a .gpx, .fit or .tcx file','err');return;}
  if(file.size>MAX_FILE_BYTES){
    setStatus('File too large: '+Math.round(file.size/1048576)+' MB — the limit is '+Math.round(MAX_FILE_BYTES/1048576)+' MB','err');
    return;
  }
  resetTrackState();
  setStatus('Reading '+file.name+'...');
  var reader=new FileReader();
  if(name.endsWith('.fit')){
    reader.onload=function(e){parseFIT(e.target.result,file.name);};
    reader.readAsArrayBuffer(file);
  } else if(name.endsWith('.tcx')){
    reader.onload=function(e){parseTCX(e.target.result,file.name);};
    reader.readAsText(file);
  } else {
    reader.onload=function(e){parseGPX(e.target.result,file.name);};
    reader.readAsText(file);
  }
}

// Die Leser schreiben in rawPoints. Fuer die Geisterspur wird die Hauptspur
// deshalb beiseitegelegt und danach unveraendert zurueckgesetzt - auch wenn das
// Einlesen mittendrin abbricht.
var importZiel='haupt', geistKandidat=null;

function handleGhostFile(file){
  var name=file.name.toLowerCase();
  if(!name.endsWith('.gpx')&&!name.endsWith('.fit')&&!name.endsWith('.tcx')){
    setStatus('Please upload a .gpx, .fit or .tcx file','err'); return;
  }
  if(file.size>MAX_FILE_BYTES){
    setStatus('File too large: '+Math.round(file.size/1048576)+' MB — the limit is '+Math.round(MAX_FILE_BYTES/1048576)+' MB','err');
    return;
  }
  setStatus('Reading '+file.name+'...');
  var reader=new FileReader();
  function lies(inhalt){
    var merk={rawPoints:rawPoints, lapData:lapData, totalDistM:totalDistM, currentFilename:currentFilename};
    importZiel='geist'; geistKandidat=null;
    try{
      if(name.endsWith('.fit')) parseFIT(inhalt,file.name);
      else if(name.endsWith('.tcx')) parseTCX(inhalt,file.name);
      else parseGPX(inhalt,file.name);
    } finally {
      importZiel='haupt';
      rawPoints=merk.rawPoints; lapData=merk.lapData;
      totalDistM=merk.totalDistM; currentFilename=merk.currentFilename;
    }
    if(geistKandidat&&geistKandidat.length>1){
      ghostPoints=geistKandidat;
      ghostFilename=file.name;
      zeigeGeisterspur();
      setStatus('Ghost track loaded: '+ghostPoints.length+' points','ok');
      if(rawPoints.length){ drawRoute(); resetMapPreview(); }
    } else {
      setStatus('No usable track in that file','err');
    }
    geistKandidat=null;
  }
  reader.onload=function(e){ lies(e.target.result); };
  if(name.endsWith('.fit')) reader.readAsArrayBuffer(file); else reader.readAsText(file);
}

function entferneGeisterspur(){
  ghostPoints=[]; ghostFilename='';
  zeigeGeisterspur();
  if(rawPoints.length){ drawRoute(); resetMapPreview(); }
}

function zeigeGeisterspur(){
  var n=document.getElementById('ghostName'), w=document.getElementById('ghostLoaded');
  if(n) n.textContent=ghostFilename;
  if(w) w.style.display=ghostPoints.length?'flex':'none';
}

// Gemeinsamer Abschluss aller drei Leser. Liefert false, wenn der Track als
// Geisterspur eingelesen wurde - dann bleibt die Oberflaeche unberuehrt.
function uebernehmeTrack(name){
  if(importZiel==='geist'){
    geistKandidat=rawPoints.map(function(p){ return {lat:p.lat, lon:p.lon}; });
    return false;
  }
  totalDistM=0;
  currentFilename=name.replace(/\.[^.]+$/,'');
  dropZone.querySelector('.drop-label').textContent=name;
  dropZone.querySelector('.drop-sub').textContent=localizeRuntimeText(rawPoints.length+' track points loaded');
  reprocess();
  return true;
}

var FIT_CRC_TABLE=[0x0000,0xCC01,0xD801,0x1400,0xF001,0x3C00,0x2800,0xE401,
                   0xA001,0x6C00,0x7800,0xB401,0x5000,0x9C01,0x8801,0x4400];
function fitCrc(bytes,from,to){
  var crc=0;
  for(var i=from;i<to;i++){
    var b=bytes[i],t=FIT_CRC_TABLE[crc&0xF];
    crc=(crc>>4)&0x0FFF; crc=crc^t^FIT_CRC_TABLE[b&0xF];
    t=FIT_CRC_TABLE[crc&0xF];
    crc=(crc>>4)&0x0FFF; crc=crc^t^FIT_CRC_TABLE[(b>>4)&0xF];
  }
  return crc;
}

function parseFIT(buffer,name){
  try{
    var bytes=new Uint8Array(buffer),definitions={},points=[],laps=[],lastTimestamp=undefined,truncated=false,breitenfehler=false;
    if(bytes.length<14) throw new Error('file too short to be a FIT file');
    var headerSize=bytes[0];
    if(headerSize!==12&&headerSize!==14) throw new Error('unexpected FIT header size ('+headerSize+')');
    if(String.fromCharCode(bytes[8],bytes[9],bytes[10],bytes[11])!=='.FIT')
      throw new Error('missing .FIT signature — this is not a FIT file');
    var declared=(bytes[4]|(bytes[5]<<8)|(bytes[6]<<16)|(bytes[7]<<24))>>>0;
    var dataEnd=headerSize+declared;
    if(declared===0||dataEnd+2>bytes.length)
      throw new Error('declared data size does not match the file (' + declared + ' bytes)');
    var storedCrc=bytes[dataEnd]|(bytes[dataEnd+1]<<8);
    if(storedCrc!==0&&fitCrc(bytes,0,dataEnd)!==storedCrc)
      throw new Error('checksum mismatch — the file appears to be damaged');
    var pos=headerSize;
    function need(p,n){ if(p+n>dataEnd) throw new Error('record runs past the end of the file'); }
    function u32(p){need(p,4);return (bytes[p]|(bytes[p+1]<<8)|(bytes[p+2]<<16)|(bytes[p+3]<<24))>>>0;}
    function u32be(p){need(p,4);return ((bytes[p]<<24)|(bytes[p+1]<<16)|(bytes[p+2]<<8)|bytes[p+3])>>>0;}
    function u16(p){need(p,2);return bytes[p]|(bytes[p+1]<<8);}
    function u8(p){need(p,1);return bytes[p];}
    // Basistyp -> [Bytebreite, vorzeichenbehaftet, Ungueltigkeitswert]
    var FIT_TYPEN={
      0x00:[1,false,0xFF],       0x01:[1,true,0x7F],        0x02:[1,false,0xFF],
      0x83:[2,true,0x7FFF],      0x84:[2,false,0xFFFF],
      0x85:[4,true,0x7FFFFFFF],  0x86:[4,false,0xFFFFFFFF],
      0x88:[4,false,null],       0x89:[8,false,null],
      0x0A:[1,false,0],          0x8B:[2,false,0],          0x8C:[4,false,0],
      0x0D:[1,false,0xFF]
    };
    function readFields(def){
      var sp=pos,rec={};
      need(sp,def.dataSize);
      var breiten=FIT_FELDBREITEN[def.globalMsgNum];
      for(var f=0;f<def.fields.length;f++){
        var fd=def.fields[f],typ=FIT_TYPEN[fd.bt],val;
        // Ein ausgewertetes Feld mit abweichender Breite ist entweder eine Liste
        // oder falsch deklariert. Beides als Einzelwert zu lesen ergaebe eine
        // stille Falschangabe, deshalb bleibt es unbeachtet.
        if(breiten&&breiten[fd.num]!==undefined&&breiten[fd.num]!==fd.size){
          breitenfehler=true; pos+=fd.size; continue;
        }
        if(fd.size===4)val=fd.arch===0?u32(pos):u32be(pos);
        else if(fd.size===2)val=fd.arch===0?u16(pos):((bytes[pos]<<8)|bytes[pos+1]);
        else if(fd.size===1)val=u8(pos);
        else{pos+=fd.size;continue;}
        // nur wenn Basistyp und Feldgroesse zusammenpassen, sonst bleibt es beim Rohwert
        if(typ&&typ[0]===fd.size&&typ[1]){
          if(fd.size===1&&val>0x7F)val-=0x100;
          else if(fd.size===2&&val>0x7FFF)val-=0x10000;
          else if(fd.size===4&&val>0x7FFFFFFF)val-=0x100000000;
        }
        rec[fd.num]=val; pos+=fd.size;
      }
      pos=sp+def.dataSize; return rec;
    }
    var FIT_EPOCH=631065600;
    // Erwartete Bytebreite der Felder, die ausgewertet werden - Messpunkt (20)
    // und Runde (19).
    var FIT_FELDBREITEN={
      20:{253:4,0:4,1:4,2:2,78:4,3:1,4:1,5:4,6:2,73:4,7:2,13:1},
      19:{253:4,2:4,7:4}
    };
    function tryEmitLap(rec){
      var st=rec[2], en=rec[253], el=rec[7];
      if(st===undefined||st===0xFFFFFFFF) return;
      var startMs=(st+FIT_EPOCH)*1000;
      var elapsed=(el!==undefined&&el!==0xFFFFFFFF)?el/1000:null;
      var endMs=(en!==undefined&&en!==0xFFFFFFFF)?(en+FIT_EPOCH)*1000:null;
      if(endMs===null&&elapsed!==null) endMs=startMs+elapsed*1000;
      if(endMs===null||!(endMs>startMs)) return;
      laps.push({start:startMs,end:endMs,elapsed:elapsed!==null?elapsed:(endMs-startMs)/1000});
    }
    function tryEmit(rec,ts){
      var lat=rec[0],lon=rec[1];
      // Erst die Gueltigkeit pruefen, dann waehlen: Ein ungueltiges Standardfeld
      // darf einen gueltigen Enhanced-Wert nicht verdraengen.
      var altStd=(rec[2]!==undefined&&rec[2]!==0xFFFF)?rec[2]:undefined;
      var altEnh=(rec[78]!==undefined&&rec[78]!==0xFFFFFFFF)?rec[78]:undefined;
      var alt=(altStd!==undefined)?altStd:altEnh;
      var spdStd=(rec[6]!==undefined&&rec[6]!==0xFFFF)?rec[6]:undefined;
      var spdEnh=(rec[73]!==undefined&&rec[73]!==0xFFFFFFFF)?rec[73]:undefined;
      var spd=(spdStd!==undefined)?spdStd:spdEnh;
      var hr=rec[3], cad=rec[4], pwr=rec[7], dst=rec[5], tmp=rec[13];
      if(ts!==undefined&&ts!==0xFFFFFFFF&&lat!==undefined&&lat!==0x7FFFFFFF&&lon!==undefined&&lon!==0x7FFFFFFF){
        var latDeg=(lat|0)*(180/Math.pow(2,31)), lonDeg=(lon|0)*(180/Math.pow(2,31));
        if(!validLatLon(latDeg,lonDeg)) return;
        var eleM=(alt!==undefined&&alt!==0xFFFF&&alt!==0xFFFFFFFF)?(alt/5-500):null;
        if(eleM!==null&&!validElevation(eleM)) eleM=null;
        points.push({time:(ts+FIT_EPOCH)*1000,lat:latDeg,lon:lonDeg,
          ele:eleM,
          speed:(spd!==undefined&&spd!==0xFFFF&&spd!==0xFFFFFFFF)?spd/1000:null,
          hr:(hr!==undefined&&hr!==0xFF&&hr!==0xFFFF)?hr:null,
          cad:(cad!==undefined&&cad!==0xFF)?cad:null,
          power:(pwr!==undefined&&pwr!==0xFFFF&&pwr!==0xFFFFFFFF)?pwr:null,
          dist:(dst!==undefined&&dst!==0xFFFFFFFF)?dst/100:null,
          temp:(tmp!==undefined&&tmp!==0x7F&&tmp>=-100&&tmp<=100)?tmp:null});
      }
    }
    while(pos<dataEnd){
      var h=bytes[pos++];
      if(h&0x80){
        var lt=(h>>5)&0x03,to=h&0x1F,def=definitions[lt];

        if(!def){ truncated=true; break; }
        var rts;
        if(lastTimestamp!==undefined){rts=(lastTimestamp&0xFFFFFFE0)|to;if(rts<lastTimestamp)rts+=32;lastTimestamp=rts;}
        var rec=readFields(def);
        if(def.globalMsgNum===20&&rts!==undefined)tryEmit(rec,rts);
        continue;
      }

      var isDefinition=(h&0x40)!==0, lmn=h&0x0F;
      if(isDefinition){
        // Auch der Definitionssatz darf nicht ueber das Dateiende hinaus gelesen
        // werden; sonst entstehen Felder aus Pruefsummenbytes.
        if(pos+5>dataEnd){ truncated=true; break; }
        pos++;var arch=bytes[pos++];
        var gmn=arch===0?u16(pos):(bytes[pos]<<8)|bytes[pos+1]; pos+=2;
        var nf=bytes[pos++],flds=[],ds=0;
        if(pos+nf*3>dataEnd){ truncated=true; break; }
        for(var f=0;f<nf;f++){var fn=bytes[pos++],fs=bytes[pos++],fb=bytes[pos++];flds.push({num:fn,size:fs,bt:fb,arch:arch});ds+=fs;}
        if(h&0x20){
          if(pos+1>dataEnd){ truncated=true; break; }
          var nd=bytes[pos++];
          if(pos+nd*3>dataEnd){ truncated=true; break; }
          for(var d=0;d<nd;d++){ds+=bytes[pos+1];pos+=3;}
        }
        definitions[lmn]={globalMsgNum:gmn,fields:flds,dataSize:ds,arch:arch};
      } else {
        var def=definitions[lmn];

        if(!def){ truncated=true; break; }
        var rec=readFields(def);
        // Die Referenzzeit fuer komprimierte Kopfbytes stammt laut Protokoll aus
        // jeder Nachricht mit vollem Zeitstempel, nicht nur aus Messpunkten.
        var ts=rec[253];
        if(ts!==undefined&&ts!==0xFFFFFFFF) lastTimestamp=ts;
        if(def.globalMsgNum===20) tryEmit(rec,ts);
        else if(def.globalMsgNum===19) tryEmitLap(rec);
      }
    }
    if(points.length<2){
      setStatus(breitenfehler
        ? 'Some fields in this FIT file are declared with an unexpected size and were skipped'
        : 'No GPS track points found in FIT file','err');
      return;
    }
    points.sort(function(a,b){return a.time-b.time;});
    rawPoints=points;
    laps.sort(function(a,b){return a.start-b.start;});
    lapData=laps;
    if(uebernehmeTrack(name)){
      if(truncated) setStatus('File could not be read to the end — only '+rawPoints.length+' track points were used','err');
      else if(breitenfehler) setStatus('Some fields in this FIT file are declared with an unexpected size and were skipped','err');
      jumpToSettings();
    }
  }catch(e){console.error(e);setStatus('FIT parse error: '+e.message,'err');}
}

function getSpeedFromPoint(pt){
  var kids=pt.childNodes;
  for(var i=0;i<kids.length;i++){if(kids[i].localName==='speed'){var v=parseFloat(kids[i].textContent);if(isFinite(v)&&v>=0&&v<=200)return v;}}
  for(var i=0;i<kids.length;i++){
    if(kids[i].localName==='extensions'){
      var all=kids[i].getElementsByTagName('*');
      for(var j=0;j<all.length;j++){
        if(all[j].localName.toLowerCase()==='speed'){var v=parseFloat(all[j].textContent);if(isFinite(v)&&v>=0&&v<=200)return v;}
      }
    }
  }
  return null;
}

function getExtNumber(pt,names,lo,hi){
  var kids=pt.childNodes;
  for(var i=0;i<kids.length;i++){
    if(kids[i].localName==='extensions'){
      var all=kids[i].getElementsByTagName('*');
      for(var j=0;j<all.length;j++){
        if(names.indexOf(all[j].localName.toLowerCase())>=0){
          var v=parseFloat(all[j].textContent);
          if(!isNaN(v)&&isFinite(v)&&v>=lo&&v<=hi) return v;
        }
      }
    }
  }
  return null;
}

function tcxKind(el,name){
  var all=el.getElementsByTagName('*');
  for(var i=0;i<all.length;i++) if(all[i].localName===name) return all[i];
  return null;
}
function tcxZahl(el,name,lo,hi){
  var k=tcxKind(el,name);
  if(!k) return null;
  var v=parseFloat(k.textContent);
  return (!isNaN(v)&&isFinite(v)&&v>=lo&&v<=hi)?v:null;
}

function parseTCX(text,name){
  try{
    var parser=new DOMParser(),doc=parser.parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror')){setStatus('XML error in TCX file','err');return;}
    var alle=doc.getElementsByTagName('*'), punkte=[], runden=[];
    for(var i=0;i<alle.length;i++){
      if(alle[i].localName==='Trackpoint') punkte.push(alle[i]);
      else if(alle[i].localName==='Lap') runden.push(alle[i]);
    }
    if(!punkte.length){setStatus('No track points found','err');return;}
    rawPoints=[];
    var uebersprungen=0;
    for(var i=0;i<punkte.length;i++){
      var pt=punkte[i];
      var zeitEl=tcxKind(pt,'Time');
      var t=zeitEl?new Date(zeitEl.textContent).getTime():null;
      var pos=tcxKind(pt,'Position');
      var lat=pos?tcxZahl(pos,'LatitudeDegrees',-90,90):null;
      var lon=pos?tcxZahl(pos,'LongitudeDegrees',-180,180):null;
      if(!(t&&isFinite(t))||lat===null||lon===null||!validLatLon(lat,lon)){uebersprungen++;continue;}
      var ele=tcxZahl(pt,'AltitudeMeters',-500,20000);
      var hrEl=tcxKind(pt,'HeartRateBpm');
      rawPoints.push({time:t,lat:lat,lon:lon,
        ele:(ele!==null&&validElevation(ele))?ele:null,
        speed:tcxZahl(pt,'Speed',0,200),
        hr:hrEl?tcxZahl(hrEl,'Value',1,255):null,
        cad:tcxZahl(pt,'Cadence',0,254),
        power:tcxZahl(pt,'Watts',0,3000),
        dist:tcxZahl(pt,'DistanceMeters',0,1e7),
        temp:null});
    }
    rawPoints.sort(function(a,b){return a.time-b.time;});
    if(rawPoints.length<2){setStatus('Not enough valid points','err');return;}
    lapData=[];
    for(var i=0;i<runden.length;i++){
      var st=Date.parse(runden[i].getAttribute('StartTime')||'');
      var dauer=tcxZahl(runden[i],'TotalTimeSeconds',0,864000);
      if(!isFinite(st)||dauer===null||!(dauer>0)) continue;
      lapData.push({start:st,end:st+dauer*1000,elapsed:dauer});
    }
    lapData.sort(function(a,b){return a.start-b.start;});
    if(uebersprungen)console.warn('Activity Layers: '+uebersprungen+' track point(s) skipped, coordinates out of range or not finite');
    if(uebernehmeTrack(name)) jumpToSettings();
  }catch(e){console.error(e);setStatus('Error: '+e.message,'err');}
}

function parseGPX(text,name){
  try{
    var parser=new DOMParser(),doc=parser.parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror')){setStatus('XML error in GPX file','err');return;}
    var trkpts=doc.querySelectorAll('trkpt');
    if(!trkpts.length){setStatus('No track points found','err');return;}
    rawPoints=[];
    var skipped=0;
    for(var i=0;i<trkpts.length;i++){
      var pt=trkpts[i],timeEl=pt.querySelector('time'),eleEl=pt.querySelector('ele');
      var lat=parseFloat(pt.getAttribute('lat')),lon=parseFloat(pt.getAttribute('lon'));
      var t=timeEl?new Date(timeEl.textContent).getTime():null;
      if(t&&isFinite(t)&&validLatLon(lat,lon)){
        var ele=eleEl?parseFloat(eleEl.textContent):null;
        rawPoints.push({time:t,lat:lat,lon:lon,ele:(ele!==null&&validElevation(ele))?ele:null,speed:getSpeedFromPoint(pt),
          hr:getExtNumber(pt,['hr','heartrate'],1,255),
          cad:getExtNumber(pt,['cad','cadence'],0,254),
          power:getExtNumber(pt,['power','pwr'],0,3000),
          temp:getExtNumber(pt,['atemp','temperature'],-100,100),
          dist:null});
      } else skipped++;
    }
    rawPoints.sort(function(a,b){return a.time-b.time;});
    lapData=[];
    if(rawPoints.length<2){setStatus('Not enough valid points','err');return;}
    if(skipped)console.warn('Activity Layers: '+skipped+' track point(s) skipped, coordinates out of range or not finite');
    if(uebernehmeTrack(name)) jumpToSettings();
  }catch(e){console.error(e);setStatus('Error: '+e.message,'err');}
}

// Math.min.apply reicht das ganze Array als Argumentliste weiter und wirft bei
// grossen Tracks einen RangeError. Schleife statt Argumentliste.
function minOf(arr){ var m=Infinity; for(var i=0;i<arr.length;i++) if(arr[i]<m) m=arr[i]; return m; }
function maxOf(arr){ var m=-Infinity; for(var i=0;i<arr.length;i++) if(arr[i]>m) m=arr[i]; return m; }

function zahlOderVorgabe(v,vorgabe){ var n=parseFloat(v); return isFinite(n)?n:vorgabe; }

function validElevation(e){
  return typeof e==='number'&&isFinite(e)&&e>=-500&&e<=20000;
}

function validLatLon(lat,lon){
  return typeof lat==='number'&&typeof lon==='number'&&isFinite(lat)&&isFinite(lon)
      && lat>=-90&&lat<=90&&lon>=-180&&lon<=180;
}
