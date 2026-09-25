/* Sprache der Oberflaeche: Woerterbuch, Umschaltung und die Uebersetzung von
   Meldungen, die erst zur Laufzeit entstehen. */

var uiLanguage='en';
var uiTextSources=[];
var uiAttributeSources=[];
var UI_DE={
  'Import':'Datei',
  'Sync':'Sync',
  'Style':'Stil',
  'Export':'Export',
  'Local by design':'Bewusst lokal',
  'Your activity data stays in this browser.':'Deine Aktivitätsdaten bleiben in diesem Browser.',
  'Twelve data layers.':'Zwölf Datenebenen.',
  'Ready for the edit.':'Bereit für den Schnitt.',
  'Layer your activity':'Deine Aktivität –',
  'into every frame.':'in jedem Frame sichtbar.',
  'Create twelve animated overlays for':'Erstelle aus GPX-, FIT- und TCX-Dateien zwölf animierte Overlays für',
  'and':'und',
  'from GPX, FIT and TCX files — processed locally in your browser. Lap markers need a .fit or .tcx file - every other overlay works with all three.':'– lokal in deinem Browser. Rundenmarken brauchen eine .fit- oder .tcx-Datei, alle übrigen Overlays funktionieren mit allen drei Formaten.',
  '⏱ GPS Sync Calibration Helper':'⏱ GPS-Synchronisierung kalibrieren',
  'Enter timecodes in':'Timecodes im Format',
  'format (e.g.':'eingeben (z. B.',
  '). GPS elapsed time is seconds from when you started the activity.':'). Die verstrichene GPS-Zeit beginnt mit dem Start der Aktivität.',
  'Event 1 — Video timecode (HH:MM:SS:FF)':'Ereignis 1 — Video-Timecode (HH:MM:SS:FF)',
  'Event 1 — GPS elapsed time (HH:MM:SS:FF)':'Ereignis 1 — Verstrichene GPS-Zeit (HH:MM:SS:FF)',
  'Optional:':'Optional:',
  'second sync event late in the clip for drift correction.':'Ein zweites Synchronisationsereignis am Ende des Clips korrigiert die Zeitabweichung.',
  'Event 2 — Video timecode (HH:MM:SS:FF)':'Ereignis 2 — Video-Timecode (HH:MM:SS:FF)',
  'Event 2 — GPS elapsed time (HH:MM:SS:FF)':'Ereignis 2 — Verstrichene GPS-Zeit (HH:MM:SS:FF)',
  'Calculate':'Berechnen',
  'Apply':'Übernehmen',
  'Close':'Schließen',
  'Support Daniel':'Unterstütze Daniel',
  'This free browser tool turns your activity data into ready-to-edit video overlays. If it saves you time, you can support its continued development with a coffee.':'Dieses kostenlose Browser-Tool verwandelt deine Aktivitätsdaten in sofort nutzbare Video-Overlays. Wenn es dir Zeit spart, kannst du die Weiterentwicklung mit einem Kaffee unterstützen.',
  'Opens the secure Buy Me a Coffee page in a new tab.':'Öffnet die sichere Buy-Me-a-Coffee-Seite in einem neuen Tab.',
  'Drop your GPX, FIT or TCX file here':'GPX-, FIT- oder TCX-Datei hier ablegen',
  'or click to browse':'oder zum Auswählen klicken',
  '.gpx, .fit and .tcx supported':'.gpx, .fit und .tcx werden unterstützt',
  'No upload · No account':'Kein Upload · Kein Konto',
  'Video & GPS settings':'Video- & GPS-Einstellungen',
  'Reset':'Zurücksetzen',
  'Frame rate':'Bildrate',
  'Speed unit':'Geschwindigkeitseinheit',
  'Smoothing window (0–20)':'Glättungsfenster (0–20)',
  'GPS offset (seconds)':'GPS-Versatz (Sekunden)',
  'Clock drift factor':'Zeitabweichungsfaktor',
  'Sync Helper':'Synchronisierung',
  'Max gauge speed (auto)':'Maximale Tachogeschwindigkeit (automatisch)',
  'What do these mean?':'Was bedeuten diese Werte?',
  'GPS offset':'GPS-Versatz',
  'The GPS offset':'Der GPS-Versatz',
  'tells the overlay where your recording sits on the video timeline. It is the video timecode, in seconds, at the moment the watch started recording. If the watch was already running before you hit record on the camera, the value is negative.':'legt fest, wo deine Aufzeichnung auf der Video-Zeitachse liegt. Es ist der Video-Timecode in Sekunden zu dem Zeitpunkt, an dem die Uhr zu zeichnen begann. Lief die Uhr schon, bevor du die Kamera gestartet hast, ist der Wert negativ.',
  'The clock drift factor':'Der Zeitabweichungsfaktor',
  'compensates for the two clocks running at slightly different rates. A deviation of just 0.1 percent adds up to roughly six seconds over ten minutes. That is why a sync that looks perfect at the start slowly falls apart towards the end. A value of 1.0 means both clocks agree; below 1.0 the data is slowed down, above 1.0 it is sped up.':'gleicht aus, dass beide Uhren minimal unterschiedlich schnell laufen. Schon 0,1 Prozent Abweichung summieren sich in zehn Minuten auf etwa sechs Sekunden. Genau deshalb sitzt eine Synchronisierung am Anfang perfekt und läuft zum Ende hin auseinander. Der Wert 1,0 bedeutet Gleichlauf; unter 1,0 werden die Daten verlangsamt, über 1,0 beschleunigt.',
  'You do not have to work these out by hand.':'Du musst nichts davon ausrechnen.',
  'Look for a moment you can identify in both the video and the recording — pulling away, a distinctive corner, a braking point. Note its video timecode and the elapsed time in the recording, then enter both under Sync Helper. Adding a second moment near the end of the clip gives you the drift factor as well.':'Such dir einen Moment, den du im Video und in der Aufzeichnung wiedererkennst — ein Anfahren, eine markante Kurve, einen Bremspunkt. Notiere den Video-Timecode und die verstrichene Zeit in der Aufzeichnung und trag beides unter Synchronisierung ein. Ein zweiter Moment am Ende des Clips liefert zusätzlich den Abweichungsfaktor.',
  'The maths behind it, if you want to check the result:':'Die Rechnung dahinter, falls du das Ergebnis nachprüfen willst:',
  'drift factor = (video timecode − offset) ÷ elapsed GPS time':'Abweichungsfaktor = (Video-Timecode − Versatz) ÷ verstrichene GPS-Zeit',
  'Say the second moment appears at 9:04 in the video (544 seconds) and at 9:10 in the recording (550 seconds), with an offset of 5 seconds. That gives (544 − 5) ÷ 550 = 0.9800.':'Erscheint der zweite Moment im Video bei 9:04 (544 Sekunden) und in der Aufzeichnung bei 9:10 (550 Sekunden), bei einem Versatz von 5 Sekunden, ergibt das (544 − 5) ÷ 550 = 0,9800.',
  'Speedometer style':'Tacho-Stil',
  'Dial backdrop':'Zifferblatt-Hintergrund',
  'Ring color':'Ringfarbe',
  'Active arc color':'Farbe des aktiven Bogens',
  'Number color':'Zahlenfarbe',
  'Unit label color':'Farbe der Einheitenbeschriftung',
  'Route style':'Routen-Stil',
  'Ghost track':'Geisterspur',
  'Choose a second file':'Zweite Datei wählen',
  'Remove':'Entfernen',
  'Ghost width':'Breite der Geisterspur',
  'Ghost color':'Farbe der Geisterspur',
  'Ghost opacity':'Deckkraft der Geisterspur',
  'A second recording of the same route, drawn behind your track. Only the shape is used — no speed, no time. Both tracks are framed together, so they line up.':'Eine zweite Aufzeichnung derselben Strecke, hinter deiner Spur gezeichnet. Genutzt wird nur der Verlauf — keine Geschwindigkeit, keine Zeit. Beide Spuren teilen sich einen Rahmen und liegen dadurch übereinander.',
  'Nudge X (px)':'Verschiebung X (px)',
  'Nudge Y (px)':'Verschiebung Y (px)',
  'Top left':'Oben links',
  'Top centre':'Oben mittig',
  'Top right':'Oben rechts',
  'Middle left':'Mittig links',
  'Centre':'Mitte',
  'Middle right':'Mittig rechts',
  'Bottom left':'Unten links',
  'Bottom centre':'Unten mittig',
  'Bottom right':'Unten rechts',
  'Presets':'Vorlagen',
  'Saved presets':'Gespeicherte Vorlagen',
  'Name':'Name',
  'None saved yet':'Noch keine gespeichert',
  'Choose a preset':'Vorlage w\u00e4hlen',
  'Save':'Speichern',
  'Delete':'L\u00f6schen',
  'Export as file':'Als Datei ausgeben',
  'Import from file':'Aus Datei laden',
  'Save the complete look \u2014 every colour, size, position and the canvas \u2014 under a name and bring it back with one click. Presets live in this browser only; export one as a file to move it to another machine or share it.':'Sichere das ganze Aussehen \u2014 alle Farben, Gr\u00f6\u00dfen, Positionen und die Leinwand \u2014 unter einem Namen und hole es mit einem Klick zur\u00fcck. Vorlagen liegen nur in diesem Browser; gib eine als Datei aus, um sie auf einen anderen Rechner zu bringen oder weiterzugeben.',
  'Progress color':'Farbe des Fortschritts',
  'Progress width':'Breite des Fortschritts',
  'Progress':'Fortschritt',
  'The same track as the route overlay, but fitted into a disc so nothing is cut off. A ring on the rim shows how far along the whole route you are. A ghost track is drawn with it — that turns it into a small comparison map.':'Dieselbe Strecke wie im großen Streckenoverlay, aber in eine Scheibe eingepasst, damit nichts abgeschnitten wird. Ein Ring am Rand zeigt, wie weit du auf der Gesamtstrecke bist. Eine Geisterspur wird mitgezeichnet — damit wird daraus eine kleine Vergleichskarte.',
  'A ring on the rim shows how far along the whole route you are. A ghost track is drawn with it \u2014 that turns it into a small comparison map.':'Ein Ring am Rand zeigt, wie weit du auf der Gesamtstrecke bist. Eine Geisterspur wird mitgezeichnet \u2014 damit wird daraus eine kleine Vergleichskarte.',
  'Route disc overlay style':'Runde Streckenkarte',
  'Diameter (share of height)':'Durchmesser (Anteil der H\u00f6he)',
  'Disc color':'Scheibenfarbe',
  'Disc opacity':'Deckkraft der Scheibe',
  'Ring':'Ring',
  'Ring width':'Ringbreite',
  'Route Disc Overlay':'Runde Streckenkarte',
  '.setting file (track fitted into a disc)':'.setting-Datei (Strecke in die Scheibe eingepasst)',
  '.jsx script (track fitted into a disc)':'.jsx-Skript (Strecke in die Scheibe eingepasst)',
  'Canvas size':'Leinwandgröße',
  'Canvas width (px)':'Leinwandbreite (px)',
  'Canvas height (px)':'Leinwandhöhe (px)',
  '1080 × 1920 — portrait':'1080 × 1920 — Hochformat',
  '1080 × 1350 — portrait 4:5':'1080 × 1350 — Hochformat 4:5',
  '1080 × 1080 — square':'1080 × 1080 — quadratisch',
  'Custom':'Eigene Größe',
  'Both export formats follow this size. Overlays keep their distance from the edge and their proportions on any canvas.':'Beide Ausgabeformate richten sich nach dieser Größe. Overlays behalten auf jeder Leinwand ihren Abstand zum Rand und ihre Proportionen.',
  'Auto-sizes to fill the canvas based on your GPS track\'s aspect ratio.':'Passt sich automatisch an die Leinwand und das Seitenverhältnis deiner Aufzeichnung an.',
  'Track width':'Routenbreite',
  'Dot radius':'Punktradius',
  'Shadow offset':'Schattenversatz',
  'Track color':'Routenfarbe',
  'Dot color':'Punktfarbe',
  'Shadow color':'Schattenfarbe',
  'Elevation style':'Höhenprofil-Stil',
  'Width px':'Breite in px',
  'Height px':'Höhe in px',
  'Line width':'Linienbreite',
  'Line color':'Linienfarbe',
  'Fill':'Füllung',
  'Yes':'Ja',
  'No':'Nein',
  'Fill color':'Füllfarbe',
  'Show elevation numbers on graph (min/max + ticks)':'Höhenwerte im Diagramm anzeigen (Min./Max. + Skala)',
  'Heart Rate overlay style':'Herzfrequenz-Overlay-Stil',
  'Heart color':'Herzfarbe',
  'Text size':'Textgröße',
  'Incline overlay style':'Steigungs-Overlay-Stil',
  'Wedge color':'Keilfarbe',
  'Units':'Einheiten',
  'Percent (%)':'Prozent (%)',
  'Degrees (°)':'Grad (°)',
  'Distance / Mile Marker overlay style':'Distanzmarker-Overlay-Stil',
  'Text color':'Textfarbe',
  'Line distance color':'Farbe der Distanzlinie',
  'Decimals':'Dezimalstellen',
  'Points':'Punkte',
  'Duration':'Dauer',
  'Distance':'Distanz',
  'Peak speed':'Höchstgeschwindigkeit',
  'copy':'kopieren',
  'Route preview':'Routenvorschau',
  'Speed curve':'Geschwindigkeitskurve',
  'Heart rate':'Herzfrequenz',
  'Elevation profile':'Höhenprofil',
  'Download outputs':'Ausgaben herunterladen',
  'Speedometer':'Tacho',
  '.setting file (spline baked in)':'.setting-Datei (Spline enthalten)',
  'Route Overlay':'Routen-Overlay',
  '.setting file (path + dot baked in)':'.setting-Datei (Pfad + Punkt enthalten)',
  'Elevation Overlay':'Höhenprofil-Overlay',
  '.setting file (graph + dot baked in)':'.setting-Datei (Diagramm + Punkt enthalten)',
  'HR Overlay':'HF-Overlay',
  'Incline Overlay':'Steigungs-Overlay',
  'Mile Marker Overlay':'Distanzmarker-Overlay',
  'Source code on GitHub':'Quelltext auf GitHub',
  'Cadence overlay style':'Trittfrequenz-Overlay-Stil',
  'Power overlay style':'Leistungs-Overlay-Stil',
  'Lap Marker overlay style':'Rundenmarken-Overlay-Stil',
  'Cadence Overlay':'Trittfrequenz-Overlay',
  'Power Overlay':'Leistungs-Overlay',
  'Temperature overlay style':'Temperatur-Overlay-Stil',
  'Temperature Overlay':'Temperatur-Overlay',
  'Zone colours':'Zonenfarben',
  'Off':'aus',
  'On':'an',
  'bpm zone 2 from':'bpm Zone 2 ab',
  'bpm zone 3 from':'bpm Zone 3 ab',
  'W zone 2 from':'W Zone 2 ab',
  'W zone 3 from':'W Zone 3 ab',
  'Zone 2 colour':'Farbe Zone 2',
  'Zone 3 colour':'Farbe Zone 3',
  'Pace overlay style':'Pace-Overlay-Stil',
  'Pace Overlay':'Pace-Overlay',
  'Pace follows the speed unit: minutes per kilometre, or minutes per mile when MPH is selected.':'Pace folgt der Geschwindigkeitseinheit: Minuten je Kilometer, bei MPH Minuten je Meile.',
  '.jsx script (pace value)':'.jsx-Skript (Pace-Wert)',
  '.jsx script (temperature value)':'.jsx-Skript (Temperaturwert)',
  'Lap Marker Overlay':'Rundenmarken-Overlay',
  '.setting file (.fit and .tcx only)':'.setting-Datei (nur .fit und .tcx)',
  '.jsx script (cadence value)':'.jsx-Skript (Trittfrequenzwert)',
  '.jsx script (power value)':'.jsx-Skript (Leistungswert)',
  '.jsx script (.fit and .tcx only)':'.jsx-Skript (nur .fit und .tcx)',
  'Lap markers are read from the lap records inside a .fit or .tcx file. GPX files carry no lap information, so this overlay stays unavailable for them.':'Rundenmarken stammen aus den Runden-Datens\u00e4tzen einer .fit- oder .tcx-Datei. GPX-Dateien enthalten keine Rundeninformationen, dieses Overlay bleibt dort also ohne Funktion.',
  'Download All Files':'Alle Dateien herunterladen',
  'Download DaVinci Resolve files':'DaVinci-Resolve-Dateien herunterladen',
  'Download After Effects files':'After-Effects-Dateien herunterladen',
  'Preparing files…':'Dateien werden vorbereitet …',
  'Studio navigation':'Studio-Navigation',
  'Activity Layers home':'Activity Layers Startseite',
  'Close support overlay':'Support-Overlay schließen',
  'Choose a GPX, FIT or TCX file':'GPX-, FIT- oder TCX-Datei auswählen',
  'Copy duration':'Dauer kopieren',
  'Language':'Sprache',
  'KPH':'km/h',
  '1 (e.g. 3.2)':'1 (z. B. 3,2)',
  '2 (e.g. 3.24)':'2 (z. B. 3,24)',
  'How does it work':'Wie funktioniert das',
  'DaVinci Resolve is a registered trademark of Blackmagic Design Pty Ltd. Adobe and After Effects are registered trademarks of Adobe Inc. FIT is a trademark of Garmin Ltd. or its subsidiaries. Activity Layers is not affiliated with Blackmagic Design, Adobe or Garmin.':'DaVinci Resolve ist eine eingetragene Marke von Blackmagic Design Pty Ltd. Adobe und After Effects sind eingetragene Marken von Adobe Inc. FIT ist eine Marke von Garmin Ltd. oder seinen Tochtergesellschaften. Activity Layers steht in keiner Verbindung zu Blackmagic Design, Adobe oder Garmin.',
  'Map preview':'Kartenvorschau',
  'Loading map…':'Karte wird geladen …',
  'DaVinci Resolve · Fusion · After Effects':'DaVinci Resolve · Fusion · After Effects',
  'DaVinci Resolve — Fusion .setting files':'DaVinci Resolve — Fusion-.setting-Dateien',
  'After Effects — .jsx scripts (File > Scripts > Run Script File…)':'After Effects — .jsx-Skripte (Datei > Skripten > Skriptdatei ausführen …)',
  '.jsx script (comp + keyframes)':'.jsx-Skript (Komposition + Keyframes)',
  '.jsx script (path + dot)':'.jsx-Skript (Pfad + Punkt)',
  '.jsx script (graph + dot)':'.jsx-Skript (Diagramm + Punkt)',
  '.jsx script (heart + value)':'.jsx-Skript (Herz + Wert)',
  '.jsx script (wedge + value)':'.jsx-Skript (Keil + Wert)',
  '.jsx script (distance value)':'.jsx-Skript (Distanzwert)',
  'Visualisation only — this map is never part of an export. The eleven overlays above are unaffected.':'Nur zur Visualisierung — diese Karte ist nie Teil eines Exports. Die elf Overlays oben bleiben davon unberührt.'
};

var lastMaxSpeedValue=null;
function unitDisplay(u){ return (uiLanguage==='de' && u==='kph') ? 'km/h' : u.toUpperCase(); }

var mphOption=null;
function syncUnitOptions(){
  var sel=document.getElementById('unit');
  if(!sel) return;
  var before=sel.value;
  var existing=sel.querySelector('option[value="mph"]');
  if(uiLanguage==='de'){
    if(existing){ mphOption=existing; existing.remove(); }
    if(sel.value!=='kph') sel.value='kph';
  } else if(mphOption && !existing){
    sel.insertBefore(mphOption, sel.firstChild);
    sel.value=before;
  }
  if(sel.value!==before && typeof rawPoints!=='undefined' && rawPoints.length) reprocess();
}

function refreshUnitLabels(){
  if(lastMaxSpeedValue==null) return;
  var el=document.getElementById('statSpd');
  if(el) el.textContent=lastMaxSpeedValue.toFixed(1)+' '+unitDisplay(document.getElementById('unit').value);
}

function collectInterfaceText(){
  var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  var node;
  while((node=walker.nextNode())){
    if(!node.nodeValue.trim()||node.parentElement.closest('script,style,.language-switcher')) continue;
    uiTextSources.push({node:node,source:node.nodeValue});
  }
  document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(function(el){
    ['aria-label','title','placeholder'].forEach(function(attr){
      if(el.hasAttribute(attr)) uiAttributeSources.push({el:el,attr:attr,source:el.getAttribute(attr)});
    });
  });
}

function translateStaticValue(source,language){
  return language==='de'&&UI_DE[source] ? UI_DE[source] : source;
}

function applyUILanguage(language){
  uiLanguage=language==='de'?'de':'en';
  document.documentElement.lang=uiLanguage;
  uiTextSources.forEach(function(item){
    var leading=(item.source.match(/^\s*/)||[''])[0];
    var trailing=(item.source.match(/\s*$/)||[''])[0];
    var source=item.source.trim();
    item.node.nodeValue=leading+translateStaticValue(source,uiLanguage)+trailing;
  });
  uiAttributeSources.forEach(function(item){
    item.el.setAttribute(item.attr,translateStaticValue(item.source,uiLanguage));
  });
  document.querySelectorAll('.language-option').forEach(function(button){
    var active=button.dataset.language===uiLanguage;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',active?'true':'false');
  });
  syncUnitOptions();
  refreshUnitLabels();
  // Die Vorlagenliste entsteht zur Laufzeit, der Durchlauf oben erreicht sie
  // nicht. Nur der Platzhalter wird uebersetzt, die Namen bleiben wie getippt.
  if(typeof vorlagenListeFuellen==='function'){
    try{ vorlagenListeFuellen(document.getElementById('presetList').value); }catch(e){}
  }
  try{localStorage.setItem('overlayUILanguage',uiLanguage);}catch(e){}
}

function localizeRuntimeText(message){
  if(uiLanguage!=='de') return message;
  var exact={
    'copied!':'kopiert!',
    'copy':'kopieren',
    'Enter event 1 values':'Werte für Ereignis 1 eingeben',
    'Please upload a .gpx, .fit or .tcx file':'Bitte eine GPX-, FIT- oder TCX-Datei auswählen',
    'XML error in TCX file':'XML-Fehler in der TCX-Datei',
    'No GPS track points found in FIT file':'Keine GPS-Routenpunkte in der FIT-Datei gefunden',
    'XML error in GPX file':'XML-Fehler in der GPX-Datei',
    'No track points found':'Keine Routenpunkte gefunden',
    'Not enough valid points':'Nicht genügend gültige Punkte',
    'No elevation data in this file':'Diese Datei enthält keine Höhendaten',
    'No heart rate data in this file':'Diese Datei enthält keine Herzfrequenzdaten',
    'No elevation data in this file (incline requires elevation)':'Diese Datei enthält keine Höhendaten (Steigung benötigt Höhendaten)',
    'No GPS data in this file':'Diese Datei enthält keine GPS-Daten',
    'No cadence data in this file':'Diese Datei enth\u00e4lt keine Trittfrequenzdaten',
    'No power data in this file':'Diese Datei enth\u00e4lt keine Leistungsdaten',
    'No temperature data in this file':'Diese Datei enth\u00e4lt keine Temperaturdaten',
    'Building Temperature overlay…':'Temperatur-Overlay wird erstellt …',
    'Building Pace overlay…':'Pace-Overlay wird erstellt …',
    'No lap data in this file (.fit and .tcx files only)':'Diese Datei enth\u00e4lt keine Rundendaten (nur .fit und .tcx)',
    'Building Cadence overlay\u2026':'Trittfrequenz-Overlay wird erstellt \u2026',
    'Building Power overlay\u2026':'Leistungs-Overlay wird erstellt \u2026',
    'Building Lap Marker overlay\u2026':'Rundenmarken-Overlay wird erstellt \u2026',
    'Preparing files…':'Dateien werden vorbereitet …',
    'Building Speed overlay…':'Tacho-Overlay wird erstellt …',
    'Building Route overlay…':'Routen-Overlay wird erstellt …',
    'Building Elevation overlay…':'Höhenprofil-Overlay wird erstellt …',
    'Building HR overlay…':'HF-Overlay wird erstellt …',
    'Building Incline overlay…':'Steigungs-Overlay wird erstellt …',
    'Building Mile Marker overlay…':'Distanzmarker-Overlay wird erstellt …',
    'Building After Effects scripts…':'After-Effects-Skripte werden erstellt …',
    'No data for this overlay in this file':'Diese Datei enthält keine Daten für dieses Overlay',
    'Compressing…':'Wird komprimiert …',
    'Done':'Fertig',
    'Loading map…':'Karte wird geladen …',
    'Map could not be loaded':'Karte konnte nicht geladen werden'
  };
  if(exact[message]) return exact[message];
  if(message.indexOf('Reading ')===0) return 'Datei wird gelesen: '+message.slice(8);
  if(/^[0-9]+ track points loaded$/.test(message)) return message.replace(' track points loaded',' Routenpunkte geladen');
  if(message.indexOf('Ready — ')===0) return 'Bereit — '+message.slice(8).replace(' points · ',' Punkte · ');
  if(message.indexOf('Downloaded ')===0) return message.slice(11)+' heruntergeladen';
  if(message.indexOf('FIT parse error: ')===0) return 'FIT-Verarbeitungsfehler: '+message.slice(17);
  if(message.indexOf('Export failed: ')===0) return 'Export fehlgeschlagen: '+message.slice(15);
  if(message.indexOf('File too large: ')===0) return 'Datei zu groß: '+message.slice(16).replace(' — the limit is ',' — das Maximum sind ');
  if(message.indexOf('File could not be read to the end')===0)
    return message.replace('File could not be read to the end — only ','Datei konnte nicht bis zum Ende gelesen werden — nur ')
                  .replace(' track points were used',' Routenpunkte verwendet');
  if(message.indexOf('Some fields in this FIT file are declared')===0)
    return 'Einzelne Felder dieser FIT-Datei sind mit einer unerwarteten Größe angegeben und wurden übergangen';
  if(/^Ghost track loaded: /.test(message)) return message.replace('Ghost track loaded: ','Geisterspur geladen: ').replace(' points',' Punkte');
  if(message==='No usable track in that file') return 'Kein brauchbarer Streckenverlauf in dieser Datei';
  if(message.indexOf('Preset saved: ')===0) return 'Vorlage gespeichert: '+message.slice(14);
  if(message.indexOf('Preset loaded: ')===0) return 'Vorlage geladen: '+message.slice(15);
  if(message.indexOf('Preset deleted: ')===0) return 'Vorlage gel\u00f6scht: '+message.slice(16);
  if(message==='Give the preset a name first') return 'Gib der Vorlage zuerst einen Namen';
  if(message==='Choose a preset to delete') return 'W\u00e4hle eine Vorlage zum L\u00f6schen';
  if(message==='That preset is gone') return 'Diese Vorlage gibt es nicht mehr';
  if(message==='That is not an Activity Layers preset') return 'Das ist keine Vorlage von Activity Layers';
  if(message==='Nothing to export') return 'Nichts auszugeben';
  if(message.indexOf('Presets could not be saved')===0) return 'Vorlagen konnten nicht gespeichert werden \u2014 der Speicher dieses Browsers ist voll';
  if(message.indexOf('Error: ')===0) return 'Fehler: '+message.slice(7);
  if(message.indexOf('Compressing… ')===0) return 'Wird komprimiert … '+message.slice(13);
  if(message.indexOf('Sync applied — offset: ')===0) return message.replace('Sync applied — offset: ','Synchronisierung übernommen — Versatz: ').replace(', drift: ',', Abweichung: ');
  return message;
}

(function(){
  var mq=window.matchMedia('(max-width:640px)');
  var tools=document.querySelector('.header-tools');
  var bar=document.querySelector('.studio-sidebar');
  if(!tools||!bar) return;
  var home=tools.parentElement;
  function place(){
    if(mq.matches){ if(tools.parentElement!==bar) bar.appendChild(tools); }
    else if(tools.parentElement!==home) home.appendChild(tools);
  }
  if(mq.addEventListener) mq.addEventListener('change',place); else mq.addListener(place);
  place();
})();

collectInterfaceText();
document.querySelectorAll('.language-option').forEach(function(button){
  button.addEventListener('click',function(){applyUILanguage(this.dataset.language);});
});
var savedUILanguage='en';
try{savedUILanguage=localStorage.getItem('overlayUILanguage')||'en';}catch(e){}
applyUILanguage(savedUILanguage);
