/* Ausgabe fuer DaVinci Resolve: der Fusion-Knotengraph als .setting. */

var SHADOW_WIDTH_RATIO=1.25;

function sanitizeFilename(s){
  s=String(s).replace(/[\x00-\x1F\x7F]/g,'').replace(/[‪-‮⁦-⁩]/g,'');
  s=s.replace(/[:]/g,'-').replace(/[<>"/\\|?*]/g,'').replace(/\s+/g,' ').trim();
  s=s.replace(/^\.+/,'').replace(/\.+$/,'').trim();
  if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(s)) s='_'+s;
  return s;
}
function makeFilename(suffix,ext){
  var dur=cfg().statDur||'';
  var base=currentFilename||'overlay';
  if(base.length>80) base=base.slice(0,80);
  var nm=sanitizeFilename(base+' - '+dur+' - '+suffix);
  return (nm||'overlay')+'.'+ext;
}


function cfg(){
  var c={}, el;
  for(var i=0;i<CONTROL_IDS.length;i++){
    el=document.getElementById(CONTROL_IDS[i]);
    if(el) c[CONTROL_IDS[i]]=(el.type==='checkbox')?el.checked:el.value;
  }
  el=document.getElementById('statDur');
  c.statDur=el?el.textContent:'';
  // Die Leinwand geht in jede Ausgabe ein, deshalb hier einmal geprueft.
  c.W=leinwandMass('compW',COMP_DESIGN_W);
  c.H=leinwandMass('compH',COMP_DESIGN_H);
  return c;
}

// Stufenweise Farbkanaele fuer Zonenfaerbung. Die Farbe soll springen, nicht
// ueberblenden, deshalb ein zweiter Keyframe ein Bild vor jedem Wechsel.
function zonenFarbkanaele(daten, wertFn, grenze2, grenze3, farbe1, farbe2, farbe3){
  var kf=buildKeyframeList(daten,function(p,i){
    var v=wertFn(p,i);
    return (v>=grenze3)?2:((v>=grenze2)?1:0);
  });
  if(!kf.length) return null;
  var farben=[farbe1,farbe2,farbe3];
  var r=[],g=[],b=[],letzte=-1;
  for(var i=0;i<kf.length;i++){
    var bild=kf[i][0], zone=kf[i][1];
    if(zone===letzte) continue;
    if(letzte>=0 && bild>0){
      var vor=bild-1, f=farben[letzte];
      r.push([vor,f[0]/255]); g.push([vor,f[1]/255]); b.push([vor,f[2]/255]);
    }
    var n=farben[zone];
    r.push([bild,n[0]/255]); g.push([bild,n[1]/255]); b.push([bild,n[2]/255]);
    letzte=zone;
  }
  return {r:r,g:g,b:b};
}

// Fuer After Effects: je Zone eine Ebene, umgeschaltet ueber die Deckkraft.
// Harte Wechsel, deshalb auch hier ein Keyframe ein Bild vor dem Sprung.
function zonenDeckkraft(daten, wertFn, grenze2, grenze3){
  var kf=buildKeyframeList(daten,function(p,i){
    var v=wertFn(p,i);
    return (v>=grenze3)?2:((v>=grenze2)?1:0);
  });
  if(!kf.length) return null;
  var aus=[[],[],[]], letzte=-1;
  for(var i=0;i<kf.length;i++){
    var bild=kf[i][0], zone=kf[i][1];
    if(zone===letzte) continue;
    for(var z=0;z<3;z++){
      if(letzte>=0 && bild>0) aus[z].push([bild-1, (z===letzte)?100:0]);
      aus[z].push([bild, (z===zone)?100:0]);
    }
    letzte=zone;
  }
  return aus;
}

function buildKeyframeList(dataArr, valueFn){
  var c=cfg();
  if(!dataArr || !dataArr.length) return [];
  var fps=parseFloat(c.fps);
  var offset=parseFloat(c.offset)||0;
  var drift=parseFloat(c.driftFactor)||1.0;
  var t0=(typeof rawPoints!=='undefined'&&rawPoints.length)?rawPoints[0].time:dataArr[0].time;
  var out=[],lf=-1;
  for(var i=0;i<dataArr.length;i++){
    var fr=Math.round(((dataArr[i].time-t0)/1000*drift+offset)*fps);
    if(fr>=0&&fr!==lf){ out.push([fr, valueFn(dataArr[i], i)]); lf=fr; }
  }
  return out;
}

function buildBezierSplineTool(name, keyframes, isPoint, indentTabs){

  var t=new Array((indentTabs||4)+1).join('\t');
  var L=[];
  L.push(t+name+' = BezierSpline {');
  L.push(t+'\tCtrlWZoom = false,');
  L.push(t+'\tNameSet = true,');
  L.push(t+'\tKeyFrames = {');
  for(var i=0;i<keyframes.length;i++){
    if(isPoint){
      var v=keyframes[i][1];
      L.push(t+'\t\t['+keyframes[i][0]+'] = { '+v[0].toFixed(6)+', '+v[1].toFixed(6)+' },');
    } else {
      L.push(t+'\t\t['+keyframes[i][0]+'] = { '+Number(keyframes[i][1]).toFixed(6)+' },');
    }
  }
  L.push(t+'\t}');
  L.push(t+'},');
  return L.join('\n');
}

function bezierSourceRefInput(sourceOpName){
  return 'Input { SourceOp = "'+sourceOpName+'", Source = "Value", }';
}

function buildPublishPolyLineTool(name, ptsArr, closed){
  var L=[];
  L.push('\t\t'+name+' = PublishPolyLine {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tInputs = {');
  L.push('\t\t\t\tValue = Input {');
  L.push('\t\t\t\t\tValue = Polyline {');
  if(closed) L.push('\t\t\t\t\t\tClosed = true,');
  L.push('\t\t\t\t\t\tPoints = {');
  L.push(polylineShapePointsLua(ptsArr, closed, false, '\t\t\t\t\t\t\t'));
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t},');
  L.push('\t\t\t},');
  L.push('\t\t},');
  return L.join('\n');
}
function buildPolyPathTool(name, displacementSourceOp, polylineSourceOp){
  var L=[];
  L.push('\t\t'+name+' = PolyPath {');
  L.push('\t\t\tInputs = {');
  L.push('\t\t\t\tDisplacement = Input { SourceOp = "'+displacementSourceOp+'", Source = "Value", },');
  L.push('\t\t\t\tPolyLine = Input { SourceOp = "'+polylineSourceOp+'", Source = "Value", }');
  L.push('\t\t\t},');
  L.push('\t\t},');
  return L.join('\n');
}

function polyPathPositionInput(polyPathName){
  return 'Input { SourceOp = "'+polyPathName+'", Source = "Position", }';
}

function buildDisplacementKeyframes(ptsArr){
  var cum=[0];
  for(var i=1;i<ptsArr.length;i++){
    cum.push(cum[i-1]+haversine(ptsArr[i-1].lat,ptsArr[i-1].lon,ptsArr[i].lat,ptsArr[i].lon));
  }
  var total=cum[cum.length-1];
  var frac=cum.map(function(c){return total>0?c/total:0;});
  return buildKeyframeList(ptsArr, function(p,i){return frac[i];});
}

function buildSetting(){
  var c=cfg();
  var W=c.W, H=c.H;
  var maxSpd=parseFloat(c.maxSpeed)||9;
  var unit=c.unit,u=unitDisplay(unit),ms=maxSpd.toFixed(2);
  var speedKF=buildKeyframeList(speedData,function(p){return Math.min(p.spd,maxSpd);});
  var bgRgb=hexToRgb(c.gaugeBgColor);
  var ringRgb=hexToRgb(c.gaugeRingColor);
  var arcRgb=hexToRgb(c.gaugeArcColor);
  var numRgb=hexToRgb(c.gaugeNumberColor);
  var unitRgb=hexToRgb(c.gaugeUnitColor);
  function f(c){return (c/255).toFixed(6);}

  var ROW_Y=100, STEP=110, x=0;
  function nextX(){ var v=x; x+=STEP; return v; }

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tSpeedOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "OverlayPosition", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 0, 0 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 566, 132.364, 283, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push('\t\t\t\tEllipse2 = EllipseMask {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground2 = Background {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "Ellipse2", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+f(bgRgb[0])+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+f(bgRgb[1])+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+f(bgRgb[2])+', },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = 0.433, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tEllipse1 = EllipseMask {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tBorderWidth = Input { Value = 0.013, },');
  L.push('\t\t\t\t\t\tSolid = Input { Value = 0, },');
  L.push('\t\t\t\t\t\tWritePosition = Input { Value = 0.62, },');
  L.push('\t\t\t\t\t\tWriteLength = Input { Value = -0.75, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 0.457, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.457, Expression = "Width", }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground1 = Background {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "Ellipse1", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+f(ringRgb[0])+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+f(ringRgb[1])+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+f(ringRgb[2])+', }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge1 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Background2", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Background1", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tCurrentSpeed = EllipseMask {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tSourceOp = "Ellipse1",');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { },');
  L.push('\t\t\t\t\t\tSettingsNest = Input { },');
  L.push('\t\t\t\t\t\tLayersNest = Input { },');
  L.push('\t\t\t\t\t\tBorderWidth = Input { Value = 0.018, },');
  L.push('\t\t\t\t\t\tWriteLength = Input { Value = -0.29525, Expression = "(-0.75/100)*Pre" },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.457, Expression = "Width" },');
  L.push('\t\t\t\t\t\tCommentsNest = Input { },');
  L.push('\t\t\t\t\t\tFrameRenderScriptNest = Input { },');
  L.push('\t\t\t\t\t\tStartRenderScripts = Input { },');
  L.push('\t\t\t\t\t\tEndRenderScripts = Input { },');
  L.push('\t\t\t\t\t\tPre = Input { Value = 39.3666666666667, Expression = "(ActiveSpeed/'+ms+')*100" },');
  L.push('\t\t\t\t\t\tActiveSpeed = '+bezierSourceRefInput('CurrentSpeedActiveSpeed')+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t\tUserControls = ordered() { Pre = { LINKID_DataType = "Number", INP_Integer = false, INP_MaxScale = 100, ICS_ControlPage = "Controls", INP_MinScale = 0, INPID_InputControl = "SliderControl", INP_SplineType = "Default", LINKS_Name = "Percentage", }, ActiveSpeed = { LINKS_Name = "Active Speed", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Integer = false, INP_MinScale = 0, INP_MaxScale = '+ms+', INP_MinAllowed = -1000000, INP_MaxAllowed = 1000000, INP_SplineType = "Default", ICS_ControlPage = "Controls" } }');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground3 = Background {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "CurrentSpeed", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+f(arcRgb[0])+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+f(arcRgb[1])+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+f(arcRgb[2])+', }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge2 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Merge1", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Background3", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tText1 = TextPlus {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+f(numRgb[0])+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+f(numRgb[1])+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+f(numRgb[2])+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input { Expression = "string.format( \\"%.1f\\", (CurrentSpeed.ActiveSpeed))\\n", },');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.2126, },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge3 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Merge2", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Text1", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tText2 = TextPlus {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tCharacterOffset = Input { Value = { 0, -0.178 }, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+f(unitRgb[0])+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+f(unitRgb[1])+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+f(unitRgb[2])+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input { Value = "'+u+'", },');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge4 = Merge {');
  L.push('\t\t\t\t\tCtrlWZoom = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Merge3", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Text2", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push(buildBezierSplineTool('CurrentSpeedActiveSpeed', speedKF, false));
  var vp=fusionVersatz(c,'speed',OVERLAY_MASSE.speed,320,760);
  L.push(buildTransformNode('OverlayPosition', 'Merge4', vp.dx, vp.dy, [1400,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push('\t},');
  L.push('\tActiveTool = "SpeedOverlay"');
  L.push('}');
  return L.join('\n');
}

var HEART_TOP_POINTS_LUA="\t\t\t\t\t\t\t\t\t{ X = 0.00329765375775326, Y = 0.223565745393635 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00664123100674162, Y = 0.232008535276052 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0159095427210991, Y = 0.251339407402033 },\n\t\t\t\t\t\t\t\t\t{ X = 0.029839646494717, Y = 0.272522237967087 },\n\t\t\t\t\t\t\t\t\t{ X = 0.114575966424056, Y = 0.375960430583971 },\n\t\t\t\t\t\t\t\t\t{ X = 0.253663503068628, Y = 0.401068427117909 },\n\t\t\t\t\t\t\t\t\t{ X = 0.348661038379859, Y = 0.370696609019697 },\n\t\t\t\t\t\t\t\t\t{ X = 0.404335974944705, Y = 0.326518121376747 },\n\t\t\t\t\t\t\t\t\t{ X = 0.43677510776632, Y = 0.287789659196456 },\n\t\t\t\t\t\t\t\t\t{ X = 0.466638493266867, Y = 0.226182028874071 },\n\t\t\t\t\t\t\t\t\t{ X = 0.47150914283105, Y = 0.159966632813094 },\n\t\t\t\t\t\t\t\t\t{ X = 0.469084367454681, Y = 0.0999570128068874 },\n\t\t\t\t\t\t\t\t\t{ X = 0.454118795724822, Y = 0.0579125281759237 },\n\t\t\t\t\t\t\t\t\t{ X = 0.444664945300876, Y = 0.0323773887825874 },\n\t\t\t\t\t\t\t\t\t{ X = 0.434141105932403, Y = 0.0120132658657918 },\n\t\t\t\t\t\t\t\t\t{ X = 0.430318109152018, Y = 0.00688729282999123 },\n\t\t\t\t\t\t\t\t\t{ X = 0.41080147802481, Y = 0.00744183358803691 },\n\t\t\t\t\t\t\t\t\t{ X = 0.398672362578892, Y = 0.00767062566598176 },\n\t\t\t\t\t\t\t\t\t{ X = 0.390699116482393, Y = 0.00809439651553475 },\n\t\t\t\t\t\t\t\t\t{ X = 0.385090180445213, Y = 0.00847867514230427 },\n\t\t\t\t\t\t\t\t\t{ X = 0.381174288891618, Y = 0.0131242840146851 },\n\t\t\t\t\t\t\t\t\t{ X = 0.367189813443885, Y = 0.0413767579570689 },\n\t\t\t\t\t\t\t\t\t{ X = 0.358158128516435, Y = 0.0444855662472243 },\n\t\t\t\t\t\t\t\t\t{ X = 0.3551969203435, Y = 0.0434492968171725 },\n\t\t\t\t\t\t\t\t\t{ X = 0.352235712170566, Y = 0.0409326424870466 },\n\t\t\t\t\t\t\t\t\t{ X = 0.350310926858158, Y = 0.0390081421169504 },\n\t\t\t\t\t\t\t\t\t{ X = 0.348386141545751, Y = 0.0361954108068098 },\n\t\t\t\t\t\t\t\t\t{ X = 0.342611785608528, Y = 0.0255366395262768 },\n\t\t\t\t\t\t\t\t\t{ X = 0.339502517026947, Y = 0.0196150999259807 },\n\t\t\t\t\t\t\t\t\t{ X = 0.333432040272431, Y = 0.006439674315322 },\n\t\t\t\t\t\t\t\t\t{ X = 0.313295824696476, Y = 0.00747594374537375 },\n\t\t\t\t\t\t\t\t\t{ X = 0.278894472361809, Y = 0.00795644891122282 },\n\t\t\t\t\t\t\t\t\t{ X = 0.27680067001675, Y = 0.00711892797319935 },\n\t\t\t\t\t\t\t\t\t{ X = 0.275544388609715, Y = 0.0056532663316583 },\n\t\t\t\t\t\t\t\t\t{ X = 0.27428810720268, Y = 0.00439698492462315 },\n\t\t\t\t\t\t\t\t\t{ X = 0.273241206030151, Y = 0.00251256281407031 },\n\t\t\t\t\t\t\t\t\t{ X = 0.272822445561139, Y = 0 },\n\t\t\t\t\t\t\t\t\t{ X = 0.271356783919598, Y = -0.00523450586264657 },\n\t\t\t\t\t\t\t\t\t{ X = 0.266394246387491, Y = -0.0481108437680686 },\n\t\t\t\t\t\t\t\t\t{ X = 0.262676734029166, Y = -0.0796135909393738 },\n\t\t\t\t\t\t\t\t\t{ X = 0.260307942852913, Y = -0.0494855281664076 },\n\t\t\t\t\t\t\t\t\t{ X = 0.25830916569664, Y = -0.0275005137684015 },\n\t\t\t\t\t\t\t\t\t{ X = 0.253923600829138, Y = 0.0165778567199526 },\n\t\t\t\t\t\t\t\t\t{ X = 0.244003553449808, Y = 0.0978389798754426 },\n\t\t\t\t\t\t\t\t\t{ X = 0.236156351791531, Y = 0.161584011843079 },\n\t\t\t\t\t\t\t\t\t{ X = 0.23304708320995, Y = 0.172094744633605 },\n\t\t\t\t\t\t\t\t\t{ X = 0.21720461948475, Y = 0.171650629163583 },\n\t\t\t\t\t\t\t\t\t{ X = 0.214983713355049, Y = 0.160251665433013 },\n\t\t\t\t\t\t\t\t\t{ X = 0.193257956448911, Y = 0.00157035175879394 },\n\t\t\t\t\t\t\t\t\t{ X = 0.192001675041876, Y = -0.00324539363484089 },\n\t\t\t\t\t\t\t\t\t{ X = 0.190117252931323, Y = -0.00240787269681747 },\n\t\t\t\t\t\t\t\t\t{ X = 0.188337520938023, Y = 0.00219849246231152 },\n\t\t\t\t\t\t\t\t\t{ X = 0.180485762144054, Y = 0.0149706867671691 },\n\t\t\t\t\t\t\t\t\t{ X = 0.174727805695142, Y = 0.0219849246231156 },\n\t\t\t\t\t\t\t\t\t{ X = 0.171901172529313, Y = 0.0264865996649917 },\n\t\t\t\t\t\t\t\t\t{ X = 0.164782244556114, Y = 0.0260678391959799 },\n\t\t\t\t\t\t\t\t\t{ X = 0.159024288107203, Y = 0.0172738693467337 },\n\t\t\t\t\t\t\t\t\t{ X = 0.153475711892797, Y = 0.0102072864321608 },\n\t\t\t\t\t\t\t\t\t{ X = 0.150806113902848, Y = 0.00759003350083753 },\n\t\t\t\t\t\t\t\t\t{ X = 0.134369765494137, Y = 0.00554857621440541 },\n\t\t\t\t\t\t\t\t\t{ X = 0.125052345058627, Y = 0.0193676716917923 },\n\t\t\t\t\t\t\t\t\t{ X = 0.116523541604975, Y = 0.0344189489267209 },\n\t\t\t\t\t\t\t\t\t{ X = 0.110453064850459, Y = 0.0450777202072539 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0980159905241339, Y = 0.0444855662472243 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0934261178560852, Y = 0.0338267949666914 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0803968018951732, Y = 0.010880829015544 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0795084394432928, Y = 0.00792005921539596 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0732899022801303, Y = 0.00762398223538119 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0654427006218538, Y = 0.00851221317542561 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0284275984601717, Y = 0.00792005921539596 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0197661905958437, Y = 0.00777133056077284 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0189772188244952, Y = -0.0200384162535804 },\n\t\t\t\t\t\t\t\t\t{ X = 0.011463567839196, Y = -0.0801926298157454 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00628140703517588, Y = -0.0409338358458961 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00460636515912893, Y = -0.0142378559463986 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00167504187604695, Y = 0.0208333333333334 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0134734971868523, Y = 0.150133254367782 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0153982824992597, Y = 0.171750074030204 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0352383772579212, Y = 0.172786496890731 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0376836060670542, Y = 0.149974715647133 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0570032573289902, Y = 0.0106603494225644 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0584838614154575, Y = -0.00436778205507843 },\n\t\t\t\t\t\t\t\t\t{ X = -0.061222978975422, Y = -0.00429375185075509 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0684779389991116, Y = 0.00866153390583357 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0745393634840871, Y = 0.0186348408710217 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0811871859296483, Y = 0.0270623953098827 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0886725293132328, Y = 0.025963149078727 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0943781407035176, Y = 0.0173785594639867 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0966289782244556, Y = 0.0125628140703518 },\n\t\t\t\t\t\t\t\t\t{ X = -0.100377640844634, Y = 0.00855934123203195 },\n\t\t\t\t\t\t\t\t\t{ X = -0.119627912040709, Y = 0.00606574957844963 },\n\t\t\t\t\t\t\t\t\t{ X = -0.127093802345059, Y = 0.0173785594639866 },\n\t\t\t\t\t\t\t\t\t{ X = -0.136976059599151, Y = 0.0350163333322173 },\n\t\t\t\t\t\t\t\t\t{ X = -0.140258080824615, Y = 0.0393622907282528 },\n\t\t\t\t\t\t\t\t\t{ X = -0.145272728140753, Y = 0.045527562249937 },\n\t\t\t\t\t\t\t\t\t{ X = -0.152913510152678, Y = 0.0455799073085635 },\n\t\t\t\t\t\t\t\t\t{ X = -0.157893715443271, Y = 0.0361128055773564 },\n\t\t\t\t\t\t\t\t\t{ X = -0.16750418760469, Y = 0.0196817420435511 },\n\t\t\t\t\t\t\t\t\t{ X = -0.170958961474037, Y = 0.0117252931323284 },\n\t\t\t\t\t\t\t\t\t{ X = -0.175565326633166, Y = 0.00670016750418756 },\n\t\t\t\t\t\t\t\t\t{ X = -0.199690430982273, Y = 0.00881638351663572 },\n\t\t\t\t\t\t\t\t\t{ X = -0.226495565131947, Y = 0.00820182121742841 },\n\t\t\t\t\t\t\t\t\t{ X = -0.230527638190955, Y = 0.00795644891122282 },\n\t\t\t\t\t\t\t\t\t{ X = -0.232830820770519, Y = 0.00125628140703515 },\n\t\t\t\t\t\t\t\t\t{ X = -0.239740368509213, Y = -0.0552763819095477 },\n\t\t\t\t\t\t\t\t\t{ X = -0.242619346733668, Y = -0.0704041038525963 },\n\t\t\t\t\t\t\t\t\t{ X = -0.245131909547739, Y = -0.054857621440536 },\n\t\t\t\t\t\t\t\t\t{ X = -0.247382747068677, Y = -0.0281616415410385 },\n\t\t\t\t\t\t\t\t\t{ X = -0.249144529527511, Y = -0.0116385525495407 },\n\t\t\t\t\t\t\t\t\t{ X = -0.255996446550192, Y = 0.0559668344684632 },\n\t\t\t\t\t\t\t\t\t{ X = -0.268433520876518, Y = 0.160349422564406 },\n\t\t\t\t\t\t\t\t\t{ X = -0.272727272727273, Y = 0.173230678116672 },\n\t\t\t\t\t\t\t\t\t{ X = -0.286496890731418, Y = 0.172786496890731 },\n\t\t\t\t\t\t\t\t\t{ X = -0.291234823808114, Y = 0.16020136215576 },\n\t\t\t\t\t\t\t\t\t{ X = -0.29774948178857, Y = 0.107491856677524 },\n\t\t\t\t\t\t\t\t\t{ X = -0.313147764287829, Y = -0.00103642286052708 },\n\t\t\t\t\t\t\t\t\t{ X = -0.31359194551377, Y = -0.00414569144210841 },\n\t\t\t\t\t\t\t\t\t{ X = -0.318181818181818, Y = 0.00340538939887469 },\n\t\t\t\t\t\t\t\t\t{ X = -0.328842167604383, Y = 0.0204323363932485 },\n\t\t\t\t\t\t\t\t\t{ X = -0.329434409238969, Y = 0.0279834172342316 },\n\t\t\t\t\t\t\t\t\t{ X = -0.343944329286349, Y = 0.0270950547823512 },\n\t\t\t\t\t\t\t\t\t{ X = -0.34572105419011, Y = 0.0196920343500148 },\n\t\t\t\t\t\t\t\t\t{ X = -0.351939591353272, Y = 0.0102161681966242 },\n\t\t\t\t\t\t\t\t\t{ X = -0.355493041160794, Y = 0.0075510808409831 },\n\t\t\t\t\t\t\t\t\t{ X = -0.429790984956368, Y = 0.0085538599497339 },\n\t\t\t\t\t\t\t\t\t{ X = -0.428568913067955, Y = 0.00876854909231772 },\n\t\t\t\t\t\t\t\t\t{ X = -0.452117676849551, Y = 0.0393934052209606 },\n\t\t\t\t\t\t\t\t\t{ X = -0.482743110520561, Y = 0.177582762170905 },\n\t\t\t\t\t\t\t\t\t{ X = -0.418534219279653, Y = 0.356557669865917 },\n\t\t\t\t\t\t\t\t\t{ X = -0.16887666730347, Y = 0.420869279922491 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0266107423700763, Y = 0.281859200383224 },\n\t\t\t\t\t\t\t\t\t{ X = -0.010556336183286, Y = 0.247021045194376 },\n\t\t\t\t\t\t\t\t\t{ X = 0.000601936665794389, Y = 0.217351478670505 },";
var HEART_TOP_KNOTS_LUA="0, 1, 2, 3, 3.167, 3.334, 3.501, 4.334, 5.334, 6.334, 7.334, 8.334, 9.334, 10.334, 10.601, 10.734, 11.334, 12.334, 13.334, 14.334, 15.334, 16.334, 17.334, 18.334, 19.334, 20.334, 21.334, 22.334, 23.334, 24.334, 25.334, 26.334, 27.334, 28.334, 29.334, 30.334, 31.334, 32.334, 33.334, 34.334, 35.334, 36.334, 37.334, 38.334, 39.334, 40.334, 41.334, 42.334, 43.334, 44.334, 45.334, 46.334, 47.334, 48.334, 49.334, 50.334, 51.334, 52.334, 53.334, 54.334, 55.334, 56.334, 57.334, 58.334, 59.334, 60.334, 61.334, 62.334, 63.334, 64.334, 65.334, 66.334, 67.334, 68.334, 69.334, 70.334, 71.334, 72.334, 73.334, 74.334, 75.334, 76.334, 77.334, 78.334, 79.334, 80.334, 81.334, 82.334, 83.334, 84.334, 85.334, 86.334, 87.334, 88.334, 89.334, 90.334, 91.334, 92.334, 93.334, 94.334, 95.334, 96.334, 97.334, 98.334, 99.334, 100.334, 101.334, 102.334, 103.334, 104.334, 105.334, 106.334, 107.334, 108.334, 109.334, 110.334, 111.334, 112.334, 113.334, 114.334, 115.334, 116.334, 117.334, 118.334, 119.334, 120.334, 121.334, 122.334, 123.334, 124.334, 125.334, 126.334, 127.334, 128.334, 129.334, 130.334, 131.334, 131.501, 132.334, 133.334";
var HEART_BOTTOM_POINTS_LUA="\t\t\t\t\t\t\t\t\t{ X = 0.0010816087218038, Y = -0.395655450921847 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00534821860936223, Y = -0.392429196462928 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00900033857279558, Y = -0.389755531989182 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0168629124906222, Y = -0.38468079741403 },\n\t\t\t\t\t\t\t\t\t{ X = 0.094025917841622, Y = -0.329963759440417 },\n\t\t\t\t\t\t\t\t\t{ X = 0.15846540374158, Y = -0.284113610047877 },\n\t\t\t\t\t\t\t\t\t{ X = 0.283575149132274, Y = -0.178045485198976 },\n\t\t\t\t\t\t\t\t\t{ X = 0.342422970013915, Y = -0.11639257791489 },\n\t\t\t\t\t\t\t\t\t{ X = 0.361889691278553, Y = -0.0936574972151565 },\n\t\t\t\t\t\t\t\t\t{ X = 0.3839249462985, Y = -0.0655649906709188 },\n\t\t\t\t\t\t\t\t\t{ X = 0.39846223428313, Y = -0.0468113975576662 },\n\t\t\t\t\t\t\t\t\t{ X = 0.419493441881502, Y = -0.0144730890999548 },\n\t\t\t\t\t\t\t\t\t{ X = 0.423790140208051, Y = -0.00972410673903212 },\n\t\t\t\t\t\t\t\t\t{ X = 0.414066033469019, Y = -0.00972410673903212 },\n\t\t\t\t\t\t\t\t\t{ X = 0.382632293080054, Y = -0.0101763907734057 },\n\t\t\t\t\t\t\t\t\t{ X = 0.374345615742667, Y = -0.00986643984281426 },\n\t\t\t\t\t\t\t\t\t{ X = 0.369426068038064, Y = -0.00273252569950616 },\n\t\t\t\t\t\t\t\t\t{ X = 0.364792713567839, Y = 0.00607202680066998 },\n\t\t\t\t\t\t\t\t\t{ X = 0.360631281407035, Y = 0.0140284757118928 },\n\t\t\t\t\t\t\t\t\t{ X = 0.358249581239531, Y = 0.0191059463986601 },\n\t\t\t\t\t\t\t\t\t{ X = 0.354716289782244, Y = 0.0130600921273032 },\n\t\t\t\t\t\t\t\t\t{ X = 0.348146984924623, Y = 0.000314070351758788 },\n\t\t\t\t\t\t\t\t\t{ X = 0.344168760469012, Y = -0.00748534338358453 },\n\t\t\t\t\t\t\t\t\t{ X = 0.342336683417085, Y = -0.00916038525963148 },\n\t\t\t\t\t\t\t\t\t{ X = 0.34123743718593, Y = -0.0102072864321608 },\n\t\t\t\t\t\t\t\t\t{ X = 0.336212311557789, Y = -0.0107307370184255 },\n\t\t\t\t\t\t\t\t\t{ X = 0.329983249581239, Y = -0.0104166666666667 },\n\t\t\t\t\t\t\t\t\t{ X = 0.326057370184255, Y = -0.0105737018425461 },\n\t\t\t\t\t\t\t\t\t{ X = 0.294702680067002, Y = -0.0102072864321608 },\n\t\t\t\t\t\t\t\t\t{ X = 0.289415829145729, Y = -0.0103119765494137 },\n\t\t\t\t\t\t\t\t\t{ X = 0.28821189279732, Y = -0.0147613065326633 },\n\t\t\t\t\t\t\t\t\t{ X = 0.287060301507538, Y = -0.0217755443886097 },\n\t\t\t\t\t\t\t\t\t{ X = 0.276329564489112, Y = -0.0979899497487437 },\n\t\t\t\t\t\t\t\t\t{ X = 0.27339824120603, Y = -0.122592127303183 },\n\t\t\t\t\t\t\t\t\t{ X = 0.27250837520938, Y = -0.128768844221106 },\n\t\t\t\t\t\t\t\t\t{ X = 0.267221524288107, Y = -0.13463149078727 },\n\t\t\t\t\t\t\t\t\t{ X = 0.259788525963149, Y = -0.134893216080402 },\n\t\t\t\t\t\t\t\t\t{ X = 0.253611809045226, Y = -0.133375209380235 },\n\t\t\t\t\t\t\t\t\t{ X = 0.250680485762144, Y = -0.125575795644891 },\n\t\t\t\t\t\t\t\t\t{ X = 0.248586683417085, Y = -0.104742462311558 },\n\t\t\t\t\t\t\t\t\t{ X = 0.237227805695142, Y = -0.000366415410385235 },\n\t\t\t\t\t\t\t\t\t{ X = 0.22660175879397, Y = 0.0904522613065326 },\n\t\t\t\t\t\t\t\t\t{ X = 0.224926716917923, Y = 0.104166666666667 },\n\t\t\t\t\t\t\t\t\t{ X = 0.221838358458961, Y = 0.0866834170854272 },\n\t\t\t\t\t\t\t\t\t{ X = 0.215556951423786, Y = 0.0324015912897823 },\n\t\t\t\t\t\t\t\t\t{ X = 0.207659902770553, Y = -0.031416763044217 },\n\t\t\t\t\t\t\t\t\t{ X = 0.203098827470687, Y = -0.0390494137353434 },\n\t\t\t\t\t\t\t\t\t{ X = 0.193729061976549, Y = -0.0405150753768845 },\n\t\t\t\t\t\t\t\t\t{ X = 0.18498743718593, Y = -0.0280569514237856 },\n\t\t\t\t\t\t\t\t\t{ X = 0.179020100502513, Y = -0.0192106365159129 },\n\t\t\t\t\t\t\t\t\t{ X = 0.170958961474037, Y = -0.00544388609715241 },\n\t\t\t\t\t\t\t\t\t{ X = 0.168708123953099, Y = -0.000994556113902867 },\n\t\t\t\t\t\t\t\t\t{ X = 0.16750418760469, Y = -0.00528685092127301 },\n\t\t\t\t\t\t\t\t\t{ X = 0.163578308207705, Y = -0.0108877721943048 },\n\t\t\t\t\t\t\t\t\t{ X = 0.152585845896147, Y = -0.0105213567839196 },\n\t\t\t\t\t\t\t\t\t{ X = 0.124005443886097, Y = -0.0108877721943049 },\n\t\t\t\t\t\t\t\t\t{ X = 0.118561557788945, Y = -0.00800879396984927 },\n\t\t\t\t\t\t\t\t\t{ X = 0.110448073701842, Y = 0.00837520938023451 },\n\t\t\t\t\t\t\t\t\t{ X = 0.107307370184255, Y = 0.0145519262981575 },\n\t\t\t\t\t\t\t\t\t{ X = 0.105056532663317, Y = 0.0182160804020101 },\n\t\t\t\t\t\t\t\t\t{ X = 0.102701005025126, Y = 0.0125628140703518 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0931742043551089, Y = -0.00528685092127301 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0914991624790621, Y = -0.00779941373534337 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0873115577889448, Y = -0.0111494974874372 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0654836683417085, Y = -0.0100502512562814 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0436034338358459, Y = -0.0101549413735343 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0393634840871022, Y = -0.00942211055276382 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0369032663316583, Y = -0.0128245393634841 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0363274706867671, Y = -0.019001256281407 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0317734505862647, Y = -0.0525020938023451 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0235552763819096, Y = -0.110134003350084 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0207286432160805, Y = -0.127198492462312 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0157558626465661, Y = -0.135207286432161 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00664782244556117, Y = -0.135416666666667 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00141331658291455, Y = -0.12944932998325 },\n\t\t\t\t\t\t\t\t\t{ X = -0.00206219690002298, Y = -0.121840912429824 },\n\t\t\t\t\t\t\t\t\t{ X = -0.00314070351758794, Y = -0.0956867671691792 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0226130653266332, Y = 0.0904522613065326 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0266061226258616, Y = 0.111660995777615 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0301507537688442, Y = 0.0820770519262981 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0450440447109334, Y = -0.0323117921385743 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0465985639203494, Y = -0.0386779184247538 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0600710637352876, Y = -0.0403064623584277 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0640683988452143, Y = -0.0312754459989636 },\n\t\t\t\t\t\t\t\t\t{ X = -0.074023895468993, Y = -0.0159563567255791 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0802798134576949, Y = -0.00536679250869793 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0832408024280109, Y = -0.000703234880450043 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0865719150196165, Y = -0.00743948478791912 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0893108298171589, Y = -0.0103264490339774 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0952327395162113, Y = -0.0101095417236688 },\n\t\t\t\t\t\t\t\t\t{ X = -0.128321859501073, Y = -0.0104004737582353 },\n\t\t\t\t\t\t\t\t\t{ X = -0.133207491302095, Y = -0.00884595454881937 },\n\t\t\t\t\t\t\t\t\t{ X = -0.136834702790732, Y = -0.00255385298689764 },\n\t\t\t\t\t\t\t\t\t{ X = -0.141061671440943, Y = 0.00477061417811925 },\n\t\t\t\t\t\t\t\t\t{ X = -0.144903397734843, Y = 0.012769264934488 },\n\t\t\t\t\t\t\t\t\t{ X = -0.14749426308387, Y = 0.0186172181508624 },\n\t\t\t\t\t\t\t\t\t{ X = -0.15030720260567, Y = 0.0123251165889408 },\n\t\t\t\t\t\t\t\t\t{ X = -0.155470862048843, Y = 0.00224295509108357 },\n\t\t\t\t\t\t\t\t\t{ X = -0.160004441483455, Y = -0.00581094085424533 },\n\t\t\t\t\t\t\t\t\t{ X = -0.162225183211193, Y = -0.00966022651565624 },\n\t\t\t\t\t\t\t\t\t{ X = -0.167554963357762, Y = -0.010548523206751 },\n\t\t\t\t\t\t\t\t\t{ X = -0.188503801760545, Y = -0.0103897620005463 },\n\t\t\t\t\t\t\t\t\t{ X = -0.207746478491014, Y = -0.0107546996326667 },\n\t\t\t\t\t\t\t\t\t{ X = -0.216263231919461, Y = -0.0100303501369458 },\n\t\t\t\t\t\t\t\t\t{ X = -0.217595676956103, Y = -0.0163224516988674 },\n\t\t\t\t\t\t\t\t\t{ X = -0.218335924198682, Y = -0.0270560367162632 },\n\t\t\t\t\t\t\t\t\t{ X = -0.227218891109631, Y = -0.0860537419498113 },\n\t\t\t\t\t\t\t\t\t{ X = -0.233066844326005, Y = -0.126397216670368 },\n\t\t\t\t\t\t\t\t\t{ X = -0.235065511880968, Y = -0.134836035235769 },\n\t\t\t\t\t\t\t\t\t{ X = -0.251721074838996, Y = -0.135650307202606 },\n\t\t\t\t\t\t\t\t\t{ X = -0.254904137982086, Y = -0.122473906284699 },\n\t\t\t\t\t\t\t\t\t{ X = -0.277185579983715, Y = 0.0844251980161374 },\n\t\t\t\t\t\t\t\t\t{ X = -0.28088681619661, Y = 0.104337848841513 },\n\t\t\t\t\t\t\t\t\t{ X = -0.283403656821378, Y = 0.0846472721889111 },\n\t\t\t\t\t\t\t\t\t{ X = -0.296135909393737, Y = -0.0160263528018358 },\n\t\t\t\t\t\t\t\t\t{ X = -0.298627157061256, Y = -0.0305037920772282 },\n\t\t\t\t\t\t\t\t\t{ X = -0.300429343400696, Y = -0.0384558442519801 },\n\t\t\t\t\t\t\t\t\t{ X = -0.313087571248797, Y = -0.0403064623584277 },\n\t\t\t\t\t\t\t\t\t{ X = -0.318713450292398, Y = -0.0309793471019321 },\n\t\t\t\t\t\t\t\t\t{ X = -0.334184617662299, Y = -0.00751350951217705 },\n\t\t\t\t\t\t\t\t\t{ X = -0.337293656081131, Y = -0.000111037086386878 },\n\t\t\t\t\t\t\t\t\t{ X = -0.339588422533126, Y = -0.00544081723295586 },\n\t\t\t\t\t\t\t\t\t{ X = -0.341365015915316, Y = -0.00869790510030349 },\n\t\t\t\t\t\t\t\t\t{ X = -0.34580649937079, Y = -0.0101783995854615 },\n\t\t\t\t\t\t\t\t\t{ X = -0.412724850099933, Y = -0.0101043748612036 },\n\t\t\t\t\t\t\t\t\t{ X = -0.418572803316308, Y = -0.0101783995854615 },\n\t\t\t\t\t\t\t\t\t{ X = -0.416500111037086, Y = -0.0140276852468725 },\n\t\t\t\t\t\t\t\t\t{ X = -0.411040252896729, Y = -0.0232807757791102 },\n\t\t\t\t\t\t\t\t\t{ X = -0.350816582914573, Y = -0.105841708542714 },\n\t\t\t\t\t\t\t\t\t{ X = -0.272194304857621, Y = -0.185929648241206 },\n\t\t\t\t\t\t\t\t\t{ X = -0.190117252931323, Y = -0.257118927973199 },\n\t\t\t\t\t\t\t\t\t{ X = -0.101549413735343, Y = -0.323492462311558 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0349664991624791, Y = -0.370917085427136 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0158515611028081, Y = -0.384066372323409 },\n\t\t\t\t\t\t\t\t\t{ X = -0.00695379824977622, Y = -0.390187199716325 },\n\t\t\t\t\t\t\t\t\t{ X = -0.00391115918238408, Y = -0.393253415936144 },";
var HEART_BOTTOM_KNOTS_LUA="0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142";

function buildHeartShapeNode(name, pointsLua, knotsLua, pos, W, H){
  var L=[];
  L.push('\t\t\t\t'+name+' = BSplineMask {');
  L.push('\t\t\t\t\tDrawMode = "ModifyOnly",');
  L.push('\t\t\t\t\tDrawMode2 = "InsertAndModify",');
  L.push('\t\t\t\t\tCtrlWZoom = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tPolyline = Input {');
  L.push('\t\t\t\t\t\t\tValue = BSplinePolyline {');
  L.push('\t\t\t\t\t\t\t\tClosed = true,');
  L.push('\t\t\t\t\t\t\t\tPoints = {');
  L.push('\t\t\t\t\t\t\t\t\t'+pointsLua);
  L.push('\t\t\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\t\t\tOrder = 4,');
  L.push('\t\t\t\t\t\t\t\tType = "Tensioned",');
  L.push('\t\t\t\t\t\t\t\tKnots = { '+knotsLua+' }');
  L.push('\t\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tPolyline2 = Input {');
  L.push('\t\t\t\t\t\t\tValue = BSplinePolyline { Order = 4, Type = "Tensioned", Knots = { } },');
  L.push('\t\t\t\t\t\t\tDisabled = true,');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return L.join('\n');
}

function buildDotMaskNode(name, centerInput, diaPx, pos, w, h){
  w=w||1920; h=h||1080;

  var frac=diaPx/h;
  var L=[];
  L.push('\t\t\t\t'+name+' = EllipseMask {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+w+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+h+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+frac.toFixed(6)+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+frac.toFixed(6)+', Expression = "Width", },');
  L.push('\t\t\t\t\t\tCenter = '+centerInput+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return L.join('\n');
}

function forceHsvValue(rgb, targetV){
  var maxC=Math.max(rgb[0],rgb[1],rgb[2]);
  if(maxC<=0) return [targetV*255, targetV*255, targetV*255];
  var k=(targetV*255)/maxC;
  return [rgb[0]*k, rgb[1]*k, rgb[2]*k];
}
function buildBackgroundNode(name, maskSourceOp, rgb, pos, alpha, w, h){
  w=w||1920; h=h||1080;
  var L=[];
  L.push('\t\t\t\t'+name+' = Background {');
  L.push('\t\t\t\t\tInputs = {');
  if(maskSourceOp) L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "'+maskSourceOp+'", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+w+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+h+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+(rgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+(rgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+(rgb[2]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = '+(alpha===undefined?1:alpha).toFixed(6)+', },');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return L.join('\n');
}
// Feste Beschriftung ohne Keyframes - fuer die Hoehenzahlen am Rand des
// Profils. Lage als Mittelpunkt in normierten Koordinaten.
function buildStaticTextNode(name, text, rgb, size, center01, pos, w, h, treiber, ausdruck){
  var L=[];
  L.push('\t\t\t\t'+name+' = TextPlus {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+w+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+h+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { '+center01.x.toFixed(6)+', '+center01.y.toFixed(6)+' }, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+(rgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+(rgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+(rgb[2]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  if(treiber){
    L.push('\t\t\t\t\t\tStyledText = Input {');
    L.push('\t\t\t\t\t\t\tValue = "'+String(text).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'",');
    L.push('\t\t\t\t\t\t\tExpression = "'+ausdruck.replace(/"/g,'\\"')+'",');
    L.push('\t\t\t\t\t\t},');
    L.push('\t\t\t\t\t\tWert = '+bezierSourceRefInput(treiber)+',');
  } else {
    L.push('\t\t\t\t\t\tStyledText = Input { Value = "'+String(text).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'", },');
  }
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = '+size.toFixed(6)+', },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tAdvancedFontControls = Input { Value = 1, },');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  if(treiber)
    L.push('\t\t\t\t\tUserControls = ordered() { Wert = { LINKS_Name = "Value", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Integer = false, INP_MinScale = 0, INP_MaxScale = 1000, INP_MinAllowed = -1000000, INP_MaxAllowed = 1000000, ICS_ControlPage = "Text" } }');
  L.push('\t\t\t\t},');
  return L.join('\n');
}

// Verschiebt die ganze Gruppe. Fusion misst den Mittelpunkt normiert vom
// linken unteren Bildrand; 0.5/0.5 laesst alles, wo es ist.
function buildTransformNode(name, sourceOp, dx, dy, pos, winkelTreiber){
  var L=[];
  L.push('\t\t\t\t'+name+' = Transform {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { '+(0.5+dx).toFixed(6)+', '+(0.5+dy).toFixed(6)+' }, },');
  // Fusion dreht gegen den Uhrzeigersinn, eine Kompasspeilung im Uhrzeigersinn.
  // Der Winkel haengt an einem eigenen Bedienelement und wird per Ausdruck
  // uebernommen - dasselbe Muster wie beim Bogen des Tachos.
  if(winkelTreiber){
    L.push('\t\t\t\t\t\tAngle = Input { Value = 0, Expression = "Peilung" },');
    L.push('\t\t\t\t\t\tPeilung = '+bezierSourceRefInput(winkelTreiber)+',');
  }
  L.push('\t\t\t\t\t\tInput = Input { SourceOp = "'+sourceOp+'", Source = "Output", },');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  if(winkelTreiber)
    L.push('\t\t\t\t\tUserControls = ordered() { Peilung = { LINKS_Name = "Heading", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Integer = false, INP_MinScale = -720, INP_MaxScale = 720, INP_MinAllowed = -1000000, INP_MaxAllowed = 1000000, ICS_ControlPage = "Controls" } }');
  L.push('\t\t\t\t},');
  return L.join('\n');
}

function buildMergeNode(name, bgOp, fgOp, pos){
  return '\t\t\t\t'+name+' = Merge {\n\t\t\t\t\tInputs = {\n\t\t\t\t\t\tBackground = Input { SourceOp = "'+bgOp+'", Source = "Output", },\n\t\t\t\t\t\tForeground = Input { SourceOp = "'+fgOp+'", Source = "Output", },\n\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, },\n\t\t\t\t\t},\n\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },\n\t\t\t\t},';
}

var OVERLAY_BRIGHTNESS_FACTOR=0.82;
function buildBrightnessNode(name, sourceOp, pos){
  var L=[];
  L.push('\t\t\t\t'+name+' = BrightnessContrast {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tInput = Input { SourceOp = "'+sourceOp+'", Source = "Output", },');
  L.push('\t\t\t\t\t\tRedBrightness = Input { Value = '+OVERLAY_BRIGHTNESS_FACTOR+', },');
  L.push('\t\t\t\t\t\tGreenBrightness = Input { Value = '+OVERLAY_BRIGHTNESS_FACTOR+', },');
  L.push('\t\t\t\t\t\tBlueBrightness = Input { Value = '+OVERLAY_BRIGHTNESS_FACTOR+', },');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return L.join('\n');
}
function toFusionMaskCoord(px, py, W, H){

  return { x: px/W - 0.5, y: 0.5 - (py/H) };
}

function polylinePointHandles(ptsArr, i, closed){
  var n=ptsArr.length;
  var prev=ptsArr[i>0?i-1:(closed?n-1:0)];
  var next=ptsArr[i<n-1?i+1:(closed?0:n-1)];
  var dx=(next.x-prev.x)/6, dy=(next.y-prev.y)/6;
  return { LX:-dx, LY:-dy, RX:dx, RY:dy };
}
function polylineShapePointsLua(ptsArr, closed, smooth, indent){
  var pad=indent||'\t\t\t\t\t\t';
  var L=[];
  var n=ptsArr.length;
  for(var i=0;i<n;i++){
    if(smooth){
      var h=polylinePointHandles(ptsArr,i,closed);
      var parts=['Linear = true','X = '+ptsArr[i].x.toFixed(6),'Y = '+ptsArr[i].y.toFixed(6)];

      if(closed || i>0) { parts.push('LX = '+h.LX.toFixed(6)); parts.push('LY = '+h.LY.toFixed(6)); }
      if(closed || i<n-1) { parts.push('RX = '+h.RX.toFixed(6)); parts.push('RY = '+h.RY.toFixed(6)); }
      L.push(pad+'{ '+parts.join(', ')+', },');
    } else {
      L.push(pad+'{ Linear = true, X = '+ptsArr[i].x.toFixed(6)+', Y = '+ptsArr[i].y.toFixed(6)+', },');
    }
  }
  return L.join('\n');
}

function buildPolylineShapeNodes(maskName, splineToolName, pts, closed, solid, borderWidthFrac, smooth, pos, w, h, publishSourceOp, borderWidthExpr){
  w=w||1920; h=h||1080;
  var L=[];
  L.push('\t\t\t\t'+maskName+' = PolylineMask {');
  L.push('\t\t\t\t\tDrawMode = "ModifyOnly",');
  L.push('\t\t\t\t\tDrawMode2 = "InsertAndModify",');
  L.push('\t\t\t\t\tCtrlWZoom = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tSolid = Input { Value = '+(solid?1:0)+', },');
  if(!solid){
    if(borderWidthExpr){

      L.push('\t\t\t\t\t\tBorderWidth = Input { Value = '+borderWidthFrac.toFixed(6)+', Expression = "'+borderWidthExpr+'", },');
    } else {
      L.push('\t\t\t\t\t\tBorderWidth = Input { Value = '+borderWidthFrac.toFixed(6)+', },');
    }
  }
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+w+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+h+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  if(publishSourceOp){

    L.push('\t\t\t\t\t\tPolyline = Input {');
    L.push('\t\t\t\t\t\t\tSourceOp = "'+publishSourceOp+'",');
    L.push('\t\t\t\t\t\t\tSource = "Value",');
    L.push('\t\t\t\t\t\t},');
  } else {
    L.push('\t\t\t\t\t\tPolyline = Input {');
    L.push('\t\t\t\t\t\t\tValue = Polyline {');
    if(closed) L.push('\t\t\t\t\t\t\t\tClosed = true,');
    L.push('\t\t\t\t\t\t\t\tPoints = {');
    L.push(polylineShapePointsLua(pts, closed, smooth, '\t\t\t\t\t\t\t\t\t'));
    L.push('\t\t\t\t\t\t\t\t}');
    L.push('\t\t\t\t\t\t\t},');
    L.push('\t\t\t\t\t\t},');
  }
  L.push('\t\t\t\t\t\tPolyline2 = Input {');
  L.push('\t\t\t\t\t\t\tValue = Polyline { },');
  L.push('\t\t\t\t\t\t\tDisabled = true,');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return { node: L.join('\n'), sibling: '' };
}

function buildRouteSetting(){
  var c=cfg();
  var W=c.W, H=c.H;
  var tW=parseFloat(c.trackW)||4;
  var sW=tW*SHADOW_WIDTH_RATIO;
  var sOf=zahlOderVorgabe(c.shadowOffset,5);
  var dR=parseFloat(c.dotR)||8;
  var tc=hexToRgb(c.trackColor);
  var sc=hexToRgb(c.shadowColor);
  var dc=hexToRgb(c.dotColor);

  // Beide Spuren teilen sich einen Rahmen, sonst laegen sie nicht uebereinander.
  // Gerechnet wird mit derselben Projektion wie in der Vorschau und in After
  // Effects; mit rohen Gradzahlen waere die Strecke in unseren Breiten um gut
  // die Haelfte zu breit.
  var rahmen=rawPoints.concat(ghostPoints);
  var pr=projiziere(rahmen);

  var shadowDotDiaPxPre=dR*2*1.15;
  var MARGIN=Math.ceil(shadowDotDiaPxPre/2)+Math.ceil(sOf)+6;
  var boxW=W-MARGIN*2, boxH=H-MARGIN*2;
  var sw=boxW,sh=sw*(pr.hoehe/pr.breite); if(sh>boxH){sh=boxH;sw=sh*(pr.breite/pr.hoehe);}
  var padX=(W-sw)/2, padY=(H-sh)/2;
  function aufLeinwand(i){
    return { px:padX+(pr.xs[i]-pr.mnx)/pr.breite*sw,
             py:padY+sh-(pr.ys[i]-pr.mny)/pr.hoehe*sh };
  }
  var pxPts=[];
  for(var i=0;i<rawPoints.length;i++) pxPts.push(aufLeinwand(i));
  var maskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px,p.py,W,H);});
  var sOxPx=sOf, sOyPx=-sOf;
  var shadowMaskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px+sOxPx,p.py-sOyPx,W,H);});

  var dotCenter01=pxPts.map(function(p){return {x:p.px/W, y:1-(p.py/H)};});
  var dispKF=buildDisplacementKeyframes(rawPoints);
  var dotDiaPx=dR*2, shadowDotDiaPx=dR*2*1.15;

  var geistPts=[];
  for(var g=rawPoints.length; g<rahmen.length; g++){
    var q=aufLeinwand(g);
    geistPts.push(toFusionMaskCoord(q.px, q.py, W, H));
  }
  var gW=parseFloat(c.ghostW)||4;
  var gc=hexToRgb(c.ghostColor||'#8892a4');
  var gAlpha=Math.max(0.05,Math.min(1,zahlOderVorgabe(c.ghostAlpha,0.55)));
  var geistShape=geistPts.length>1
    ? buildPolylineShapeNodes('GhostPath','GhostPathPolyline',geistPts,false,false,gW/H,false,[0,250], W, H)
    : null;

  var mainShape=buildPolylineShapeNodes('MainPath','MainPathPolyline',maskPts,false,false,tW/H,false,[0,50], W, H,'Publish1');
  var shadowShape=buildPolylineShapeNodes('ShadowPath','ShadowPathPolyline',shadowMaskPts,false,false,sW/H,false,[0,150], W, H,undefined,'MainPath.BorderWidth*'+SHADOW_WIDTH_RATIO.toFixed(6));

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tRouteOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "BrightAdjust", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 0, 0 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 566, 132.364, 283, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push(buildBackgroundNode('BackgroundCanvas', null, [0,0,0], [-100,100], 0, W, H));
  L.push(shadowShape.node);
  L.push(buildBackgroundNode('BackgroundShadow', 'ShadowPath', sc, [100,150], undefined, W, H));
  L.push(mainShape.node);
  L.push(buildBackgroundNode('BackgroundMain', 'MainPath', tc, [100,50], undefined, W, H));
  var unterlage='BackgroundShadow';
  if(geistShape){
    L.push(geistShape.node);
    L.push(buildBackgroundNode('BackgroundGhost', 'GhostPath', gc, [100,250], gAlpha, W, H));
    L.push(buildMergeNode('MergeGhost', 'BackgroundGhost', 'BackgroundShadow', [200,200]));
    unterlage='MergeGhost';
  }
  L.push(buildMergeNode('Merge1', unterlage, 'BackgroundMain', [200,100]));
  L.push(buildDotMaskNode('OutlineDotMask', 'Input { Value = { '+dotCenter01[0].x.toFixed(6)+', '+dotCenter01[0].y.toFixed(6)+' }, Expression = "MainDotMask.Center", }', shadowDotDiaPx, [300,150], W, H));
  L.push(buildBackgroundNode('BackgroundOutlineDot', 'OutlineDotMask', sc, [400,150], undefined, W, H));
  L.push(buildMergeNode('Merge2', 'Merge1', 'BackgroundOutlineDot', [500,100]));
  L.push(buildDotMaskNode('MainDotMask', polyPathPositionInput('Path1'), dotDiaPx, [300,50], W, H));
  L.push(buildBackgroundNode('BackgroundMainDot', 'MainDotMask', dc, [400,50], undefined, W, H));
  L.push(buildMergeNode('Merge3', 'Merge2', 'BackgroundMainDot', [600,100]));
  L.push(buildMergeNode('Merge4', 'BackgroundCanvas', 'Merge3', [700,100]));
  L.push(buildBrightnessNode('BrightAdjust', 'Merge4', [800,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push(buildPublishPolyLineTool('Publish1', maskPts, false));
  L.push(buildPolyPathTool('Path1', 'Path1Displacement', 'Publish1'));
  L.push(buildBezierSplineTool('Path1Displacement', dispKF, false, 2));
  L.push('\t},');
  L.push('\tActiveTool = "RouteOverlay",');
  L.push('}');
  return L.join('\n');
}

// Rundes Streckenoverlay: dieselbe Strecke wie das grosse, aber in eine Scheibe
// eingepasst statt auf die ganze Leinwand. Alles entsteht um die Bildmitte
// herum, der Transform am Ende bringt die Gruppe an ihren Ankerpunkt.
function buildRouteDiscSetting(){
  var c=cfg();
  var W=c.W, H=c.H;
  if(rawPoints.length<2) return null;
  var k=Math.min(W/ENTWURF_W, H/ENTWURF_H);
  var dEntwurf=Math.max(0.08, Math.min(1, zahlOderVorgabe(c.discSize,0.34)))*ENTWURF_H;
  var D=dEntwurf*k;

  var tW=parseFloat(c.discTrackW)||3;
  var sW=tW*SHADOW_WIDTH_RATIO;
  var sOf=zahlOderVorgabe(c.discShadowOffset,3);
  var dR=parseFloat(c.discDotR)||6;
  var ringAn=(c.discRing==='1');
  var ringW=parseFloat(c.discRingW)||3;
  var tc=hexToRgb(c.discTrackColor||'#ff6600');
  var sc=hexToRgb(c.discShadowColor||'#000000');
  var dc=hexToRgb(c.discDotColor||'#fca300');
  var bg=hexToRgb(c.discBgColor||'#000000');
  var rc=hexToRgb(c.discRingColor||'#ffffff');
  var bgAlpha=Math.max(0, Math.min(1, zahlOderVorgabe(c.discBgAlpha,0.45)));

  var rand=Math.ceil(dR*1.15)+Math.ceil(sOf)+Math.ceil(ringAn?ringW:0)+4;
  var einpassen=kreisEinpassung(D, rand);
  if(!einpassen) return null;
  var mx=W/2, my=H/2;
  function aufLeinwand(i){ var v=einpassen(i); return {px:mx+v.x, py:my+v.y}; }

  var pxPts=[], i;
  for(i=0;i<rawPoints.length;i++) pxPts.push(aufLeinwand(i));
  var maskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px,p.py,W,H);});
  var shadowMaskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px+sOf,p.py+sOf,W,H);});
  var dotCenter01=pxPts.map(function(p){return {x:p.px/W, y:1-(p.py/H)};});
  var geistPts=[];
  for(var g=0; g<ghostPoints.length; g++){
    var q=aufLeinwand(rawPoints.length+g);
    geistPts.push(toFusionMaskCoord(q.px, q.py, W, H));
  }
  var gW=parseFloat(c.ghostW)||4;
  var gc=hexToRgb(c.ghostColor||'#8892a4');
  var gAlpha=Math.max(0.05, Math.min(1, zahlOderVorgabe(c.ghostAlpha,0.55)));
  var dispKF=buildDisplacementKeyframes(rawPoints);
  // Anteil der zurueckgelegten Strecke in Prozent, fuer den Ring am Rand.
  var fortschrittAn=(c.discProgress!=='0');
  var pW=parseFloat(c.discProgressW)||5;
  var pc=hexToRgb(c.discProgressColor||'#ff6600');
  var fortschrittKF=(fortschrittAn&&distData.length&&totalDistM>0)
    ? buildKeyframeList(distData,function(p){ return Math.max(0,Math.min(100,p.distM/totalDistM*100)); })
    : null;
  if(!fortschrittKF||!fortschrittKF.length) fortschrittAn=false;

  var geistShape=geistPts.length>1
    ? buildPolylineShapeNodes('GhostPath','GhostPathPolyline',geistPts,false,false,(gW*k)/H,false,[0,300],W,H)
    : null;
  var mainShape=buildPolylineShapeNodes('MainPath','MainPathPolyline',maskPts,false,false,(tW*k)/H,false,[0,50],W,H,'Publish1');
  var shadowShape=buildPolylineShapeNodes('ShadowPath','ShadowPathPolyline',shadowMaskPts,false,false,(sW*k)/H,false,[0,150],W,H,undefined,'MainPath.BorderWidth*'+SHADOW_WIDTH_RATIO.toFixed(6));

  function ellipse(name, durchmesser, solide, randbreite, pos, treiber){
    var L=[];
    L.push('\t\t\t\t'+name+' = EllipseMask {');
    L.push('\t\t\t\t\tInputs = {');
    L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
    if(!solide){
      L.push('\t\t\t\t\t\tBorderWidth = Input { Value = '+(randbreite/W).toFixed(6)+', },');
      L.push('\t\t\t\t\t\tSolid = Input { Value = 0, },');
    }
    if(treiber){
      // Oben beginnen und im Uhrzeigersinn fuellen. Der Anteil kommt als
      // Prozentwert aus einer Keyframe-Kurve, wie beim Bogen des Tachos.
      L.push('\t\t\t\t\t\tWritePosition = Input { Value = 0.25, },');
      L.push('\t\t\t\t\t\tWriteLength = Input { Value = 0, Expression = "(-1/100)*Fortschritt" },');
      L.push('\t\t\t\t\t\tFortschritt = '+bezierSourceRefInput(treiber)+',');
    }
    L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+W+', },');
    L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+H+', },');
    L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
    L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
    L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
    L.push('\t\t\t\t\t\tWidth = Input { Value = '+(durchmesser/W).toFixed(6)+', },');
    L.push('\t\t\t\t\t\tHeight = Input { Value = '+(durchmesser/W).toFixed(6)+', Expression = "Width", }');
    L.push('\t\t\t\t\t},');
    L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
    if(treiber)
      L.push('\t\t\t\t\tUserControls = ordered() { Fortschritt = { LINKS_Name = "Progress", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Integer = false, INP_MinScale = 0, INP_MaxScale = 100, INP_MinAllowed = 0, INP_MaxAllowed = 100, ICS_ControlPage = "Controls" } }');
    L.push('\t\t\t\t},');
    return L.join('\n');
  }

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tRouteDiscOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "OverlayPosition", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 0, 0 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 566, 132.364, 283, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push(buildBackgroundNode('BackgroundCanvas', null, [0,0,0], [-100,100], 0, W, H));
  var lastBg='BackgroundCanvas', mergeN=0, xPos=0;
  function chain(nextBg){
    mergeN++; xPos+=100;
    var name='Merge'+mergeN;
    L.push(buildMergeNode(name, lastBg, nextBg, [xPos,100]));
    lastBg=name;
  }
  L.push(ellipse('DiscMask', D, true, 0, [0,-50]));
  L.push(buildBackgroundNode('BackgroundDisc', 'DiscMask', bg, [100,-50], bgAlpha, W, H));
  chain('BackgroundDisc');
  if(ringAn){
    L.push(ellipse('RingMask', D, false, ringW*k, [0,-150]));
    L.push(buildBackgroundNode('BackgroundRing', 'RingMask', rc, [100,-150], undefined, W, H));
    chain('BackgroundRing');
  }
  if(geistShape){
    L.push(geistShape.node);
    L.push(buildBackgroundNode('BackgroundGhost', 'GhostPath', gc, [100,300], gAlpha, W, H));
    chain('BackgroundGhost');
  }
  if(fortschrittAn){
    L.push(ellipse('ProgressMask', D, false, pW*k, [0,-250], 'ProgressDrive'));
    L.push(buildBackgroundNode('BackgroundProgress', 'ProgressMask', pc, [100,-250], undefined, W, H));
    chain('BackgroundProgress');
  }
  L.push(shadowShape.node);
  L.push(buildBackgroundNode('BackgroundShadow', 'ShadowPath', sc, [100,150], undefined, W, H));
  chain('BackgroundShadow');
  L.push(mainShape.node);
  L.push(buildBackgroundNode('BackgroundMain', 'MainPath', tc, [100,50], undefined, W, H));
  chain('BackgroundMain');
  L.push(buildDotMaskNode('OutlineDotMask', 'Input { Value = { '+dotCenter01[0].x.toFixed(6)+', '+dotCenter01[0].y.toFixed(6)+' }, Expression = "MainDotMask.Center", }', dR*2*1.15*k, [400,150], W, H));
  L.push(buildBackgroundNode('BackgroundOutlineDot', 'OutlineDotMask', sc, [500,150], undefined, W, H));
  chain('BackgroundOutlineDot');
  L.push(buildDotMaskNode('MainDotMask', polyPathPositionInput('Path1'), dR*2*k, [400,50], W, H));
  L.push(buildBackgroundNode('BackgroundMainDot', 'MainDotMask', dc, [500,50], undefined, W, H));
  chain('BackgroundMainDot');
  L.push(buildBrightnessNode('BrightAdjust', lastBg, [xPos+100,100]));
  if(fortschrittAn) L.push(buildBezierSplineTool('ProgressDrive', fortschrittKF, false));
  var altX=ANKER_RAND+dEntwurf/2, altY=ENTWURF_H-ANKER_RAND-dEntwurf/2;
  var vp=fusionVersatz(c,'disc',{b:dEntwurf,h:dEntwurf},altX,altY);
  L.push(buildTransformNode('OverlayPosition', 'BrightAdjust', vp.dx, vp.dy, [xPos+200,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push(buildPublishPolyLineTool('Publish1', maskPts, false));
  L.push(buildPolyPathTool('Path1', 'Path1Displacement', 'Publish1'));
  L.push(buildBezierSplineTool('Path1Displacement', dispKF, false, 2));
  L.push('\t},');
  L.push('\tActiveTool = "RouteDiscOverlay",');
  L.push('}');
  return L.join('\n');
}

// Kompass: feste Skala, drehender Pfeil. Die Geschwindigkeit steht als Zahl
// rechts unten und zusaetzlich als Pegel am linken Rand der Skala.
function buildCompassSetting(){
  var c=cfg();
  var W=c.W, H=c.H;
  if(rawPoints.length<2||!headingData.length) return null;
  var k=Math.min(W/ENTWURF_W, H/ENTWURF_H);
  var dEntwurf=Math.max(0.10, Math.min(1, zahlOderVorgabe(c.compassSize,0.30)))*ENTWURF_H;
  var D=dEntwurf*k, R=D/2;
  var mx=W/2, my=H/2;

  var skalaFarbe=hexToRgb(c.compassScaleColor||'#ffffff');
  var pfeilFarbe=hexToRgb(c.compassArrowColor||'#e5484d');
  var pegelFarbe=hexToRgb(c.compassLevelColor||'#3b82f6');
  var textFarbe=hexToRgb(c.compassTextColor||'#ffffff');
  var strich=(parseFloat(c.compassTickW)||3)*k;
  var pegelBreite=(parseFloat(c.compassLevelW)||6)*k;

  var maxSpd=parseFloat(c.maxSpeed)||9;
  var einheit=unitDisplay(c.unit);
  var richtung=stetigerWinkel(headingData);
  var winkelKF=buildKeyframeList(richtung,function(p){ return -p.deg; });
  var tempoKF=buildKeyframeList(speedData,function(p){ return Math.max(0,Math.min(100,p.spd/maxSpd*100)); });
  var zahlKF=buildKeyframeList(speedData,function(p){ return Math.min(p.spd,maxSpd); });
  if(!winkelKF.length||!tempoKF.length) return null;

  function aufKreis(gradVonNorden, radius){
    var a=(gradVonNorden-90)*Math.PI/180;      // 0 Grad = oben
    return { px:mx+Math.cos(a)*radius, py:my+Math.sin(a)*radius };
  }

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tCompassOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "OverlayPosition", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 0, 0 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 566, 132.364, 283, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push(buildBackgroundNode('BackgroundCanvas', null, [0,0,0], [-100,100], 0, W, H));
  var lastBg='BackgroundCanvas', mergeN=0, xPos=0;
  function chain(nextBg){
    mergeN++; xPos+=100;
    var name='Merge'+mergeN;
    L.push(buildMergeNode(name, lastBg, nextBg, [xPos,100]));
    lastBg=name;
  }

  // Sechzehn Striche als Skala, der bei Norden laenger
  for(var t=0;t<16;t++){
    var grad=t*22.5;
    var haupt=(grad===0);
    var aussen=R, innen=R-(haupt?R*0.22:R*0.13);
    var a=aufKreis(grad,aussen), b=aufKreis(grad,innen);
    var nm='Tick'+t;
    L.push(buildPolylineShapeNodes(nm, nm+'Polyline',
      [toFusionMaskCoord(a.px,a.py,W,H), toFusionMaskCoord(b.px,b.py,W,H)],
      false, false, strich/H, false, [0,-400+t*24], W, H).node);
    L.push(buildBackgroundNode('Bg'+nm, nm, skalaFarbe, [100,-400+t*24], undefined, W, H));
    chain('Bg'+nm);
  }

  // Nur Norden wird beschriftet, innerhalb der Skala. Der Ring selbst ist die
  // Geschwindigkeitsskala.
  var np=aufKreis(0, R-R*0.38);
  L.push(buildStaticTextNode('DirN', 'N', skalaFarbe, (R*0.26)/H,
    {x:np.px/W, y:1-(np.py/H)}, [200,-400], W, H));
  chain('DirN');

  // Pegel ueber den ganzen Kreis: unten beginnen, gegen den Uhrzeigersinn
  L.push('\t\t\t\tLevelMask = EllipseMask {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tBorderWidth = Input { Value = '+(pegelBreite/W).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tSolid = Input { Value = 0, },');
  L.push('\t\t\t\t\t\tWritePosition = Input { Value = 0.75, },');
  L.push('\t\t\t\t\t\tWriteLength = Input { Value = 0, Expression = "(1/100)*Tempo" },');
  L.push('\t\t\t\t\t\tTempo = '+bezierSourceRefInput('CompassLevel')+',');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+(D/W).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+(D/W).toFixed(6)+', Expression = "Width", }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 300, -300 } },');
  L.push('\t\t\t\t\tUserControls = ordered() { Tempo = { LINKS_Name = "Speed", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Integer = false, INP_MinScale = 0, INP_MaxScale = 100, INP_MinAllowed = 0, INP_MaxAllowed = 100, ICS_ControlPage = "Controls" } }');
  L.push('\t\t\t\t},');
  L.push(buildBackgroundNode('BackgroundLevel', 'LevelMask', pegelFarbe, [400,-300], undefined, W, H));
  chain('BackgroundLevel');

  // Der Pfeil zeigt nach oben und wird gedreht
  var pf=[[0,-R*0.62],[-R*0.17,R*0.12],[0,R*0.02],[R*0.17,R*0.12]];
  var pfeilPts=pf.map(function(p){ return toFusionMaskCoord(mx+p[0], my+p[1], W, H); });
  L.push(buildPolylineShapeNodes('ArrowShape','ArrowPolyline',pfeilPts,true,true,0,false,[300,-200],W,H).node);
  L.push(buildBackgroundNode('BackgroundArrow', 'ArrowShape', pfeilFarbe, [400,-200], undefined, W, H));
  L.push(buildTransformNode('ArrowRotate', 'BackgroundArrow', 0, 0, [500,-200], 'CompassHeading'));
  chain('ArrowRotate');

  // Geschwindigkeit als Zahl, rechts unterhalb der Mitte
  var zp={x:(mx+R*0.30)/W, y:1-((my+R*0.32)/H)};
  var ep={x:(mx+R*0.26)/W, y:1-((my+R*0.70)/H)};
  L.push(buildStaticTextNode('SpeedValue','0',textFarbe,(R*0.46)/H, zp,[600,-100],W,H,
    'CompassSpeed','string.format("%.0f", Wert)'));
  chain('SpeedValue');
  L.push(buildStaticTextNode('SpeedUnit',einheit,textFarbe,(R*0.17)/H, ep,[600,-60],W,H));
  chain('SpeedUnit');

  L.push(buildBrightnessNode('BrightAdjust', lastBg, [xPos+100,100]));
  L.push(buildBezierSplineTool('CompassHeading', winkelKF, false));
  L.push(buildBezierSplineTool('CompassLevel', tempoKF, false));
  L.push(buildBezierSplineTool('CompassSpeed', zahlKF, false));
  var altX=ANKER_RAND+dEntwurf/2, altY=ENTWURF_H-ANKER_RAND-dEntwurf/2;
  var vp=fusionVersatz(c,'compass',{b:dEntwurf,h:dEntwurf},altX,altY);
  L.push(buildTransformNode('OverlayPosition', 'BrightAdjust', vp.dx, vp.dy, [xPos+200,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push('\t},');
  L.push('\tActiveTool = "CompassOverlay",');
  L.push('}');
  return L.join('\n');
}

function buildElevSetting(){
  var c=cfg();
  var W=c.W, H=c.H;
  var elevPts=rawPoints.filter(function(p){return p.ele!==null && !isNaN(p.ele);});
  if(!elevPts.length) return null;
  var lc=hexToRgb(c.elevColor);
  var dc=hexToRgb(c.elevDotColor);
  var fillOn=c.elevFill==='1';
  var fillC=hexToRgb(c.elevFillColor);
  var lw=parseFloat(c.elevLineW)||2;
  var sc=hexToRgb(c.elevShadowColor);
  var sOf=zahlOderVorgabe(c.elevShadowOffset,4);
  var sw=lw*SHADOW_WIDTH_RATIO;

  var FULL_CW=W, FULL_CH=H;
  // Breiter als die Leinwand ergibt kein Bild; der Vorgabewert folgt ihr.
  var GRAPH_W=Math.min(W, parseInt(c.elevW)||W);
  var GRAPH_H=Math.min(H, parseInt(c.elevH)||300);
  // Derselbe Bodenabstand wie in After Effects, im Entwurfsmass gerechnet.
  var EK=entwurfsFaktor(c);
  var MARGIN_BOTTOM=120*EK;
  var OFFSET_X=Math.max(0,(FULL_CW-GRAPH_W)/2);
  var BAND_TOP=FULL_CH-MARGIN_BOTTOM-GRAPH_H, BAND_BOTTOM=FULL_CH-MARGIN_BOTTOM;
  var CW=FULL_CW, CH=FULL_CH;

  var dotDiaPx=12, shadowDotDiaPx=12*1.15;
  var MARGIN_X=Math.ceil(dotDiaPx/2)+6;
  var xy=buildElevXY(elevPts,GRAPH_W-MARGIN_X*2,GRAPH_H,0);
  var pxPts=[];
  for(var i=0;i<xy.xs.length;i++) pxPts.push({px:xy.xs[i]+OFFSET_X+MARGIN_X, py:BAND_TOP+xy.ys[i]});
  var maskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px,p.py,CW,CH);});

  var sOxPx=sOf, sOyPx=-sOf;
  var shadowMaskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px+sOxPx,p.py-sOyPx,CW,CH);});
  var dotCenter01=pxPts.map(function(p){return {x:p.px/CW, y:1-(p.py/CH)};});

  var dispKF=buildDisplacementKeyframes(elevPts);

  var mainShape=buildPolylineShapeNodes('MainPath','MainPathPolyline',maskPts,false,false,lw/CH,true,[0,50],CW,CH,'Publish1');
  var shadowShape=buildPolylineShapeNodes('ShadowPath','ShadowPathPolyline',shadowMaskPts,false,false,sw/CH,true,[0,150],CW,CH,undefined,'MainPath.BorderWidth*'+SHADOW_WIDTH_RATIO.toFixed(6));

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tElevationOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "OverlayPosition", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 0, 0 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 676, 132.364, 338, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push(buildBackgroundNode('BackgroundCanvas', null, [0,0,0], [-100,100], 0, CW, CH));
  var lastBg='BackgroundCanvas', mergeN=0, xPos=0;
  function chain(nextBg){
    mergeN++; xPos+=100;
    var name='Merge'+mergeN;
    L.push(buildMergeNode(name, lastBg, nextBg, [xPos,100]));
    lastBg=name;
  }
  if(fillOn){
    var fillMaskPts=maskPts.concat([
      toFusionMaskCoord(pxPts[pxPts.length-1].px, BAND_BOTTOM, CW, CH),
      toFusionMaskCoord(pxPts[0].px, BAND_BOTTOM, CW, CH)
    ]);
    var fillShape=buildPolylineShapeNodes('FillPath','FillPathPolyline',fillMaskPts,true,true,0,false,[0,150],CW,CH);
    L.push(fillShape.node);

    L.push(buildBackgroundNode('BackgroundFill', 'FillPath', forceHsvValue(fillC,0.76), [100,150], 0.15, CW, CH));
    chain('BackgroundFill');
  }
  L.push(shadowShape.node);
  L.push(buildBackgroundNode('BackgroundShadow', 'ShadowPath', sc, [100,150], undefined, CW, CH));
  chain('BackgroundShadow');
  L.push(mainShape.node);
  L.push(buildBackgroundNode('BackgroundMain', 'MainPath', lc, [100,50], undefined, CW, CH));
  chain('BackgroundMain');
  L.push(buildDotMaskNode('OutlineDotMask', 'Input { Value = { '+dotCenter01[0].x.toFixed(6)+', '+dotCenter01[0].y.toFixed(6)+' }, Expression = "MainDotMask.Center", }', shadowDotDiaPx, [300,150], CW, CH));
  L.push(buildBackgroundNode('BackgroundOutlineDot', 'OutlineDotMask', sc, [400,150], undefined, CW, CH));
  chain('BackgroundOutlineDot');
  L.push(buildDotMaskNode('MainDotMask', polyPathPositionInput('Path1'), dotDiaPx, [300,50], CW, CH));
  L.push(buildBackgroundNode('BackgroundMainDot', 'MainDotMask', dc, [400,50], undefined, CW, CH));
  chain('BackgroundMainDot');
  // Die Hoehenzahlen am linken Rand des Bandes. Das Haekchen steuerte sie
  // bisher nur in der Vorschau auf der Seite.
  if(c.elevLabels){
    var marken=hoehenMarken(xy.minEle, xy.maxEle, c.unit);
    var beschX=OFFSET_X+MARGIN_X+Math.max(28, GRAPH_H*0.18);
    var einzug=Math.max(8, GRAPH_H*0.06);
    var hoehenY=[BAND_TOP+einzug, BAND_TOP+GRAPH_H/2, BAND_TOP+GRAPH_H-einzug];
    var beschGroesse=(GRAPH_H*0.09)/CH;
    for(var m=0;m<marken.length;m++){
      var nm='ElevLabel'+m;
      L.push(buildStaticTextNode(nm, marken[m], lc, beschGroesse,
        {x:beschX/CW, y:1-(hoehenY[m]/CH)}, [500,200+m*60], CW, CH));
      chain(nm);
    }
  }
  L.push(buildBrightnessNode('BrightAdjust', lastBg, [xPos+100,100]));
  // Das Profil liegt in der Vorgabe unten und ueber die ganze Breite. Sein
  // Mittelpunkt ist nicht die Bildmitte, deshalb bekommt die Rechnung die
  // tatsaechliche Lage mit.
  var massElev={b:GRAPH_W/EK, h:GRAPH_H/EK};
  var vp=fusionVersatz(c,'elev',massElev,
                       ANKER_RAND+massElev.b/2, ENTWURF_H-120-massElev.h/2,
                       {x:(OFFSET_X+GRAPH_W/2)/CW, y:1-((BAND_TOP+GRAPH_H/2)/CH)});
  L.push(buildTransformNode('OverlayPosition', 'BrightAdjust', vp.dx, vp.dy, [xPos+200,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push(buildPublishPolyLineTool('Publish1', maskPts, false));
  L.push(buildPolyPathTool('Path1', 'Path1Displacement', 'Publish1'));
  L.push(buildBezierSplineTool('Path1Displacement', dispKF, false, 2));
  L.push('\t},');
  L.push('\tActiveTool = "ElevationOverlay",');
  L.push('}');
  return L.join('\n');
}

function buildHRSetting(){
  var c=cfg();
  var W=c.W, H=c.H;
  var hrKF=buildKeyframeList(hrData,function(p){return Math.round(p.hr);});
  var textRgb=hexToRgb(c.hrColor);
  var textSize=parseFloat(c.hrSize)||0.07;

  var heartRgb=hexToRgb(c.hrHeartColor);
  var hrZonen = c.hrZones ? zonenFarbkanaele(hrData,function(p){return p.hr;},
    parseFloat(c.hrZone2)||140, parseFloat(c.hrZone3)||165,
    hexToRgb(c.hrColor), hexToRgb(c.hrColor2), hexToRgb(c.hrColor3)) : null;
  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tHeartRate = GroupOperator {');
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
  L.push('\t\t\t\t\t\tWidth = Input { Value = 0.378, },');
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
  L.push(buildHeartShapeNode('HeartTop', HEART_TOP_POINTS_LUA, HEART_TOP_KNOTS_LUA, [992,-40], W, H));
  L.push(buildBackgroundNode('BackgroundHeartTop', 'HeartTop', heartRgb, [1050,-40], undefined, W, H));
  L.push(buildHeartShapeNode('HeartBottom', HEART_BOTTOM_POINTS_LUA, HEART_BOTTOM_KNOTS_LUA, [992,60], W, H));
  L.push(buildBackgroundNode('BackgroundHeartBottom', 'HeartBottom', heartRgb, [1050,60], undefined, W, H));
  L.push(buildMergeNode('MergeHeart', 'BackgroundHeartBottom', 'BackgroundHeartTop', [1080,10]));

  L.push('\t\t\t\tTransform1 = Transform {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.520292207792207, 0.536075036075035 }, },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.73, },');
  L.push('\t\t\t\t\t\tAspect = Input { Value = 1.89, },');
  L.push('\t\t\t\t\t\tInput = Input { SourceOp = "MergeHeart", Source = "Output", }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 995.865, 63.1539 } },');
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
  if(hrZonen){
    L.push('\t\t\t\t\t\tRed1 = '+bezierSourceRefInput('Text2ZoneR')+',');
    L.push('\t\t\t\t\t\tGreen1 = '+bezierSourceRefInput('Text2ZoneG')+',');
    L.push('\t\t\t\t\t\tBlue1 = '+bezierSourceRefInput('Text2ZoneB')+',');
  } else {
    L.push('\t\t\t\t\t\tRed1 = Input { Value = '+(textRgb[0]/255).toFixed(6)+', },');
    L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+(textRgb[1]/255).toFixed(6)+', },');
    L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+(textRgb[2]/255).toFixed(6)+', },');
  }
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input {');
  L.push('\t\t\t\t\t\t\tValue = "0",');
  L.push('\t\t\t\t\t\t\tExpression = "floor(NumberDrive)",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = '+textSize.toFixed(6)+', },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tAdvancedFontControls = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tNumberDrive = '+bezierSourceRefInput('Text2NumberDrive')+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1122.34, 17.956 } },');
  L.push('\t\t\t\t\tUserControls = ordered() { NumberDrive = { LINKS_Name = "HR Number", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Integer = false, INP_MinScale = 0, INP_MaxScale = 400, INP_MinAllowed = -1000000, INP_MaxAllowed = 1000000, INP_SplineType = "Default", ICS_ControlPage = "Text" } }');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge2 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Background2",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Transform1",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.446, 0.493 }, },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.11, },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 994.119, 85.8139 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge3 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Merge2",');
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
  L.push(buildBezierSplineTool('Text2NumberDrive', hrKF, false));
  if(hrZonen){
    L.push(buildBezierSplineTool('Text2ZoneR', hrZonen.r, false));
    L.push(buildBezierSplineTool('Text2ZoneG', hrZonen.g, false));
    L.push(buildBezierSplineTool('Text2ZoneB', hrZonen.b, false));
  }
  var vp=fusionVersatz(c,'hr',OVERLAY_MASSE.hr,250,880);
  L.push(buildTransformNode('OverlayPosition', 'Merge3', vp.dx, vp.dy, [1400,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push('\t}');
  L.push('}');
  return L.join('\n');
}

function buildInclineSetting(){
  var c=cfg();
  var W=c.W, H=c.H;
  var unit=c.inclineUnit;

  var exprStr = (unit==='deg')
    ? "string.format('%.1f°', math.atan(NumberDrive/100) * (180/math.pi))"
    : "string.format('%.1f%%', NumberDrive)";
  var inclineKF=buildKeyframeList(gradeData,function(p){return p.pct;});
  var numRgb=hexToRgb(c.inclineNumberColor);
  var rF=(numRgb[0]/255).toFixed(6), gF=(numRgb[1]/255).toFixed(6), bF=(numRgb[2]/255).toFixed(6);
  var wedgeRgb=hexToRgb(c.inclineWedgeColor);
  var wrF=(wedgeRgb[0]/255).toFixed(6), wgF=(wedgeRgb[1]/255).toFixed(6), wbF=(wedgeRgb[2]/255).toFixed(6);

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tInclineOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "OverlayPosition", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 1275.33, 161.303 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 609.971, 221.966, 356.091, 105.215 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { -990.532, -3.75992 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push('\t\t\t\tText2 = TextPlus {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.496927803379416, 0.53551912568306 }, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+rF+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+gF+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+bF+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input {');
  L.push('\t\t\t\t\t\t\tValue = "0",');
  L.push('\t\t\t\t\t\t\tExpression = "'+exprStr.replace(/"/g,'\\"')+'",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tAdvancedFontControls = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tNumberDrive = '+bezierSourceRefInput('Text2Incline')+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 850.688, 7.56683 } },');
  L.push('\t\t\t\t\tUserControls = ordered() { NumberDrive = { INP_MaxAllowed = 1000000, INP_Integer = false, INPID_InputControl = "SliderControl", INP_MaxScale = 50, INP_MinScale = -50, INP_MinAllowed = -1000000, LINKID_DataType = "Number", ICS_ControlPage = "Text", INP_SplineType = "Default", LINKS_Name = "Incline" } }');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge3 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Background1", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Text2", Source = "Output", },');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.538, 0.51 }, },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 868.343, 70.2387 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground1 = Background {');
  L.push('\t\t\t\t\tCtrlWShown = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 723.717, 81.7559 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge1 = Merge {');
  L.push('\t\t\t\t\tCtrlWShown = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Merge3", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Background2", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1030.64, 70.9487 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tPolygon1 = PolylineMask {');
  L.push('\t\t\t\t\tDrawMode = "InsertAndModify",');
  L.push('\t\t\t\t\tDrawMode2 = "InsertAndModify",');
  L.push('\t\t\t\t\tCtrlWShown = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.510123208175441, 0.453313943239908 }, },');
  L.push('\t\t\t\t\t\tPolyline = Input { SourceOp = "Polygon1Polyline", Source = "Value", },');
  L.push('\t\t\t\t\t\tPolyline2 = Input { Value = Polyline { }, Disabled = true, },');
  L.push('\t\t\t\t\t\tXRotation = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Polygon1InclineWedge",');
  L.push('\t\t\t\t\t\t\tSource = "Value",');
  L.push('\t\t\t\t\t\t\tExpression = "Text2.NumberDrive - 90",');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1038.34, -37.3808 } },');
  L.push('\t\t\t\t\tUserControls = ordered() {');
  L.push('\t\t\t\t\t\tXRotation = {');
  L.push('\t\t\t\t\t\t\tINP_MaxAllowed = 1000000,');
  L.push('\t\t\t\t\t\t\tINP_Integer = false,');
  L.push('\t\t\t\t\t\t\tINPID_InputControl = "SliderControl",');
  L.push('\t\t\t\t\t\t\tINP_MaxScale = 180,');
  L.push('\t\t\t\t\t\t\tINP_Default = 0,');
  L.push('\t\t\t\t\t\t\tINP_MinScale = -180,');
  L.push('\t\t\t\t\t\t\tINP_MinAllowed = -1000000,');
  L.push('\t\t\t\t\t\t\tLINKID_DataType = "Number",');
  L.push('\t\t\t\t\t\t\tICS_ControlPage = "Controls",');
  L.push('\t\t\t\t\t\t\tINP_SplineType = "Default",');
  L.push('\t\t\t\t\t\t\tLINKS_Name = "InclineWedge"');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t}');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground2 = Background {');
  L.push('\t\t\t\t\tCtrlWShown = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "Polygon1", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+wrF+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+wgF+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+wbF+', }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1035.79, 16.1895 } },');
  L.push('\t\t\t\t}');
  var vp=fusionVersatz(c,'incline',OVERLAY_MASSE.incline,260,880);
  L.push(buildTransformNode('OverlayPosition', 'Merge1', vp.dx, vp.dy, [1400,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push(buildBezierSplineTool('Text2Incline', inclineKF, false, 2));

  L.push('\t\tPolygon1Polyline = BezierSpline {');
  L.push('\t\t\tSplineColor = { Red = 173, Green = 255, Blue = 47 },');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tKeyFrames = {');
  L.push('\t\t\t\t[0] = { 0, Flags = { Linear = true, LockedY = true }, Value = Polyline {');
  L.push('\t\t\t\t\t\tClosed = true,');
  L.push('\t\t\t\t\t\tPoints = {');
  L.push('\t\t\t\t\t\t\t{ Linear = true, X = -0.0602901178603808, Y = -0.05, LX = 0.0498640072529465, LY = 0.0553763440860215, RX = 0.0501662133575098, RY = 0 },');
  L.push('\t\t\t\t\t\t\t{ Linear = true, X = 0.0902085222121487, Y = -0.05, LX = -0.0501662133575098, LY = 0, RX = -0.00030220610456333, RY = 0.0553763440860215 },');
  L.push('\t\t\t\t\t\t\t{ Linear = true, X = 0.0893019038984587, Y = 0.116129032258064, LX = 0.00030220610456333, LY = -0.0553763440860215, RX = -0.0498640072529465, RY = -0.0553763440860215 }');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t} }');
  L.push('\t\t\t}');
  L.push('\t\t},');

  L.push('\t\tPolygon1InclineWedge = BezierSpline {');
  L.push('\t\t\tSplineColor = { Red = 172, Green = 229, Blue = 95 },');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tKeyFrames = { [0] = { 0, Flags = { Linear = true } } }');
  L.push('\t\t}');
  L.push('\t},');
  L.push('\tActiveTool = "InclineOverlay",');
  L.push('}');
  return L.join('\n');
}

function buildMileSetting(){
  var c=cfg();
  var W=c.W, H=c.H;
  var unit=c.unit;
  var unitLabel = unit==='mph' ? 'Miles' : 'Kilometers';

  var totalDispDist = unit==='mph' ? totalDistM/1609.344 : totalDistM/1000;
  if(!isFinite(totalDispDist) || totalDispDist<=0) totalDispDist = 1;
  var mileKF=buildKeyframeList(distData,function(p){return unit==='mph' ? p.distM/1609.344 : p.distM/1000;});
  var mileDec=parseInt(c.mileDecimals,10)||1;
  var lineDistRgb=hexToRgb(c.mileLineDistColor);
  var mileTextRgb=hexToRgb(c.mileColor);

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tDistanceOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = {');
  L.push('\t\t\t\tMainOutput1 = InstanceOutput {');
  L.push('\t\t\t\t\tSourceOp = "OverlayPosition",');
  L.push('\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t}');
  L.push('\t\t\t},');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 595.031, 46.5379 },');
  L.push('\t\t\t\tFlags = {');
  L.push('\t\t\t\t\tAllowPan = false,');
  L.push('\t\t\t\t\tAutoSnap = true,');
  L.push('\t\t\t\t\tRemoveRouters = true');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tSize = { 750.999, 163.053, 424.166, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push('\t\t\t\tBackgroundcolor = Background {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "BackroundRectangle",');
  L.push('\t\t\t\t\t\t\tSource = "Mask",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = 0.433, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -332.685, 103.554 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge = Merge {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Backgroundcolor",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Color",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -182.666, 102.205 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tNumber = TextPlus {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tCenter = Input {');
  L.push('\t\t\t\t\t\t\tValue = { 0.559145418095033, 0.538291 },');
  L.push('\t\t\t\t\t\t\tExpression = "Point(0.2875 + Rectangle3.Width, 0.538291)",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+(mileTextRgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+(mileTextRgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+(mileTextRgb[2]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input { Expression = "string.format(\\"%.'+mileDec+'f\\", Rectangle3.SPLData)", },');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.0472, },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -27.6667, 21.4893 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge2 = Merge {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Merge",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Number",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -31.6663, 103.455 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge3 = Merge {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Merge2",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Unit",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 149, 94.9699 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackroundRectangle = RectangleMask {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 0.433, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.024, },');
  L.push('\t\t\t\t\t\tCornerRadius = Input { Value = 0.543, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -347.838, 22.6754 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tRectangle3 = RectangleMask {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tCenter = Input {');
  L.push('\t\t\t\t\t\t\tValue = { 0.423322709047516, 0.5 },');
  L.push('\t\t\t\t\t\t\tExpression = "Point(0.2875 + Width/2, 0.5)",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tWidth = Input {');
  L.push('\t\t\t\t\t\t\tValue = 0.271645418095033,');
  L.push('\t\t\t\t\t\t\tExpression = "min(max(SPLData / SPLMax, 0), 1) * 0.425",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.012, },');
  L.push('\t\t\t\t\t\tCornerRadius = Input { Value = 0.543, },');
  L.push('\t\t\t\t\t\tSPLMax = Input { Value = '+totalDispDist.toFixed(6)+', },');
  L.push('\t\t\t\t\t\tSPLData = '+bezierSourceRefInput('Rectangle3SPLData')+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -192, 14.4082 } },');
  L.push('\t\t\t\t\tUserControls = ordered() {');
  L.push('\t\t\t\t\t\tSPLData = {');
  L.push('\t\t\t\t\t\t\tLINKS_Name = "Distance Traveled (SPL)",');
  L.push('\t\t\t\t\t\t\tLINKID_DataType = "Number",');
  L.push('\t\t\t\t\t\t\tINPID_InputControl = "SliderControl",');
  L.push('\t\t\t\t\t\t\tINP_Integer = false,');
  L.push('\t\t\t\t\t\t\tINP_MinScale = 0,');
  L.push('\t\t\t\t\t\t\tINP_MaxScale = '+totalDispDist.toFixed(6)+',');
  L.push('\t\t\t\t\t\t\tINP_MinAllowed = 0,');
  L.push('\t\t\t\t\t\t\tINP_MaxAllowed = '+totalDispDist.toFixed(6)+',');
  L.push('\t\t\t\t\t\t\tINP_SplineType = "Default",');
  L.push('\t\t\t\t\t\t\tICS_ControlPage = "Controls"');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tSPLMax = {');
  L.push('\t\t\t\t\t\t\tLINKS_Name = "Total Target Distance",');
  L.push('\t\t\t\t\t\t\tLINKID_DataType = "Number",');
  L.push('\t\t\t\t\t\t\tINPID_InputControl = "SliderControl",');
  L.push('\t\t\t\t\t\t\tINP_Integer = false,');
  L.push('\t\t\t\t\t\t\tINP_MinScale = 0.100000001490116,');
  L.push('\t\t\t\t\t\t\tINP_MaxScale = '+totalDispDist.toFixed(6)+',');
  L.push('\t\t\t\t\t\t\tINP_MinAllowed = 0.00100000004749745,');
  L.push('\t\t\t\t\t\t\tINP_MaxAllowed = '+totalDispDist.toFixed(6)+',');
  L.push('\t\t\t\t\t\t\tINP_SplineType = "Default",');
  L.push('\t\t\t\t\t\t\tICS_ControlPage = "Controls"');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t}');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tColor = Background {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Rectangle3",');
  L.push('\t\t\t\t\t\t\tSource = "Mask",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+(lineDistRgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+(lineDistRgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+(lineDistRgb[2]/255).toFixed(6)+', }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -184.666, 59.7804 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tUnit = TextPlus {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+W+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+H+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tCenter = Input {');
  L.push('\t\t\t\t\t\t\tValue = { 0.612645418095033, 0.538291 },');
  L.push('\t\t\t\t\t\t\tExpression = "Point(0.341+ Rectangle3.Width, 0.538291)",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tLayoutSize = Input { Value = 0.677, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tAngleY = Input { Value = 13, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+(mileTextRgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+(mileTextRgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+(mileTextRgb[2]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input { Value = "'+unitLabel+'", },');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.058, },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 157.173, 22.1018 } },');
  L.push('\t\t\t\t}');
  var vp=fusionVersatz(c,'mile',OVERLAY_MASSE.mile,260,880);
  L.push(buildTransformNode('OverlayPosition', 'Merge3', vp.dx, vp.dy, [1400,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push(buildBezierSplineTool('Rectangle3SPLData', mileKF, false));
  L.push('\t}');
  L.push('}');
  return L.join('\n');
}
