/* Aus den Rohpunkten werden die Reihen, die die Overlays zeigen: Geschwindigkeit,
   Steigung, Distanz, Pace - geglaettet und auf gueltige Werte geprueft. */

function haversine(la1,lo1,la2,lo2){
  var R=6371000,dL=(la2-la1)*Math.PI/180,dO=(lo2-lo1)*Math.PI/180;
  var a=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)*Math.sin(dO/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function computeSpeeds(pts,unit){
  var result=[];
  for(var i=0;i<pts.length;i++){
    var p=pts[i],spd=(p.speed!==null&&!isNaN(p.speed))?p.speed:null;
    if(spd===null){if(i<pts.length-1){var dt=(pts[i+1].time-p.time)/1000;spd=dt>0?haversine(p.lat,p.lon,pts[i+1].lat,pts[i+1].lon)/dt:0;}else spd=result.length?result[result.length-1].rawSpd:0;}
    result.push({time:p.time,rawSpd:spd,spd:Math.max(0,unit==='mph'?spd*2.23694:spd*3.6)});
  }
  return result;
}

function sgCoeffs(m, degree) {
  var n = 2 * m + 1;

  var A = [];
  for (var i = 0; i < n; i++) {
    var row = [], x = i - m;
    for (var d = 0; d <= degree; d++) row.push(Math.pow(x, d));
    A.push(row);
  }

  var cols = degree + 1;
  var ATA = [];
  for (var r = 0; r < cols; r++) {
    ATA.push([]);
    for (var c = 0; c < cols; c++) {
      var s = 0;
      for (var i = 0; i < n; i++) s += A[i][r] * A[i][c];
      ATA[r].push(s);
    }
  }

  var aug = [];
  for (var r = 0; r < cols; r++) {
    aug.push(ATA[r].slice());
    for (var c = 0; c < cols; c++) aug[r].push(r === c ? 1 : 0);
  }
  for (var col = 0; col < cols; col++) {

    var maxR = col;
    for (var r = col+1; r < cols; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[maxR][col])) maxR = r;
    var tmp = aug[col]; aug[col] = aug[maxR]; aug[maxR] = tmp;
    var piv = aug[col][col];
    if (Math.abs(piv) < 1e-12) return null;
    for (var c = 0; c < cols*2; c++) aug[col][c] /= piv;
    for (var r = 0; r < cols; r++) {
      if (r === col) continue;
      var f = aug[r][col];
      for (var c = 0; c < cols*2; c++) aug[r][c] -= f * aug[col][c];
    }
  }

  var weights = [];
  for (var i = 0; i < n; i++) {
    var w = 0;
    for (var d = 0; d <= degree; d++) w += aug[0][cols + d] * A[i][d];
    weights.push(w);
  }
  return weights;
}

var _sgCache = {};
function getSGCoeffs(m) {
  if (_sgCache[m]) return _sgCache[m];
  var c = sgCoeffs(m, 2);
  if (!c) c = sgCoeffs(m, 1);
  _sgCache[m] = c;
  return c;
}

function smoothSG(data, win) {

  if (win <= 1) return data.slice();
  var m = Math.floor(win / 2);
  var weights = getSGCoeffs(m);
  if (!weights) return smoothRolling(data, win);
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var sum = 0, wSum = 0;
    for (var k = -m; k <= m; k++) {
      var idx = Math.min(Math.max(i + k, 0), data.length - 1);
      var w = weights[k + m];
      sum += w * data[idx].spd;
      wSum += w;
    }

    out.push({ time: data[i].time, spd: Math.max(0, wSum !== 0 ? sum / wSum : sum) });
  }
  return out;
}

function smoothRolling(data, win) {
  if (win <= 1) return data.slice();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var h = Math.floor(win/2), s = Math.max(0,i-h), e = Math.min(data.length-1,i+h), sum = 0, n = 0;
    for (var j = s; j <= e; j++) { sum += data[j].spd; n++; }
    out.push({ time: data[i].time, spd: sum / n });
  }
  return out;
}

function smooth(data, win) {
  return smoothSG(data, win);
}

function buildDistData(pts){
  var hatGeraetewerte=false;
  for(var i=0;i<pts.length;i++){
    var v=pts[i].dist;
    if(v!==null&&v!==undefined&&isFinite(v)){ hatGeraetewerte=true; break; }
  }
  var out=[],cum=0;
  for(var i=0;i<pts.length;i++){
    var d=pts[i].dist;
    if(hatGeraetewerte){
      if(d!==null&&d!==undefined&&isFinite(d)&&d>=0) cum=d;
    } else if(i>0){
      cum+=haversine(pts[i-1].lat,pts[i-1].lon,pts[i].lat,pts[i].lon);
    }
    out.push({time:pts[i].time, distM:cum});
  }
  return out;
}

function buildGradeData(pts){
  var elevPts=pts.filter(function(p){return p.ele!==null&&!isNaN(p.ele);});
  var n=elevPts.length;
  if(n<2) return [];
  var half=15/2;
  var cum=new Float64Array(n);
  for(var c=1;c<n;c++)
    cum[c]=cum[c-1]+haversine(elevPts[c-1].lat,elevPts[c-1].lon,elevPts[c].lat,elevPts[c].lon);
  var out=new Array(n), lo=0, hi=0;
  for(var i=0;i<n;i++){
    while(lo+1<=i && cum[i]-cum[lo+1]>=half) lo++;
    if(hi<i) hi=i;
    while(hi<n-1 && cum[hi]-cum[i]<half) hi++;
    var distM=cum[hi]-cum[lo];
    var elevDiff=elevPts[hi].ele-elevPts[lo].ele;
    out[i]={time:elevPts[i].time, pct:distM>1?(elevDiff/distM)*100:0};
  }
  return out;
}

function reprocess(){
  var fps=parseFloat(document.getElementById('fps').value);
  var unit=document.getElementById('unit').value;
  // Die Angabe max="20" im Markup ist nur ein Hinweis fuer die Bedienung;
  // ein getippter oder gespeicherter Wert kommt sonst ungebremst hier an.
  var glaetten=parseInt(document.getElementById('smooth').value,10);
  if(!isFinite(glaetten)||glaetten<0) glaetten=0;
  if(glaetten>20) glaetten=20;
  var win=glaetten*2+1;
  speedData=smooth(computeSpeeds(rawPoints,unit),win);
  hrData=rawPoints.filter(function(p){return p.hr!==null&&!isNaN(p.hr);}).map(function(p){return{time:p.time,hr:p.hr};});
  cadData=rawPoints.filter(function(p){return p.cad!==null&&p.cad!==undefined&&!isNaN(p.cad);}).map(function(p){return{time:p.time,cad:p.cad};});
  powerData=rawPoints.filter(function(p){return p.power!==null&&p.power!==undefined&&!isNaN(p.power);}).map(function(p){return{time:p.time,power:p.power};});
  tempData=rawPoints.filter(function(p){return p.temp!==null&&p.temp!==undefined&&!isNaN(p.temp);}).map(function(p){return{time:p.time,temp:p.temp};});
  paceData=speedData.map(function(p){
    var sek=(p.spd>0.1)?3600/p.spd:3600;          // Sekunden je Kilometer bzw. Meile
    return{time:p.time, sec:Math.max(60,Math.min(3600,sek))};
  });
  gradeData=buildGradeData(rawPoints);
  distData=buildDistData(rawPoints);
  totalDistM=distData.length?distData[distData.length-1].distM:0;
  var durSec=(speedData[speedData.length-1].time-speedData[0].time)/1000;
  var maxSpd=0;
  for(var i=0;i<speedData.length;i++)if(speedData[i].spd>maxSpd)maxSpd=speedData[i].spd;
  var h=Math.floor(durSec/3600),m=Math.floor((durSec%3600)/60),s=Math.floor(durSec%60),f=Math.round((durSec%1)*fps);
  function p2(n){return n<10?'0'+n:''+n;}
  var tc=p2(h)+':'+p2(m)+':'+p2(s)+':'+p2(f);
  var distDisplay=unit==='mph'?(totalDistM/1609.344).toFixed(2)+' mi':(totalDistM/1000).toFixed(2)+' km';
  document.getElementById('statPts').textContent=rawPoints.length;
  document.getElementById('statDur').textContent=tc;
  document.getElementById('statDist').textContent=distDisplay;
  lastMaxSpeedValue=maxSpd;
  document.getElementById('statSpd').textContent=maxSpd.toFixed(1)+' '+unitDisplay(unit);
  document.getElementById('maxSpeed').value=(Math.max(0.5,Math.ceil(maxSpd*2)/2)).toFixed(1);
  document.getElementById('statsWrap').style.display='block';
  drawRoute(); drawSpeed(maxSpd); drawElev(); drawHR(); resetMapPreview(); setEnabled(true);
  setStatus('Ready — '+rawPoints.length+' points · '+tc+' · '+distDisplay,'ok');
}

// Die drei Zahlen am Rand des Hoehenprofils: Hoechstwert, Mitte, Tiefstwert.
// Beide Ausgabeformate und die Vorschau sollen dieselben Werte zeigen.
function hoehenMarken(minEle, maxEle, unit){
  var nachFuss = (unit==='mph');
  var um = function(m){ return nachFuss ? m*3.28084 : m; };
  var kuerzel = nachFuss ? 'ft' : 'm';
  return [Math.round(um(maxEle))+' '+kuerzel,
          Math.round(um((maxEle+minEle)/2))+' '+kuerzel,
          Math.round(um(minEle))+' '+kuerzel];
}

// ---- Lage der Overlays -------------------------------------------------
// Der Entwurf geht von 1920x1080 aus. Beide Ausgabeformate rechnen daraus
// ihre eigene Darstellung, damit dasselbe Overlay in Resolve und in After
// Effects an derselben Stelle sitzt.
var ENTWURF_W=1920, ENTWURF_H=1080, ANKER_RAND=110;

var ANKER_ANTEILE={
  'top-left':[0,0],    'top-center':[0.5,0],    'top-right':[1,0],
  'middle-left':[0,0.5],'center':[0.5,0.5],     'middle-right':[1,0.5],
  'bottom-left':[0,1], 'bottom-center':[0.5,1], 'bottom-right':[1,1]
};

// Ungefaehre Ausdehnung der Overlays im Entwurfsmass. Sie muss nicht genau
// sein - sie sorgt nur dafuer, dass ein Overlay am Rand nicht anstoesst.
var OVERLAY_MASSE={
  speed:{b:430,h:430}, hr:{b:360,h:160}, incline:{b:280,h:220},
  mile:{b:320,h:200}, text:{b:340,h:130}
};

// Zielmittelpunkt in Entwurfskoordinaten, Ursprung oben links. Die bisherige
// Lage eines Overlays gilt als "unten links" - damit bleibt die Vorgabe genau
// das, was sie war, und die uebrigen acht Anker richten sich danach.
function ankerVersatz(c, schluessel, mass, altX, altY){
  var a=ANKER_ANTEILE[c[schluessel+'Anchor']]||ANKER_ANTEILE['bottom-left'];
  var xWerte=[altX, ENTWURF_W/2, ENTWURF_W-ANKER_RAND-mass.b/2];
  var yWerte=[ANKER_RAND+mass.h/2, ENTWURF_H/2, altY];
  // Was so breit ist wie die Leinwand, kann nicht nach links oder rechts -
  // sonst haengt es hinten heraus. Dasselbe in der Hoehe.
  var zx=klemme(xWerte[a[0]*2], mass.b, ENTWURF_W);
  var zy=klemme(yWerte[a[1]*2], mass.h, ENTWURF_H);
  return { dx: zx-altX + zahlOderVorgabe(c[schluessel+'OffX'],0),
           dy: zy-altY + zahlOderVorgabe(c[schluessel+'OffY'],0) };
}

function klemme(wert, ausdehnung, gesamt){
  var klein=Math.min(ausdehnung/2, gesamt/2), gross=Math.max(gesamt-ausdehnung/2, gesamt/2);
  return Math.max(klein, Math.min(gross, wert));
}

// Fusion beschreibt Lagen normiert mit Ursprung unten links, der Entwurf
// rechnet in Pixeln mit Ursprung oben links. Die Bauteile eines Overlays
// liegen dort um die Bildmitte herum; die ganze Gruppe wandert um denselben
// Betrag, damit sie ihre Anordnung behaelt.
function fusionVersatz(c, schluessel, mass, altX, altY, istMitteN){
  var v=ankerVersatz(c, schluessel, mass, altX, altY);
  var m=istMitteN||{x:0.5,y:0.5};
  return { dx: (altX+v.dx)/ENTWURF_W - m.x,
           dy: (1-(altY+v.dy)/ENTWURF_H) - m.y };
}
