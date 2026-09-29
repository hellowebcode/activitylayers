/* Video: dieselben Overlays noch einmal, diesmal als Bilder auf einer Leinwand.

   Gedacht fuer alle, die weder Resolve noch After Effects haben. Die Aufnahme
   laeuft im Browser des Nutzers, die Aufzeichnung bleibt auf seinem Geraet.

   Gezeichnet wird im Entwurfsmass 1920x1080 und mit demselben Faktor auf die
   Leinwand gelegt wie in After Effects - sonst saesse dasselbe Overlay im Video
   woanders als in der exportierten Ebene. */

var VIDEO_FORMATE={
  webm:{ mime:'video/webm;codecs=vp9', endung:'webm', hintergrund:null },
  mp4: { mime:'video/mp4;codecs=avc1.640028', endung:'mp4', hintergrund:'#00b140' }
};

function vFaktor(c){ return Math.min(c.W/ENTWURF_W, c.H/ENTWURF_H); }
function vPunkt(c,x,y){ var k=vFaktor(c); return [x*k, c.H-(ENTWURF_H-y)*k]; }
function vMass(c,n){ return n*vFaktor(c); }

function vSchrift(ctx, groesse, farbe, mittig){
  ctx.font='700 '+groesse+'px Inter, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle=farbe;
  ctx.textAlign=mittig?'center':'left';
  ctx.textBaseline='alphabetic';
}

function vText(ctx, text, ort, groesse, farbe, mittig){
  vSchrift(ctx, groesse, farbe, mittig);
  ctx.fillText(text, ort[0], ort[1]);
}

function vBogen(ctx, mx, my, r, vonGrad, bisGrad, farbe, breite){
  if(bisGrad<=vonGrad) return;
  ctx.beginPath();
  ctx.arc(mx, my, r, vonGrad*Math.PI/180, bisGrad*Math.PI/180);
  ctx.strokeStyle=farbe; ctx.lineWidth=breite; ctx.lineCap='butt';
  ctx.stroke();
}

function vLinienzug(ctx, punkte, farbe, breite, deckkraft){
  if(!punkte||punkte.length<2) return;
  ctx.save();
  if(deckkraft!==undefined) ctx.globalAlpha=deckkraft;
  ctx.beginPath();
  for(var i=0;i<punkte.length;i++){
    if(i===0) ctx.moveTo(punkte[i][0], punkte[i][1]);
    else ctx.lineTo(punkte[i][0], punkte[i][1]);
  }
  ctx.strokeStyle=farbe; ctx.lineWidth=breite;
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.stroke();
  ctx.restore();
}

/* ---------- Zeit ---------- */

// Videozeit in einen Zeitstempel der Aufzeichnung umrechnen. Das Modell ist
// dasselbe wie bei den Keyframes: video = aufnahme * faktor + versatz.
function videoZuAufnahme(c, sek){
  var drift=driftWert(c.driftFactor), versatz=parseFloat(c.offset)||0;
  return +rawPoints[0].time + ((sek-versatz)/drift)*1000;
}

// Von wann bis wann liegt die Aufzeichnung im Video? Alles davor und danach
// braucht niemand aufzunehmen.
function videoZeitspanne(c){
  if(!rawPoints.length) return null;
  var drift=driftWert(c.driftFactor), versatz=parseFloat(c.offset)||0;
  var dauer=(rawPoints[rawPoints.length-1].time-rawPoints[0].time)/1000;
  var von=Math.max(0, versatz), bis=dauer*drift+versatz;
  if(!(bis>von)) return null;
  return { von:von, bis:bis };
}

// Wert einer Reihe zu einem Zeitpunkt. Zwischen zwei Messwerten wird linear
// gemischt; klafft eine Aufnahmepause dazwischen, wird der fruehere gehalten.
var VIDEO_HALTE_SEK=5;
function wertBei(reihe, feld, ts){
  if(!reihe||!reihe.length) return null;
  if(ts<=+reihe[0].time) return reihe[0][feld];
  var letzte=reihe.length-1;
  if(ts>=+reihe[letzte].time) return reihe[letzte][feld];
  var lo=0, hi=letzte;
  while(hi-lo>1){ var m=(lo+hi)>>1; if(+reihe[m].time<=ts) lo=m; else hi=m; }
  var a=reihe[lo], b=reihe[hi];
  var dt=(+b.time-+a.time)/1000;
  if(!(dt>0) || dt>VIDEO_HALTE_SEK) return a[feld];
  var q=(ts-+a.time)/(+b.time-+a.time);
  return a[feld]+(b[feld]-a[feld])*q;
}

// Stelle im Punktefeld zu einem Zeitpunkt, als Bruchteil des Index.
function indexBei(pts, ts){
  if(!pts.length) return 0;
  if(ts<=+pts[0].time) return 0;
  var letzte=pts.length-1;
  if(ts>=+pts[letzte].time) return letzte;
  var lo=0, hi=letzte;
  while(hi-lo>1){ var m=(lo+hi)>>1; if(+pts[m].time<=ts) lo=m; else hi=m; }
  if(istGrenze(pts[lo],pts[hi])) return lo;
  var q=(ts-+pts[lo].time)/(+pts[hi].time-+pts[lo].time);
  return lo+q;
}

function zwischenPunkt(liste, idx){
  var i=Math.floor(idx), j=Math.min(liste.length-1, i+1), q=idx-i;
  return [liste[i][0]+(liste[j][0]-liste[i][0])*q,
          liste[i][1]+(liste[j][1]-liste[i][1])*q];
}

/* ---------- Die einzelnen Overlays ---------- */

function vTacho(ctx, c, ts){
  var maxSpd=parseFloat(c.maxSpeed)||9;
  var wert=Math.min(wertBei(speedData,'spd',ts)||0, maxSpd);
  var CX=320, CY=760, DISC=200, R=148, SPAN=86.111, OFF=205;
  var vs=ankerVersatz(c,'speed',OVERLAY_MASSE.speed,CX,CY); CX+=vs.dx; CY+=vs.dy;
  var m=vPunkt(c,CX,CY);
  ctx.beginPath(); ctx.arc(m[0],m[1],vMass(c,DISC),0,Math.PI*2);
  ctx.fillStyle=c.gaugeBgColor; ctx.fill();
  var start=-90+OFF;
  vBogen(ctx,m[0],m[1],vMass(c,R),start,start+SPAN/100*360,c.gaugeRingColor,vMass(c,20));
  vBogen(ctx,m[0],m[1],vMass(c,R),start,start+wert/maxSpd*SPAN/100*360,c.gaugeArcColor,vMass(c,24));
  vText(ctx, wert.toFixed(1), vPunkt(c,CX,CY+18), vMass(c,76), c.gaugeNumberColor, true);
  vText(ctx, unitDisplay(c.unit), vPunkt(c,CX,CY+78), vMass(c,30), c.gaugeUnitColor, true);
}

function vStrecke(ctx, c, ts){
  var spuren=aeRoutePoints(c,90);
  var pts=spuren.track;
  if(pts.length<2) return;
  var tW=vMass(c,parseFloat(c.trackW)||4);
  var dR=vMass(c,parseFloat(c.dotR)||8);
  var sOf=vMass(c,zahlOderVorgabe(c.shadowOffset,5));
  var laeufe=segmentLaeufe(rawPoints);
  function stueck(von,bis){ return pts.slice(von,bis); }
  if(spuren.ghost.length>1){
    var gA=Math.max(0.05,Math.min(1,zahlOderVorgabe(c.ghostAlpha,0.55)));
    var gl=segmentLaeufe(ghostPoints);
    for(var g=0;g<gl.length;g++)
      vLinienzug(ctx, spuren.ghost.slice(gl[g][0],gl[g][1]),
                 c.ghostColor||'#8892a4', vMass(c,parseFloat(c.ghostW)||4), gA);
  }
  var l;
  if(sOf>0) for(l=0;l<laeufe.length;l++){
    ctx.save(); ctx.translate(sOf,sOf);
    vLinienzug(ctx, stueck(laeufe[l][0],laeufe[l][1]), c.shadowColor, tW*SHADOW_WIDTH_RATIO, 0.55);
    ctx.restore();
  }
  for(l=0;l<laeufe.length;l++)
    vLinienzug(ctx, stueck(laeufe[l][0],laeufe[l][1]), c.trackColor, tW);
  var p=zwischenPunkt(pts, indexBei(rawPoints, ts));
  if(sOf>0){
    ctx.beginPath(); ctx.arc(p[0]+sOf,p[1]+sOf,dR*1.15,0,Math.PI*2);
    ctx.fillStyle=c.shadowColor; ctx.globalAlpha=0.55; ctx.fill(); ctx.globalAlpha=1;
  }
  ctx.beginPath(); ctx.arc(p[0],p[1],dR,0,Math.PI*2);
  ctx.fillStyle=c.dotColor; ctx.fill();
}

function vHerzfrequenz(ctx, c, ts){
  var wert=wertBei(hrData,'hr',ts);
  if(wert===null) return;
  var sizeE=(parseFloat(c.hrSize)||0.07)*ENTWURF_H;
  var HX=250, HY=880;
  var vs=ankerVersatz(c,'hr',OVERLAY_MASSE.hr,HX,HY); HX+=vs.dx; HY+=vs.dy;
  var sE=sizeE/22;
  ctx.beginPath();
  for(var t=0;t<Math.PI*2+0.001;t+=Math.PI/36){
    var x=16*Math.pow(Math.sin(t),3);
    var y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
    var p=vPunkt(c, HX+x*sE, HY-y*sE);
    if(t===0) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]);
  }
  ctx.closePath(); ctx.fillStyle=c.hrHeartColor; ctx.fill();
  var farbe=c.hrColor;
  if(c.hrZones){
    var g2=zahlOderVorgabe(c.hrZone2,140), g3=zahlOderVorgabe(c.hrZone3,165);
    farbe=(wert>=Math.max(g2,g3))?c.hrColor3:((wert>=Math.min(g2,g3))?c.hrColor2:c.hrColor);
  }
  vText(ctx, String(Math.round(wert)), vPunkt(c, HX+sizeE*1.2, HY+sizeE*0.4),
        vMass(c,sizeE), farbe, false);
}

function vSteigung(ctx, c, ts){
  var pct=wertBei(gradeData,'pct',ts);
  if(pct===null) return;
  var BX=260, BY=880;
  var vs=ankerVersatz(c,'incline',OVERLAY_MASSE.incline,BX,BY); BX+=vs.dx; BY+=vs.dy;
  var m=vPunkt(c,BX,BY), w=-Math.atan(pct/100);
  ctx.save();
  ctx.translate(m[0],m[1]); ctx.rotate(w);
  ctx.beginPath();
  ctx.rect(vMass(c,-90), 0, vMass(c,180), vMass(c,16));
  ctx.fillStyle=c.inclineWedgeColor; ctx.fill();
  ctx.restore();
  var text=(c.inclineUnit==='deg')
    ? (Math.atan(pct/100)*180/Math.PI).toFixed(1)+'°'
    : pct.toFixed(1)+'%';
  vText(ctx, text, vPunkt(c,BX,BY-70), vMass(c,84), c.inclineNumberColor, true);
}

function vDistanz(ctx, c, ts){
  var m3=wertBei(distData,'distM',ts);
  if(m3===null) return;
  var mph=(c.unit==='mph');
  var dec=parseInt(c.mileDecimals,10)||1;
  var MX=260, MY=880;
  var vs=ankerVersatz(c,'mile',OVERLAY_MASSE.mile,MX,MY); MX+=vs.dx; MY+=vs.dy;
  vText(ctx,(m3/(mph?1609.344:1000)).toFixed(dec), vPunkt(c,MX,MY), vMass(c,88), c.mileColor, true);
  vText(ctx, mph?'mi':'km', vPunkt(c,MX,MY+54), vMass(c,34), c.mileLineDistColor, true);
}

// Die vier reinen Zahlenoverlays teilen sich Lage und Aufbau.
function vZahlOverlay(schluessel, groesseFeld, vorgabe, reihe, feld, formatiere){
  return function(ctx, c, ts){
    var wert=wertBei(reihe(), feld, ts);
    if(wert===null) return;
    var vs=ankerVersatz(c, schluessel, OVERLAY_MASSE.text, 250, 880);
    var size=(parseFloat(c[groesseFeld])||vorgabe)*ENTWURF_H;
    vText(ctx, formatiere(wert, c), vPunkt(c, 250+vs.dx, 880+vs.dy),
          vMass(c,size), c[schluessel+'Color'], false);
  };
}

function vLeistung(ctx, c, ts){
  var wert=wertBei(powerData,'power',ts);
  if(wert===null) return;
  var vs=ankerVersatz(c,'power',OVERLAY_MASSE.text,250,880);
  var size=(parseFloat(c.powerSize)||0.07)*ENTWURF_H;
  var farbe=c.powerColor;
  if(c.powerZones){
    var g2=zahlOderVorgabe(c.powerZone2,200), g3=zahlOderVorgabe(c.powerZone3,280);
    farbe=(wert>=Math.max(g2,g3))?c.powerColor3:((wert>=Math.min(g2,g3))?c.powerColor2:c.powerColor);
  }
  vText(ctx, Math.round(wert)+' '+overlayLabels().power,
        vPunkt(c,250+vs.dx,880+vs.dy), vMass(c,size), farbe, false);
}

function vRunde(ctx, c, ts){
  if(!lapData.length) return;
  var nr=0, seit=0;
  for(var i=0;i<lapData.length;i++){
    if(ts>=+lapData[i].start){ nr=i+1; seit=(Math.min(ts,+lapData[i].end)-+lapData[i].start)/1000; }
  }
  if(!nr) return;
  var vs=ankerVersatz(c,'lap',OVERLAY_MASSE.text,250,880);
  var size=(parseFloat(c.lapSize)||0.06)*ENTWURF_H;
  var mm=Math.floor(seit/60), ss=Math.floor(seit%60);
  vText(ctx, overlayLabels().lap+' '+nr+'   '+mm+':'+(ss<10?'0':'')+ss,
        vPunkt(c,250+vs.dx,880+vs.dy), vMass(c,size), c.lapColor, false);
}

function vHoehe(ctx, c, ts){
  var elevPts=rawPoints.filter(function(p){return p.ele!==null && !isNaN(p.ele);});
  if(elevPts.length<2) return;
  var k=vFaktor(c);
  var iW=Math.min(c.W, parseFloat(c.elevW)||c.W);
  var iH=Math.min(c.H, parseFloat(c.elevH)||300);
  var massElev={b:iW/k, h:iH/k};
  var linksX=ANKER_RAND+massElev.b/2, untenY=ENTWURF_H-120-massElev.h/2;
  var vs=ankerVersatz(c,'elev',massElev,linksX,untenY);
  var vdx=(linksX+vs.dx)-ENTWURF_W/2, vdy=(untenY+vs.dy)-untenY;
  var ox=(c.W-iW)/2+vdx*k, oy=c.H-iH-120*k+vdy*k;
  var xy=buildElevXY(elevPts,iW,iH,0);
  var pts=[],i;
  for(i=0;i<xy.xs.length;i++) pts.push([ox+xy.xs[i], oy+xy.ys[i]]);
  if(c.elevFill==='1'){
    ctx.beginPath();
    ctx.moveTo(pts[0][0],pts[0][1]);
    for(i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.lineTo(pts[pts.length-1][0], oy+iH);
    ctx.lineTo(pts[0][0], oy+iH);
    ctx.closePath();
    ctx.fillStyle=c.elevFillColor; ctx.globalAlpha=0.35; ctx.fill(); ctx.globalAlpha=1;
  }
  var lw=vMass(c,parseFloat(c.elevLineW)||2);
  var so=vMass(c,zahlOderVorgabe(c.elevShadowOffset,4));
  if(so>0){
    ctx.save(); ctx.translate(so,so);
    vLinienzug(ctx, pts, c.elevShadowColor, lw, 0.55);
    ctx.restore();
  }
  vLinienzug(ctx, pts, c.elevColor, lw);
  var p=zwischenPunkt(pts, indexBei(elevPts, ts));
  ctx.beginPath(); ctx.arc(p[0],p[1],lw*3,0,Math.PI*2);
  ctx.fillStyle=c.elevDotColor; ctx.fill();
}

function vScheibe(ctx, c, ts){
  var k=vFaktor(c);
  var dE=Math.max(0.08, Math.min(1, zahlOderVorgabe(c.discSize,0.34)))*ENTWURF_H;
  var D=dE*k, R=D/2;
  var altX=ANKER_RAND+dE/2, altY=ENTWURF_H-ANKER_RAND-dE/2;
  var vs=ankerVersatz(c,'disc',{b:dE,h:dE},altX,altY);
  var m=vPunkt(c, altX+vs.dx, altY+vs.dy);
  var bgA=Math.max(0,Math.min(1,zahlOderVorgabe(c.discBgAlpha,0.45)));
  ctx.beginPath(); ctx.arc(m[0],m[1],R,0,Math.PI*2);
  ctx.fillStyle=c.discBgColor||'#000000'; ctx.globalAlpha=bgA; ctx.fill(); ctx.globalAlpha=1;
  if(c.discRing==='1'){
    ctx.beginPath(); ctx.arc(m[0],m[1],R-vMass(c,parseFloat(c.discRingW)||3)/2,0,Math.PI*2);
    ctx.strokeStyle=c.discRingColor||'#ffffff';
    ctx.lineWidth=vMass(c,parseFloat(c.discRingW)||3); ctx.stroke();
  }
  var ein=kreisEinpassung(D, vMass(c,12));
  if(!ein) return;
  function auf(i){ var v=ein(i); return [m[0]+v.x, m[1]+v.y]; }
  var alle=[], i;
  for(i=0;i<rawPoints.length;i++) alle.push(auf(i));
  var laeufe=segmentLaeufe(rawPoints), l;
  var tW=vMass(c,parseFloat(c.discTrackW)||3);
  var so=vMass(c,zahlOderVorgabe(c.discShadowOffset,3));
  if(so>0) for(l=0;l<laeufe.length;l++){
    ctx.save(); ctx.translate(so,so);
    vLinienzug(ctx, alle.slice(laeufe[l][0],laeufe[l][1]), c.discShadowColor||'#000000', tW*SHADOW_WIDTH_RATIO, 0.55);
    ctx.restore();
  }
  for(l=0;l<laeufe.length;l++)
    vLinienzug(ctx, alle.slice(laeufe[l][0],laeufe[l][1]), c.discTrackColor||'#ff6600', tW);
  if(c.discProgress==='1' && distData.length){
    var anteil=(wertBei(distData,'distM',ts)||0)/(totalDistM||1);
    vBogen(ctx,m[0],m[1],R-vMass(c,parseFloat(c.discProgressW)||5)/2,-90,-90+Math.max(0,Math.min(1,anteil))*360,
           c.discProgressColor||'#ff6600', vMass(c,parseFloat(c.discProgressW)||5));
  }
  var p=zwischenPunkt(alle, indexBei(rawPoints, ts));
  var dR=vMass(c,parseFloat(c.discDotR)||6);
  ctx.beginPath(); ctx.arc(p[0],p[1],dR,0,Math.PI*2);
  ctx.fillStyle=c.discDotColor||'#fca300'; ctx.fill();
}

function vKompass(ctx, c, ts){
  if(!headingData.length) return;
  var k=vFaktor(c);
  var dE=Math.max(0.10, Math.min(1, zahlOderVorgabe(c.compassSize,0.30)))*ENTWURF_H;
  var D=dE*k, R=D/2;
  var altX=ANKER_RAND+dE/2, altY=ENTWURF_H-ANKER_RAND-dE/2;
  var vs=ankerVersatz(c,'compass',{b:dE,h:dE},altX,altY);
  var m=vPunkt(c, altX+vs.dx, altY+vs.dy), mx=m[0], my=m[1];
  var strich=vMass(c,parseFloat(c.compassTickW)||3);
  var pegel=vMass(c,parseFloat(c.compassLevelW)||6);
  var maxSpd=parseFloat(c.maxSpeed)||9;
  var tempo=Math.min(wertBei(speedData,'spd',ts)||0, maxSpd);
  var grad=wertBei(stetigerWinkel(headingData),'deg',ts)||0;
  function aufKreis(g,r){ var a=(g-90)*Math.PI/180; return [mx+Math.cos(a)*r, my+Math.sin(a)*r]; }
  for(var t=0;t<16;t++){
    var g=t*22.5, haupt=(g===0);
    var a=aufKreis(g,R), b=aufKreis(g,R-(haupt?R*0.22:R*0.13));
    vLinienzug(ctx,[a,b], c.compassScaleColor||'#ffffff', strich);
  }
  var np=aufKreis(0, R-R*0.38);
  vText(ctx,'N',[np[0],np[1]+R*0.09], R*0.26, c.compassScaleColor||'#ffffff', true);
  vBogen(ctx,mx,my,R-pegel/2,-90,-90+(tempo/maxSpd)*360, c.compassLevelColor||'#3b82f6', pegel);
  ctx.save();
  ctx.translate(mx,my); ctx.rotate(grad*Math.PI/180);
  ctx.beginPath();
  ctx.moveTo(0,-R*0.62); ctx.lineTo(R*0.17,R*0.2); ctx.lineTo(0,R*0.08); ctx.lineTo(-R*0.17,R*0.2);
  ctx.closePath();
  ctx.fillStyle=c.compassArrowColor||'#e2564a'; ctx.fill();
  ctx.restore();
  vText(ctx, tempo.toFixed(1), [mx+R*0.46, my+R*0.5], R*0.2, c.compassTextColor||'#ffffff', true);
  vText(ctx, unitDisplay(c.unit), [mx+R*0.46, my+R*0.72], R*0.12, c.compassTextColor||'#ffffff', true);
}

/* ---------- Der Katalog ---------- */

var VIDEO_OVERLAYS=[
  {id:'speed',   name:'Speedometer',         datei:'Speed_Overlay',       hat:function(){return speedData.length;},  zeichne:vTacho},
  {id:'route',   name:'Route Overlay',       datei:'Route_Overlay',       hat:function(){return hatZeichenbarenLauf(rawPoints);}, zeichne:vStrecke},
  {id:'disc',    name:'Route Disc Overlay',  datei:'Route_Disc_Overlay',  hat:function(){return hatZeichenbarenLauf(rawPoints);}, zeichne:vScheibe},
  {id:'compass', name:'Compass Overlay',     datei:'Compass_Overlay',     hat:function(){return headingData.length;}, zeichne:vKompass},
  {id:'elev',    name:'Elevation Overlay',   datei:'Elevation_Overlay',   hat:function(){return rawPoints.filter(function(p){return p.ele!==null&&!isNaN(p.ele);}).length>1;}, zeichne:vHoehe},
  {id:'hr',      name:'HR Overlay',          datei:'HR_Overlay',          hat:function(){return hrData.length;},     zeichne:vHerzfrequenz},
  {id:'incline', name:'Incline Overlay',     datei:'Incline_Overlay',     hat:function(){return gradeData.length;},  zeichne:vSteigung},
  {id:'mile',    name:'Mile Marker Overlay', datei:'Mile_Marker_Overlay', hat:function(){return distData.length;},   zeichne:vDistanz},
  {id:'cad',     name:'Cadence Overlay',     datei:'Cadence_Overlay',     hat:function(){return cadData.length;},
   zeichne:vZahlOverlay('cad','cadSize',0.07,function(){return cadData;},'cad',
     function(v){ return Math.round(v)+' '+overlayLabels().cad; })},
  {id:'power',   name:'Power Overlay',       datei:'Power_Overlay',       hat:function(){return powerData.length;},  zeichne:vLeistung},
  {id:'temp',    name:'Temperature Overlay', datei:'Temperature_Overlay', hat:function(){return tempData.length;},
   zeichne:vZahlOverlay('temp','tempSize',0.07,function(){return tempData;},'temp',
     function(v){ return Math.round(v)+' '+overlayLabels().temp; })},
  {id:'pace',    name:'Pace Overlay',        datei:'Pace_Overlay',        hat:function(){return paceData.length;},
   zeichne:vZahlOverlay('pace','paceSize',0.07,function(){return paceData;},'sec',
     function(v,c){ var s=Math.round(v); return Math.floor(s/60)+':'+((s%60)<10?'0':'')+(s%60)+(c.unit==='mph'?'/mi':'/km'); })},
  {id:'lap',     name:'Lap Marker Overlay',  datei:'Lap_Marker_Overlay',  hat:function(){return lapData.length;},    zeichne:vRunde}
];

function videoOverlay(id){
  for(var i=0;i<VIDEO_OVERLAYS.length;i++) if(VIDEO_OVERLAYS[i].id===id) return VIDEO_OVERLAYS[i];
  return null;
}

/* ---------- Aufnahme ---------- */

// Aufgenommen wird in Echtzeit: Der Browser stempelt die Bilder nach der Uhr,
// schnelleres Zufuettern ergaebe eine Datei, die zu schnell abspielt. Deshalb
// gibt es den Ausschnitt - meistens braucht niemand die ganze Fahrt.
var videoLaeuft=false, videoAbbrechen=false;

function videoAufnahme(overlayId, formatId, vonSek, bisSek, melde){
  return new Promise(function(fertig, fehler){
    var art=videoOverlay(overlayId), fmt=VIDEO_FORMATE[formatId];
    if(!art||!fmt){ fehler(new Error('unknown format')); return; }
    var c=cfg();
    if(!art.hat()){ fehler(new Error('no data')); return; }
    if(typeof MediaRecorder==='undefined' || !MediaRecorder.isTypeSupported(fmt.mime)){
      fehler(new Error('unsupported')); return;
    }
    var fps=Math.max(1, Math.min(60, parseFloat(c.fps)||30));
    var leinwand=document.createElement('canvas');
    leinwand.width=c.W; leinwand.height=c.H;
    var ctx=leinwand.getContext('2d',{alpha:true});
    var strom=leinwand.captureStream(fps);
    var mr=new MediaRecorder(strom,{mimeType:fmt.mime, videoBitsPerSecond:16e6});
    var teile=[];
    mr.ondataavailable=function(e){ if(e.data&&e.data.size) teile.push(e.data); };
    mr.onerror=function(e){ laeuft=false; fehler(e.error||new Error('recorder')); };
    var laeuft=true, t0=0;
    mr.onstop=function(){
      strom.getTracks().forEach(function(s){ s.stop(); });
      fertig(new Blob(teile,{type:fmt.mime.split(';')[0]}));
    };
    function bild(){
      if(!laeuft) return;
      var jetzt=(performance.now()-t0)/1000;
      var sek=vonSek+jetzt;
      if(sek>=bisSek || videoAbbrechen){
        laeuft=false;
        setTimeout(function(){ if(mr.state!=='inactive') mr.stop(); }, 120);
        return;
      }
      ctx.clearRect(0,0,c.W,c.H);
      if(fmt.hintergrund){ ctx.fillStyle=fmt.hintergrund; ctx.fillRect(0,0,c.W,c.H); }
      try{ art.zeichne(ctx, c, videoZuAufnahme(c, sek)); }catch(e){}
      if(melde) melde((sek-vonSek)/(bisSek-vonSek));
      requestAnimationFrame(bild);
    }
    videoAbbrechen=false;
    t0=performance.now();
    mr.start();
    requestAnimationFrame(bild);
  });
}

/* ---------- Bedienung ---------- */

function videoFortschritt(anteil, text){
  var wrap=document.getElementById('videoProgressWrap');
  var fill=document.getElementById('videoProgressFill');
  var label=document.getElementById('videoProgressLabel');
  if(!wrap) return;
  wrap.style.display=(anteil===null)?'none':'block';
  if(fill) fill.style.width=Math.max(0,Math.min(100,(anteil||0)*100))+'%';
  if(label&&text) label.textContent=localizeRuntimeText(text);
}

function videoSpanneAnzeigen(){
  var hin=document.getElementById('videoSpanne');
  if(!hin) return;
  var s=rawPoints.length?videoZeitspanne(cfg()):null;
  hin.textContent=s
    ? localizeRuntimeText('Recording sits between '+Math.round(s.von)+' and '+Math.round(s.bis)+' seconds of the video')
    : ' ';
}

function videoAuswahlFuellen(){
  var sel=document.getElementById('videoOverlay');
  if(!sel) return;
  var vorher=sel.value;
  sel.innerHTML='';
  for(var i=0;i<VIDEO_OVERLAYS.length;i++){
    var o=document.createElement('option');
    o.value=VIDEO_OVERLAYS[i].id;
    o.textContent=translateStaticValue(VIDEO_OVERLAYS[i].name, uiLanguage);
    sel.appendChild(o);
  }
  sel.value=vorher||'speed';
  if(!sel.value) sel.value='speed';
}

(function(){
  var sel=document.getElementById('videoOverlay');
  if(!sel) return;
  videoAuswahlFuellen();
  if(typeof macheAusklapper==='function') macheAusklapper('dlVideoHeader','dlVideoBody','dlVideoArrow');
  var kopf=document.getElementById('dlVideoHeader');
  if(kopf) kopf.addEventListener('click', videoSpanneAnzeigen);

  var stop=document.getElementById('btnVideoStop');
  function knoepfe(sperren){
    ['btnVideoWebm','btnVideoMp4'].forEach(function(id){
      var el=document.getElementById(id);
      if(el) el.disabled=sperren||!rawPoints.length;
    });
    if(stop) stop.style.display=sperren?'inline-flex':'none';
  }

  function starte(formatId){
    if(videoLaeuft) return;
    var art=videoOverlay(sel.value);
    if(!art){ setStatus('No data for this overlay in this file','err'); return; }
    var c=cfg();
    var spanne=videoZeitspanne(c);
    if(!spanne){ setStatus('No data for this overlay in this file','err'); return; }
    if(!art.hat()){ setStatus('No data for this overlay in this file','err'); return; }
    var vonFeld=parseFloat(document.getElementById('videoVon').value);
    var bisFeld=parseFloat(document.getElementById('videoBis').value);
    var von=isFinite(vonFeld)?Math.max(spanne.von, vonFeld):spanne.von;
    var bis=isFinite(bisFeld)?Math.min(spanne.bis, bisFeld):spanne.bis;
    if(!(bis>von)){ setStatus('The chosen stretch is empty','err'); return; }
    videoLaeuft=true; knoepfe(true);
    var dauer=Math.round(bis-von);
    videoFortschritt(0,'Recording in real time — '+dauer+' seconds to go');
    setStatus('Recording '+art.datei+' — this takes '+dauer+' seconds','ok');
    videoAufnahme(sel.value, formatId, von, bis, function(a){ videoFortschritt(a); })
      .then(function(blob){
        var fmt=VIDEO_FORMATE[formatId];
        var name=makeFilename(art.datei, fmt.endung);
        var u=URL.createObjectURL(blob), a=document.createElement('a');
        a.href=u; a.download=name; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(u);
        setStatus('Downloaded '+name,'ok');
      })
      ['catch'](function(e){
        setStatus(e&&e.message==='unsupported'
          ? 'This browser cannot record that format'
          : 'Recording failed: '+((e&&e.message)||e),'err');
      })
      ['finally'](function(){
        videoLaeuft=false; knoepfe(false); videoFortschritt(null);
      });
  }

  var w=document.getElementById('btnVideoWebm');
  var m=document.getElementById('btnVideoMp4');
  if(w) w.addEventListener('click',function(){ starte('webm'); });
  if(m) m.addEventListener('click',function(){ starte('mp4'); });
  if(stop) stop.addEventListener('click',function(){ videoAbbrechen=true; });
})();
