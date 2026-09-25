/* Die Vorschau auf der Seite: Karte, Streckenriss, Tacho, Puls und Hoehenprofil. */

function project(pts,W,H){
  var pr=projiziere(pts);
  return pts.map(function(p,i){
    return { x:(pr.xs[i]-pr.mnx)/pr.breite*W,
             y:H-(pr.ys[i]-pr.mny)/pr.hoehe*H };
  });
}

function hexToRgb(h){var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return[r,g,b];}

function setupHiDPICanvas(c,W,H){
  var dpr=window.devicePixelRatio||1;
  c.width=Math.max(1,Math.round(W*dpr));
  c.height=Math.max(1,Math.round(H*dpr));
  c.style.width=W+'px';
  c.style.height=H+'px';
  var ctx=c.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return ctx;
}

var resizeRedrawTimer=null;
window.addEventListener('resize',function(){
  clearTimeout(resizeRedrawTimer);
  resizeRedrawTimer=setTimeout(function(){
    if(!rawPoints.length) return;
    drawRoute();
    var maxSpd=0;
    for(var i=0;i<speedData.length;i++) if(speedData[i].spd>maxSpd) maxSpd=speedData[i].spd;
    drawSpeed(maxSpd);
    drawElev();
    drawHR();
  },150);
});

function drawRoute(){
  var c=document.getElementById('routeCanvas'),W=c.offsetWidth||620;
  var ctx=setupHiDPICanvas(c,W,180);
  // Beide Spuren gemeinsam projizieren, damit sie im selben Rahmen liegen.
  var alle=project(rawPoints.concat(ghostPoints),W-20,160);
  var xs=alle.map(function(p){return p.x;}),ys=alle.map(function(p){return p.y;});
  var mnX=minOf(xs),mxX=maxOf(xs),mnY=minOf(ys),mxY=maxOf(ys);
  function auf(p){ return {x:10+(p.x-mnX)/(mxX-mnX||1)*(W-20), y:10+(p.y-mnY)/(mxY-mnY||1)*160}; }
  function zeichne(liste,farbe,breite,deckkraft){
    if(liste.length<2) return;
    ctx.save(); ctx.globalAlpha=deckkraft;
    ctx.beginPath();
    for(var i=0;i<liste.length;i++){ var q=auf(liste[i]);
      if(i===0) ctx.moveTo(q.x,q.y); else ctx.lineTo(q.x,q.y); }
    ctx.strokeStyle=farbe; ctx.lineWidth=breite; ctx.stroke(); ctx.restore();
  }
  var geist=alle.slice(rawPoints.length);
  var el=document.getElementById('ghostColor');
  zeichne(geist,(el&&el.value)||'#8892a4',2,0.7);
  zeichne(alle.slice(0,rawPoints.length),'#f97316',2,1);
}

var mapInstance=null, mapRouteLayer=null, mapLoaded=false, lastMapTrackId=null;

function trackBounds(){
  var alle=rawPoints.concat(ghostPoints);
  var la=alle.map(function(p){return p.lat;}), lo=alle.map(function(p){return p.lon;});
  return{minLat:minOf(la),maxLat:maxOf(la),
         minLon:minOf(lo),maxLon:maxOf(lo)};
}

function jumpToSettings(){
  var card=document.getElementById('settings-card');
  if(!card) return;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(function(){
    card.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
  },120);
}

function resetMapPreview(){
  var wrap=document.getElementById('mapPreviewWrap');
  if(!wrap) return;
  wrap.style.display=rawPoints.length?'block':'none';
  var id=rawPoints.length?trackKennung():null;
  if(mapLoaded&&id===lastMapTrackId) return;
  lastMapTrackId=id;
  mapLoaded=false;
  var ov=document.getElementById('mapOverlay');
  if(ov) ov.hidden=false;
  var note=document.getElementById('mapNote');
  if(note) note.textContent=translateStaticValue('Loading map…',uiLanguage);
  if(rawPoints.length) showMapPreview();
}

// Punktzahl und Randzeiten allein unterscheiden zwei Tracks nicht: dieselbe
// Tour als GPX und als FIT trifft in allen dreien zusammen, und die Karte
// zeigte dann weiter die alte Route. Die Kennung fasst deshalb auch den
// Streckenverlauf zusammen.
function trackKennung(){
  var h=0x811c9dc5;
  for(var i=0;i<rawPoints.length;i++){
    var p=rawPoints[i];
    h^=Math.round(p.lat*1e5)|0; h=(h*0x01000193)>>>0;
    h^=Math.round(p.lon*1e5)|0; h=(h*0x01000193)>>>0;
  }
  return rawPoints.length+'|'+rawPoints[0].time+'|'+rawPoints[rawPoints.length-1].time
       +'|'+h.toString(16)+'|'+currentFilename+'|'+ghostPoints.length+ghostFilename;
}

function showMapPreview(){
  if(!rawPoints.length||typeof L==='undefined') return;
  var el=document.getElementById('mapCanvas');
  if(!el) return;
  var note=document.getElementById('mapNote');
  if(note) note.textContent=localizeRuntimeText('Loading map…');
  try{
    if(!mapInstance){
      mapInstance=L.map(el,{zoomControl:true,scrollWheelZoom:true,attributionControl:true});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,minZoom:2,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener nofollow">OpenStreetMap</a> contributors'
      }).addTo(mapInstance);
    }
    if(mapRouteLayer){ mapInstance.removeLayer(mapRouteLayer); mapRouteLayer=null; }
    var pts=[];
    for(var i=0;i<rawPoints.length;i++){
      if(validLatLon(rawPoints[i].lat,rawPoints[i].lon)) pts.push([rawPoints[i].lat,rawPoints[i].lon]);
    }
    if(pts.length<2) throw new Error('no valid coordinates');
    var geistPts=[];
    for(var g=0;g<ghostPoints.length;g++){
      if(validLatLon(ghostPoints[g].lat,ghostPoints[g].lon)) geistPts.push([ghostPoints[g].lat,ghostPoints[g].lon]);
    }
    var ebenen=[];
    if(geistPts.length>1){
      var gf=document.getElementById('ghostColor');
      ebenen.push(L.polyline(geistPts,{color:'#ffffff',weight:5,opacity:.6,lineJoin:'round',lineCap:'round'}));
      ebenen.push(L.polyline(geistPts,{color:(gf&&gf.value)||'#8892a4',weight:3,opacity:.85,dashArray:'6 5',lineJoin:'round',lineCap:'round'}));
    }
    mapRouteLayer=L.layerGroup(ebenen.concat([
      L.polyline(pts,{color:'#ffffff',weight:6,opacity:.85,lineJoin:'round',lineCap:'round'}),
      L.polyline(pts,{color:'#f97316',weight:3,lineJoin:'round',lineCap:'round'}),
      L.circleMarker(pts[0],{radius:6,color:'#fff',weight:2,fillColor:'#16a34a',fillOpacity:1}),
      L.circleMarker(pts[pts.length-1],{radius:6,color:'#fff',weight:2,fillColor:'#dc2626',fillOpacity:1})
    ])).addTo(mapInstance);
    var b=trackBounds();
    mapInstance.fitBounds([[b.minLat,b.minLon],[b.maxLat,b.maxLon]],{padding:[24,24]});
    setTimeout(function(){ if(mapInstance) mapInstance.invalidateSize(); },60);
    mapLoaded=true;
    var ov=document.getElementById('mapOverlay');
    if(ov) ov.hidden=true;
  }catch(e){
    console.error(e);
    if(note) note.textContent=localizeRuntimeText('Map could not be loaded');
  }
}

function drawGauge(){
  var maxSpd=parseFloat(document.getElementById('maxSpeed').value)||9;
  var unit=document.getElementById('unit').value;
  var curSpd=speedData.length?Math.min(speedData[Math.floor(speedData.length*0.25)].spd,maxSpd):maxSpd*0.4;
  document.getElementById('gaugeWrap').style.display='block';
  var c=document.getElementById('gaugeCanvas');
  var S=200,cx=100,cy=100;
  var ctx=setupHiDPICanvas(c,S,S);
  ctx.clearRect(0,0,S,S);

  var bgColor=document.getElementById('gaugeBgColor').value;

  ctx.beginPath(); ctx.arc(cx,cy,cx,0,Math.PI*2); ctx.fillStyle=bgColor; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,cx-4,0,Math.PI*2); ctx.fillStyle=bgColor; ctx.globalAlpha=0.85; ctx.fill(); ctx.globalAlpha=1;

  var R=74, trackW=10, speedW=12;
  var TAU=Math.PI*2;

  var startAng = TAU * (245/360);
  var endAng   = TAU * (295/360);

  var ringColor=document.getElementById('gaugeRingColor').value;
  var arcColor=document.getElementById('gaugeArcColor').value;
  var numColor=document.getElementById('gaugeNumberColor').value;
  var unitColor=document.getElementById('gaugeUnitColor').value;

  ctx.beginPath();
  ctx.arc(cx,cy,R,startAng,endAng,false);
  ctx.strokeStyle=ringColor;
  ctx.lineWidth=trackW;
  ctx.lineCap='round';
  ctx.stroke();

  var totalSweep = TAU*(310/360);
  var frac=maxSpd>0?curSpd/maxSpd:0;
  if(frac>0.001){
    ctx.beginPath();
    ctx.arc(cx,cy,R,startAng,startAng+totalSweep*frac,false);
    ctx.strokeStyle=arcColor;
    ctx.lineWidth=speedW;
    ctx.lineCap='round';
    ctx.stroke();
  }

  ctx.fillStyle=numColor;
  ctx.font='bold 38px DM Mono,monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(curSpd.toFixed(1),cx,cy-6);

  ctx.fillStyle=unitColor;
  ctx.font='bold 12px DM Sans,sans-serif';
  ctx.fillText(unit.toUpperCase(),cx,cy+26);
}

function drawSpeed(maxSpd){
  var c=document.getElementById('speedCanvas'),W=c.offsetWidth||620;
  var ctx=setupHiDPICanvas(c,W,60),pad=4;
  ctx.beginPath();
  for(var i=0;i<speedData.length;i++){
    var x=pad+(i/(speedData.length-1||1))*(W-pad*2),y=60-pad-(speedData[i].spd/(maxSpd||1))*(60-pad*2);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.strokeStyle='#f97316'; ctx.lineWidth=1.5; ctx.stroke();
}

function gradeColor(gradePct){

  var t=Math.min(Math.abs(gradePct)/10,1);
  var r=Math.round(34+(255-34)*t),g=Math.round(197+(197*(1-t)*0.3)),b=Math.round(94*(1-t));
  return'rgba('+r+','+g+','+b+',0.85)';
}

function drawHR(){
  var wrap=document.getElementById('hrPreviewWrap');
  if(!hrData.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  var c=document.getElementById('hrCanvas'),W=c.offsetWidth||620;
  var ctx=setupHiDPICanvas(c,W,60),pad=6,iW=W-pad*2,iH=60-pad*2;
  var hrs=hrData.map(function(p){return p.hr;});
  var minHR=minOf(hrs),maxHR=maxOf(hrs),hrRange=maxHR-minHR||1;
  var t0=hrData[0].time,tN=hrData[hrData.length-1].time,tRange=tN-t0||1;
  var hrColor=document.getElementById('hrColor').value;
  var r=parseInt(hrColor.slice(1,3),16),g=parseInt(hrColor.slice(3,5),16),b=parseInt(hrColor.slice(5,7),16);
  ctx.beginPath(); ctx.moveTo(pad,pad+iH);
  for(var i=0;i<hrData.length;i++){
    var x=pad+(hrData[i].time-t0)/tRange*iW;
    var y=pad+(1-(hrData[i].hr-minHR)/hrRange)*iH;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(pad+iW,pad+iH); ctx.closePath();
  ctx.fillStyle='rgba('+r+','+g+','+b+',0.15)'; ctx.fill();
  ctx.beginPath();
  for(var i=0;i<hrData.length;i++){
    var x=pad+(hrData[i].time-t0)/tRange*iW;
    var y=pad+(1-(hrData[i].hr-minHR)/hrRange)*iH;
    if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.strokeStyle=hrColor; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='rgba('+r+','+g+','+b+',0.8)'; ctx.font='10px sans-serif';
  ctx.fillText(maxHR+' bpm',pad+2,pad+10);
  ctx.fillText(minHR+' bpm',pad+2,pad+iH-2);
}

function buildElevXY(elevPts,iW,iH,pad){
  var eles=elevPts.map(function(p){return p.ele;});
  var minEle=minOf(eles),maxEle=maxOf(eles),eleRange=maxEle-minEle||1;
  var totalDKm=0;
  for(var i=1;i<elevPts.length;i++) totalDKm+=haversine(elevPts[i-1].lat,elevPts[i-1].lon,elevPts[i].lat,elevPts[i].lon)/1000;
  var cum=[0];
  for(var i=1;i<elevPts.length;i++) cum.push(cum[i-1]+haversine(elevPts[i-1].lat,elevPts[i-1].lon,elevPts[i].lat,elevPts[i].lon)/1000);
  var xs=[],ys=[];
  for(var i=0;i<elevPts.length;i++){
    xs.push(pad+(totalDKm>0?(cum[i]/totalDKm)*iW:0));
    ys.push(pad+(1-(elevPts[i].ele-minEle)/eleRange)*iH);
  }
  return{xs:xs,ys:ys,minEle:minEle,maxEle:maxEle,eleRange:eleRange,elevPts:elevPts};
}

function catmullToBezier(xs,ys){

  var segs=[];
  var n=xs.length;
  for(var i=0;i<n-1;i++){
    var p0=i>0?{x:xs[i-1],y:ys[i-1]}:{x:xs[i],y:ys[i]};
    var p1={x:xs[i],y:ys[i]};
    var p2={x:xs[i+1],y:ys[i+1]};
    var p3=i<n-2?{x:xs[i+2],y:ys[i+2]}:{x:xs[i+1],y:ys[i+1]};
    var t=0.5;
    segs.push({
      x1:p1.x+(p2.x-p0.x)*t/3,
      y1:p1.y+(p2.y-p0.y)*t/3,
      x2:p2.x-(p3.x-p1.x)*t/3,
      y2:p2.y-(p3.y-p1.y)*t/3,
      x:p2.x,y:p2.y
    });
  }
  return segs;
}

function drawElev(){
  var elevPts=rawPoints.filter(function(p){return p.ele!==null&&!isNaN(p.ele);});
  var wrap=document.getElementById('elevPreviewWrap');
  if(!elevPts.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  var c=document.getElementById('elevCanvas'),W=c.offsetWidth||620;
  var ctx=setupHiDPICanvas(c,W,80),pad=6,iW=W-pad*2,iH=80-pad*2;
  var useSmooth=true;
  var lineColor=document.getElementById('elevColor').value;
  var fillColor=document.getElementById('elevFillColor').value;
  var useFill=document.getElementById('elevFill').value==='1';
  var d=buildElevXY(elevPts,iW,iH,pad);
  var xs=d.xs,ys=d.ys;
  var segs=useSmooth?catmullToBezier(xs,ys):null;

  if(useFill){
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]);
    if(useSmooth && segs){
      for(var i=0;i<segs.length;i++) ctx.bezierCurveTo(segs[i].x1,segs[i].y1,segs[i].x2,segs[i].y2,segs[i].x,segs[i].y);
    } else {
      for(var i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i]);
    }
    ctx.lineTo(xs[xs.length-1],pad+iH); ctx.lineTo(xs[0],pad+iH); ctx.closePath();

    var fr=parseInt(fillColor.slice(1,3),16),fg=parseInt(fillColor.slice(3,5),16),fb=parseInt(fillColor.slice(5,7),16);
    ctx.fillStyle='rgba('+fr+','+fg+','+fb+',0.15)'; ctx.fill();
  }

  ctx.beginPath(); ctx.moveTo(xs[0],ys[0]);
  if(useSmooth && segs){
    for(var i=0;i<segs.length;i++) ctx.bezierCurveTo(segs[i].x1,segs[i].y1,segs[i].x2,segs[i].y2,segs[i].x,segs[i].y);
  } else {
    for(var i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i]);
  }
  ctx.strokeStyle=lineColor; ctx.lineWidth=1.5; ctx.stroke();

  var curIdx=Math.max(0,Math.min(xs.length-1,Math.floor(xs.length*0.25)));
  var dx=xs[curIdx],dy=ys[curIdx];
  ctx.beginPath(); ctx.arc(dx,dy,4,0,Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();

  var unit=document.getElementById('unit').value;
  var toDisp=function(m){ return unit==='mph' ? m*3.28084 : m; };
  var unitLabel=unit==='mph' ? 'ft' : 'm';
  ctx.font='bold 11px sans-serif'; ctx.fillStyle='#ffffff'; ctx.textBaseline='middle';
  var readout=Math.round(toDisp(elevPts[curIdx].ele))+' '+unitLabel;
  var tx=Math.min(dx+8,W-pad-ctx.measureText(readout).width);
  ctx.fillText(readout,tx,dy-8);

  ctx.fillStyle='rgba(148,163,184,0.8)'; ctx.font='10px sans-serif'; ctx.textBaseline='alphabetic';
  if(document.getElementById('elevLabels').checked){
    var marken=hoehenMarken(d.minEle,d.maxEle,unit);
    ctx.fillText(marken[0],pad+2,pad+10);
    ctx.fillText(marken[1],pad+2,pad+iH/2+4);
    ctx.fillText(marken[2],pad+2,pad+iH-2);
  }
}
