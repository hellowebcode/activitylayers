/* Overlays, die beide Formate aus einer gemeinsamen Vorlage erzeugen:
   Trittfrequenz, Leistung, Temperatur, Pace und Rundenmarken. */

function overlayLabels(){
  var de=(typeof uiLanguage!=='undefined'&&uiLanguage==='de');
  return { cad: de?'U/min':'rpm', power:'W', lap: de?'Runde':'Lap', temp:'\u00b0C' };
}

function timeToFrame(tMs,t0){
  var c=cfg();
  var fps=parseFloat(c.fps)||30;
  var offset=parseFloat(c.offset)||0;
  var drift=parseFloat(c.driftFactor)||1.0;
  return Math.round(((tMs-t0)/1000*drift+offset)*fps);
}

function buildLapKeyframes(){
  var c=cfg();
  if(!lapData.length||!rawPoints.length) return null;
  var fps=parseFloat(c.fps)||30;
  var t0=rawPoints[0].time, num=[], sec=[], last=-1;
  for(var i=0;i<lapData.length;i++){
    var a=timeToFrame(lapData[i].start,t0), b=timeToFrame(lapData[i].end,t0);
    if(b<=a) b=a+1;
    if(b<1) continue;
    if(a<0) a=0;
    if(a<=last) a=last+1;
    if(b-1<=a) continue;
    num.push([a,i+1]); num.push([b-1,i+1]);
    sec.push([a,0]);   sec.push([b-1,(b-1-a)/fps]);
    last=b-1;
  }
  return num.length?{num:num,sec:sec}:null;
}

function buildTextOverlaySetting(cfg){
  // cfg ist hier das uebergebene Beschreibungsobjekt, nicht die Funktion cfg();
  // die Leinwand kommt deshalb direkt aus den Bedienelementen.
  var W=leinwandMass('compW',COMP_DESIGN_W), H=leinwandMass('compH',COMP_DESIGN_H);
  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\t'+cfg.group+' = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = {');
  L.push('\t\t\t\tOutput1 = InstanceOutput {');
  L.push('\t\t\t\t\tSourceOp = "OverlayPosition",');
  L.push('\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t}');
  L.push('\t\t\t},');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 1148.97, 18.5755 },');
  L.push('\t\t\t\tFlags = {');
  L.push('\t\t\t\t\tAllowPan = false,');
  L.push('\t\t\t\t\tAutoSnap = true,');
  L.push('\t\t\t\t\tRemoveRouters = true');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tSize = { 393.511, 139.781, 196.756, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { -990.532, -3.75992 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push('\t\t\t\tRectangle1 = RectangleMask {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tBorderWidth = Input { Value = -0.181, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.494180407371484, 0.5 }, },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+(cfg.boxWidth||0.378).toFixed(3)+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.472, },');
  L.push('\t\t\t\t\t\tCornerRadius = Input { Value = 1, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 861.394, 10.919 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground2 = Background {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Rectangle1",');
  L.push('\t\t\t\t\t\t\tSource = "Mask",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = 0.433, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 856.776, 84.493 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tText2 = TextPlus {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  if(cfg.farbkanaele){
    L.push('\t\t\t\t\t\tRed1 = '+bezierSourceRefInput('Text2ZoneR')+',');
    L.push('\t\t\t\t\t\tGreen1 = '+bezierSourceRefInput('Text2ZoneG')+',');
    L.push('\t\t\t\t\t\tBlue1 = '+bezierSourceRefInput('Text2ZoneB')+',');
  } else {
    L.push('\t\t\t\t\t\tRed1 = Input { Value = '+(cfg.rgb[0]/255).toFixed(6)+', },');
    L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+(cfg.rgb[1]/255).toFixed(6)+', },');
    L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+(cfg.rgb[2]/255).toFixed(6)+', },');
  }
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input {');
  L.push('\t\t\t\t\t\t\tValue = "0",');
  L.push('\t\t\t\t\t\t\tExpression = "'+cfg.expr.replace(/"/g,'\\"')+'",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = '+cfg.size.toFixed(6)+', },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tAdvancedFontControls = Input { Value = 1, },');
  for(var d=0;d<cfg.drives.length;d++)
    L.push('\t\t\t\t\t\t'+cfg.drives[d].name+' = '+bezierSourceRefInput('Text2'+cfg.drives[d].name)+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1122.34, 17.956 } },');
  var uc=[];
  for(var u=0;u<cfg.drives.length;u++){
    var dr=cfg.drives[u];
    uc.push(dr.name+' = { LINKS_Name = "'+dr.label+'", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Integer = false, INP_MinScale = '+dr.min+', INP_MaxScale = '+dr.max+', INP_MinAllowed = -1000000, INP_MaxAllowed = 1000000, INP_SplineType = "Default", ICS_ControlPage = "Text" }');
  }
  L.push('\t\t\t\t\tUserControls = ordered() { '+uc.join(', ')+' }');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge3 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Background2",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Text2",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.532, 0.5 }, },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1124.29, 81.2339 } },');
  L.push('\t\t\t\t},');
  for(var k=0;k<cfg.drives.length;k++)
    L.push(buildBezierSplineTool('Text2'+cfg.drives[k].name, cfg.drives[k].kf, false));
  if(cfg.farbkanaele){
    L.push(buildBezierSplineTool('Text2ZoneR', cfg.farbkanaele.r, false));
    L.push(buildBezierSplineTool('Text2ZoneG', cfg.farbkanaele.g, false));
    L.push(buildBezierSplineTool('Text2ZoneB', cfg.farbkanaele.b, false));
  }
  var lage=lageFelder(cfg.schluessel); lage.W=W; lage.H=H;
  var vp=fusionVersatz(lage, cfg.schluessel, OVERLAY_MASSE.text, 250, 880);
  L.push(buildTransformNode('OverlayPosition', 'Merge3', vp.dx, vp.dy, [1400,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push('\t}');
  L.push('}');
  return L.join('\n');
}

function buildCadenceSetting(){
  var c=cfg();
  if(!cadData.length) return null;
  return buildTextOverlaySetting({
    group:'Cadence',
    schluessel:'cad',
    rgb:hexToRgb(c.cadColor),
    size:parseFloat(c.cadSize)||0.07,
    expr:'string.format("%d '+overlayLabels().cad+'", floor(Cadence))',
    drives:[{name:'Cadence',label:'Cadence',min:0,max:200,
             kf:buildKeyframeList(cadData,function(p){return Math.round(p.cad);})}]
  });
}

function paceLabel(c){ return (c.unit==='mph')?'/mi':'/km'; }

function buildPaceSetting(){
  var c=cfg();
  if(!paceData.length) return null;
  return buildTextOverlaySetting({
    group:'Pace',
    schluessel:'pace',
    boxWidth:0.44,
    rgb:hexToRgb(c.paceColor),
    size:parseFloat(c.paceSize)||0.07,
    expr:'string.format("%d:%02d '+paceLabel(c)+'", floor(Pace/60), floor(Pace - floor(Pace/60)*60))',
    drives:[{name:'Pace',label:'Pace (s)',min:60,max:3600,
             kf:buildKeyframeList(paceData,function(p){return Math.round(p.sec);})}]
  });
}

function buildTempSetting(){
  var c=cfg();
  if(!tempData.length) return null;
  return buildTextOverlaySetting({
    group:'Temperature',
    schluessel:'temp',
    rgb:hexToRgb(c.tempColor),
    size:parseFloat(c.tempSize)||0.07,
    expr:'string.format("%d '+overlayLabels().temp+'", floor(Temperature))',
    drives:[{name:'Temperature',label:'Temperature',min:-40,max:60,
             kf:buildKeyframeList(tempData,function(p){return Math.round(p.temp);})}]
  });
}

function buildPowerSetting(){
  var c=cfg();
  if(!powerData.length) return null;
  return buildTextOverlaySetting({
    group:'Power',
    schluessel:'power',
    farbkanaele: c.powerZones ? zonenFarbkanaele(powerData,function(p){return p.power;},
      parseFloat(c.powerZone2)||200, parseFloat(c.powerZone3)||280,
      hexToRgb(c.powerColor), hexToRgb(c.powerColor2), hexToRgb(c.powerColor3)) : null,
    rgb:hexToRgb(c.powerColor),
    size:parseFloat(c.powerSize)||0.07,
    expr:'string.format("%d '+overlayLabels().power+'", floor(Power))',
    drives:[{name:'Power',label:'Power',min:0,max:1500,
             kf:buildKeyframeList(powerData,function(p){return Math.round(p.power);})}]
  });
}

function buildLapSetting(){
  var c=cfg();
  var k=buildLapKeyframes();
  if(!k) return null;
  return buildTextOverlaySetting({
    group:'LapMarker',
    schluessel:'lap',
    boxWidth:0.5,
    rgb:hexToRgb(c.lapColor),
    size:parseFloat(c.lapSize)||0.06,
    expr:'string.format("'+overlayLabels().lap+' %d   %d:%02d", floor(LapNumber), floor(LapTime/60), floor(LapTime - floor(LapTime/60)*60))',
    drives:[{name:'LapNumber',label:'Lap Number',min:0,max:99,kf:k.num},
            {name:'LapTime',label:'Lap Time (s)',min:0,max:3600,kf:k.sec}]
  });
}

function buildCadenceJsx(){
  var c=cfg();
  var vs=ankerVersatz(c,'cad',OVERLAY_MASSE.text,250,880);
  if(!cadData.length) return null;
  var size=(parseFloat(c.cadSize)||0.07)*AE_H*aeFaktor(c);
  var kf=buildKeyframeList(cadData,function(p){return p.cad;});
  var L=[aeHead('Cadence Overlay')];
  L.push('  var num=textLayer("Cadence","0",'+aeOrt(c,250+vs.dx,880+vs.dy)+','+aeNum(size)+','+aeCol(c.cadColor)+',false);');
  L.push('  driveText(num,"Cadence",'+aeKf(kf,0)+','+aeStr('Math.round(v)+" '+overlayLabels().cad+'";')+');');
  L.push(aeTail());
  return L.join('\n');
}

function buildPaceJsx(){
  var c=cfg();
  var vs=ankerVersatz(c,'pace',OVERLAY_MASSE.text,250,880);
  if(!paceData.length) return null;
  var size=(parseFloat(c.paceSize)||0.07)*AE_H*aeFaktor(c);
  var kf=buildKeyframeList(paceData,function(p){return Math.round(p.sec);});
  var ausdruck='var t=v; var m=Math.floor(t/60); var s=Math.floor(t-m*60); '+
               'm+":"+(s<10?"0":"")+s+" '+paceLabel(c)+'";';
  var L=[aeHead('Pace Overlay')];
  L.push('  var num=textLayer("Pace","0:00",'+aeOrt(c,250+vs.dx,880+vs.dy)+','+aeNum(size)+','+aeCol(c.paceColor)+',false);');
  L.push('  driveText(num,"Pace",'+aeKf(kf,0)+','+aeStr(ausdruck)+');');
  L.push(aeTail());
  return L.join('\n');
}

function buildTempJsx(){
  var c=cfg();
  var vs=ankerVersatz(c,'temp',OVERLAY_MASSE.text,250,880);
  if(!tempData.length) return null;
  var size=(parseFloat(c.tempSize)||0.07)*AE_H*aeFaktor(c);
  var kf=buildKeyframeList(tempData,function(p){return p.temp;});
  var L=[aeHead('Temperature Overlay')];
  L.push('  var num=textLayer("Temperature","0",'+aeOrt(c,250+vs.dx,880+vs.dy)+','+aeNum(size)+','+aeCol(c.tempColor)+',false);');
  L.push('  driveText(num,"Temperature",'+aeKf(kf,0)+','+aeStr('Math.round(v)+" '+overlayLabels().temp+'";')+');');
  L.push(aeTail());
  return L.join('\n');
}

function buildPowerJsx(){
  var c=cfg();
  var vs=ankerVersatz(c,'power',OVERLAY_MASSE.text,250,880);
  if(!powerData.length) return null;
  var size=(parseFloat(c.powerSize)||0.07)*AE_H*aeFaktor(c);
  var kf=buildKeyframeList(powerData,function(p){return p.power;});
  var L=[aeHead('Power Overlay')];
  var zonen = c.powerZones ? zonenDeckkraft(powerData,function(p){return p.power;},
    parseFloat(c.powerZone2)||200, parseFloat(c.powerZone3)||280) : null;
  var ausdruck=aeStr('Math.round(v)+" '+overlayLabels().power+'";');
  if(zonen){
    var farben=[c.powerColor,c.powerColor2,c.powerColor3];
    for(var z=0;z<3;z++){
      L.push('  var z'+z+'=textLayer("Power zone '+(z+1)+'","0",'+aeOrt(c,250+vs.dx,880+vs.dy)+','+aeNum(size)+','+aeCol(farben[z])+',false);');
      L.push('  driveText(z'+z+',"Power zone '+(z+1)+'",'+aeKf(kf,0)+','+ausdruck+');');
      L.push('  keys(tf(z'+z+',"ADBE Opacity"),'+aeKf(zonen[z],0)+');');
    }
  } else {
    L.push('  var num=textLayer("Power","0",'+aeOrt(c,250+vs.dx,880+vs.dy)+','+aeNum(size)+','+aeCol(c.powerColor)+',false);');
    L.push('  driveText(num,"Power",'+aeKf(kf,0)+','+ausdruck+');');
  }
  L.push(aeTail());
  return L.join('\n');
}

function buildLapJsx(){
  var c=cfg();
  var vs=ankerVersatz(c,'lap',OVERLAY_MASSE.text,250,880);
  var k=buildLapKeyframes();
  if(!k) return null;
  var size=(parseFloat(c.lapSize)||0.06)*AE_H*aeFaktor(c);
  var expr='var n=Math.floor(effect("Lap Number")(1).value); '+
           'var t=effect("Lap Time")(1).value; '+
           'var m=Math.floor(t/60); var s=Math.floor(t-m*60); '+
           '"'+overlayLabels().lap+' "+n+"   "+m+":"+(s<10?"0":"")+s;';
  var L=[aeHead('Lap Marker Overlay')];
  L.push('  var lap=textLayer("Lap Marker",'+aeStr(overlayLabels().lap+' 1   0:00')+','+aeOrt(c,250+vs.dx,880+vs.dy)+','+aeNum(size)+','+aeCol(c.lapColor)+',false);');
  L.push('  slider(lap,"Lap Number",'+aeKf(k.num,0)+');');
  L.push('  slider(lap,"Lap Time",'+aeKf(k.sec,2)+');');
  L.push('  lap.property("ADBE Text Properties").property("ADBE Text Document").expression = '+aeStr(expr)+';');
  L.push(aeTail());
  return L.join('\n');
}
