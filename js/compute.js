/* Aus den Rohpunkten werden die Reihen, die die Overlays zeigen: Geschwindigkeit,
   Steigung, Distanz, Pace - geglaettet und auf gueltige Werte geprueft. */

function haversine(la1,lo1,la2,lo2){
  var R=6371000,dL=(la2-la1)*Math.PI/180,dO=(lo2-lo1)*Math.PI/180;
  var a=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)*Math.sin(dO/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
// Zwei Punkte gehoeren nicht zusammen, wenn sie aus verschiedenen Abschnitten
// der Datei stammen, oder wenn die Strecke dazwischen in der verstrichenen Zeit
// nicht zurueckzulegen waere. Das Zweite faengt auch FIT-Dateien ab, die keine
// Abschnitte kennen, sowie zusammenkopierte Aufzeichnungen.
var MAX_TEMPO_MS=150;                       // 540 km/h, fuer kein Fahrzeug erreichbar
function istGrenze(a,b){
  if(!a||!b) return true;
  if(a.seg!==undefined&&b.seg!==undefined&&a.seg!==b.seg) return true;
  var dt=(b.time-a.time)/1000;
  if(!(dt>0)) return true;
  return haversine(a.lat,a.lon,b.lat,b.lon)/dt > MAX_TEMPO_MS;
}

function computeSpeeds(pts,unit){
  var result=[];
  for(var i=0;i<pts.length;i++){
    var p=pts[i],spd=(p.speed!==null&&!isNaN(p.speed))?p.speed:null;
    if(spd===null){
      if(i<pts.length-1&&!istGrenze(p,pts[i+1])){
        var dt=(pts[i+1].time-p.time)/1000;
        spd=dt>0?haversine(p.lat,p.lon,pts[i+1].lat,pts[i+1].lon)/dt:0;
      } else spd=result.length?result[result.length-1].rawSpd:0;
    }
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
    } else if(i>0&&!istGrenze(pts[i-1],pts[i])){
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
  var cum=new Float64Array(n), grenze=new Uint8Array(n);
  for(var c=1;c<n;c++){
    grenze[c]=istGrenze(elevPts[c-1],elevPts[c])?1:0;
    cum[c]=cum[c-1]+(grenze[c]?0:haversine(elevPts[c-1].lat,elevPts[c-1].lon,elevPts[c].lat,elevPts[c].lon));
  }
  var out=new Array(n), lo=0, hi=0, letzteGrenze=0;
  for(var i=0;i<n;i++){
    // Die Streckensumme ist ueber eine Grenze hinweg flach; die Schleife allein
    // wuerde deshalb stehenbleiben und das Fenster in den vorigen Abschnitt
    // hineinreichen lassen. Die Grenze wird daher ausdruecklich nachgezogen.
    if(grenze[i]) letzteGrenze=i;
    if(lo<letzteGrenze) lo=letzteGrenze;
    while(lo+1<=i && cum[i]-cum[lo+1]>=half) lo++;
    if(hi<i) hi=i;
    while(hi<n-1 && cum[hi]-cum[i]<half && !grenze[hi+1]) hi++;
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
  headingData=buildHeadingData(rawPoints, glaetten+2);
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
  // Dieselbe Abbildung wie in After Effects: ein Faktor fuer beide Achsen,
  // verankert unten links. Mit getrennten Faktoren fuer Breite und Hoehe liefen
  // die Lagen auf jeder Leinwand auseinander, die nicht 16:9 ist.
  var k=entwurfsFaktor(c);
  var x=(altX+v.dx)*k, y=c.H-(ENTWURF_H-(altY+v.dy))*k;
  return { dx: x/c.W - m.x, dy: (1-y/c.H) - m.y };
}

function entwurfsFaktor(c){ return Math.min(c.W/ENTWURF_W, c.H/ENTWURF_H); }

// Strecke in einen Kreis einpassen. Die Diagonale des umschliessenden Rechtecks
// passt in den Durchmesser - so wird die Kreisflaeche besser genutzt als mit dem
// einbeschriebenen Quadrat, und nichts wird abgeschnitten. Rueckgabe ist eine
// Funktion, die einen Punkt in den Versatz vom Kreismittelpunkt umrechnet
// (Leinwandpixel, y nach unten).
function kreisEinpassung(durchmesser, rand){
  var alle=rawPoints.concat(ghostPoints);
  if(!alle.length) return null;
  var pr=projiziere(alle);
  var v=pr.breite/pr.hoehe;
  var platz=Math.max(2, durchmesser-2*rand);
  var hoehe=platz/Math.sqrt(1+v*v), breite=v*hoehe;
  // Nimmt den Index in rawPoints.concat(ghostPoints), damit beide Spuren
  // dieselbe Projektion benutzen.
  return function(i){
    return { x:((pr.xs[i]-pr.mnx)/pr.breite-0.5)*breite,
             y:(0.5-(pr.ys[i]-pr.mny)/pr.hoehe)*hoehe };
  };
}

// ---- Fahrtrichtung ------------------------------------------------------
// Die Peilung von einem Punkt zum naechsten. Im Stand liegen zwei Messpunkte
// nur Meter auseinander, und das Rauschen des Empfaengers ergibt dann jede
// beliebige Richtung. Deshalb drei Vorkehrungen:
//   1. Unter einer Mindeststrecke zaehlt das Paar nicht.
//   2. Punkte mit schlechter Ortung werden uebersprungen, wo die Datei sie
//      ausweist (FIT-Feld 31, Meter).
//   3. Gemittelt wird ueber einen Vektor, nicht ueber Gradzahlen - sonst
//      ergaebe der Sprung von 359 auf 1 Grad einen Mittelwert von 180.
// Fehlt eine brauchbare Richtung, wird die letzte gehalten.
function peilung(la1, lo1, la2, lo2){
  var f1=la1*Math.PI/180, f2=la2*Math.PI/180, dl=(lo2-lo1)*Math.PI/180;
  var y=Math.sin(dl)*Math.cos(f2);
  var x=Math.cos(f1)*Math.sin(f2)-Math.sin(f1)*Math.cos(f2)*Math.cos(dl);
  var g=Math.atan2(y,x)*180/Math.PI;
  return (g+360)%360;
}

function buildHeadingData(pts, fenster, mindestMeter, maxFehler){
  if(!pts||pts.length<2) return [];
  var f=Math.max(1, fenster||5);
  var mind=(mindestMeter===undefined)?3:mindestMeter;
  var maxF=(maxFehler===undefined)?25:maxFehler;
  // Rohe Richtungsvektoren je Punkt, ungueltige bleiben null
  var vekt=[];
  for(var i=0;i<pts.length;i++){
    var a=pts[i], b=pts[i+1]||null;
    var v=null;
    if(b){
      var schlecht=(a.genau!==null&&a.genau!==undefined&&a.genau>maxF)
                 ||(b.genau!==null&&b.genau!==undefined&&b.genau>maxF);
      if(!schlecht && !istGrenze(a,b) && haversine(a.lat,a.lon,b.lat,b.lon)>=mind){
        var g=peilung(a.lat,a.lon,b.lat,b.lon)*Math.PI/180;
        v={x:Math.sin(g), y:Math.cos(g)};
      }
    }
    vekt.push(v);
  }
  var out=[], letzte=null;
  for(var j=0;j<pts.length;j++){
    var sx=0, sy=0, n=0;
    for(var k=Math.max(0,j-f); k<=Math.min(vekt.length-1, j+f); k++){
      if(vekt[k]){ sx+=vekt[k].x; sy+=vekt[k].y; n++; }
    }
    var grad;
    if(n>0 && (sx*sx+sy*sy)>1e-6){
      grad=(Math.atan2(sx,sy)*180/Math.PI+360)%360;
      letzte=grad;
    } else {
      grad=(letzte===null)?0:letzte;
    }
    out.push({time:pts[j].time, deg:grad});
  }
  // Das erste Stueck bekommt die erste brauchbare Richtung, damit der Pfeil
  // nicht bei Norden losgeht und dann wegschnellt. Rueckwaerts gefuellt, sonst
  // kopiert man den Vorgabewert weiter, statt ihn zu ersetzen.
  var ersteGute=-1;
  for(var m=0;m<out.length;m++){
    var sx2=0, sy2=0, n2=0;
    for(var k2=Math.max(0,m-f); k2<=Math.min(vekt.length-1,m+f); k2++)
      if(vekt[k2]){ sx2+=vekt[k2].x; sy2+=vekt[k2].y; n2++; }
    if(n2>0 && (sx2*sx2+sy2*sy2)>1e-6){ ersteGute=m; break; }
  }
  for(var q=ersteGute-1;q>=0;q--) out[q].deg=out[q+1].deg;
  return out;
}

// Fuer die Ausgabe: fortlaufender Winkel ohne Spruenge ueber die 360-Grad-Marke.
// Sonst dreht der Pfeil bei jedem Nulldurchgang eine ganze Runde zurueck.
function stetigerWinkel(daten){
  var out=[], versatz=0, vorher=null;
  for(var i=0;i<daten.length;i++){
    var g=daten[i].deg;
    if(vorher!==null){
      if(g-vorher>180) versatz-=360;
      else if(vorher-g>180) versatz+=360;
    }
    vorher=g;
    out.push({time:daten[i].time, deg:g+versatz});
  }
  return out;
}

// ---- Projektion ---------------------------------------------------------
// Eine gemeinsame Rechnung fuer die Vorschau und beide Ausgabeformate.
// Mit rohen Gradzahlen waere eine Strecke bei 50 Grad Nord um gut die Haelfte
// zu breit, weil ein Laengengrad dort nur 64 Prozent eines Breitengrads misst.
function mercatorY(lat){ return Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)); }

// Laengengrade fortlaufend machen. Ein Track ueber die Datumsgrenze springt
// sonst von 179,9 auf -179,9 und spannt scheinbar die halbe Erde.
function entrollteLaenge(pts){
  var out=[];
  if(!pts.length) return out;
  out.push(pts[0].lon);
  for(var i=1;i<pts.length;i++){
    var l=pts[i].lon, d=l-out[i-1];
    if(d>180) l-=360; else if(d<-180) l+=360;
    out.push(l);
  }
  return out;
}

// Liefert die Punkte in einem ebenen, seitenrichtigen Koordinatensystem samt
// Umhuellender. Reihenfolge und Anzahl entsprechen der Eingabe.
function projiziere(pts){
  var lons=entrollteLaenge(pts), xs=[], ys=[];
  for(var i=0;i<pts.length;i++){ xs.push(lons[i]*Math.PI/180); ys.push(mercatorY(pts[i].lat)); }
  var mnx=minOf(xs), mxx=maxOf(xs), mny=minOf(ys), mxy=maxOf(ys);
  return { xs:xs, ys:ys, mnx:mnx, mxx:mxx, mny:mny, mxy:mxy,
           breite:(mxx-mnx)||1e-9, hoehe:(mxy-mny)||1e-9 };
}
