# Activity Layers

Browser-Tool, das aus GPX-, FIT- und TCX-Aufzeichnungen dreizehn animierte Overlays für
DaVinci Resolve (Fusion `.setting`) und After Effects (ExtendScript `.jsx`)
erzeugt. Die Verarbeitung findet vollständig im Browser statt – es gibt keinen
Upload.

Live: https://activitylayers.com

## Aufbau

Das Repository entspricht dem ausgelieferten Verzeichnis. Es gibt keinen
Build-Schritt: Der Inhalt der Wurzel wird unverändert ins Webroot gespiegelt.

Eine Ausnahme: `stats.js`, `llms.txt` und `.well-known/security.txt` liegen
bewusst nur auf dem Server und nicht im Repository. Beim lokalen Ausprobieren
fehlt `stats.js` deshalb und erzeugt einen 404; auf die Seite selbst hat das
keine Auswirkung.

`stats.js` bindet einen Matomo-Tag-Manager-Container ein. Der wird über die
Matomo-Oberfläche gepflegt und kann sich daher ohne Auslieferung ändern —
anders als jede andere Datei hier. Das ist eine bewusste Entscheidung und kein
übersehener Punkt: Der Trackingcode soll Adresse und Seiten-ID nicht öffentlich
zeigen. Wer den Stand prüfen will, sieht ihn unter `/stats.js` und im dort
geladenen Container.

| Datei | Inhalt |
|---|---|
| `index.html` | das Tool |
| `hilfe.html` | Anleitung, deutsch und englisch |
| `impressum.html`, `datenschutz.html` | rechtliche Angaben, zweisprachig |
| `style.css` | Oberfläche |
| `js/` | die Logik, nach Aufgaben getrennt (siehe unten) |
| `og-image.png` | Vorschaubild für geteilte Links, gebaut aus `tools/make-og-image.py` |
| `lang-toggle.js` | Sprachumschalter der Unterseiten |
| `favicon.svg`, `assets/icons/` | Symbole |
| `examples/` | Beispieldateien zum Ausprobieren |
| `tools/` | Hilfsskripte für die Entwicklung, nicht Teil der Seite |
| `vendor/fonts/` | Inter und IBM Plex Mono, lokal ausgeliefert |
| `vendor/jszip.min.js` | ZIP-Erzeugung für den Sammel-Download |
| `vendor/leaflet/` | Kartenvorschau, lokal ausgeliefert |

### Die Dateien unter `js/`

Sie werden in dieser Reihenfolge eingebunden und teilen sich einen
gemeinsamen Namensraum. Jede Datei enthält nur Deklarationen und die
Ereignisbindungen ihres eigenen Bereichs; nichts ruft beim Laden etwas aus
einer später eingebundenen Datei auf.

| Datei | Inhalt |
|---|---|
| `i18n.js` | Wörterbuch und Sprachumschaltung |
| `state.js` | der gemeinsame Zustand aus der geladenen Datei |
| `settings.js` | Bedienelemente, Vorgaben, Synchronisierungsrechner, Dialoge |
| `import.js` | Dateiannahme und die Leser für FIT, TCX und GPX |
| `compute.js` | Glättung, Steigung, Distanz, Pace |
| `preview.js` | Karte, Streckenriss, Tacho, Puls, Höhenprofil |
| `fusion.js` | Ausgabe für DaVinci Resolve |
| `after-effects.js` | Ausgabe für After Effects |
| `text-overlays.js` | Overlays, die beide Formate aus einer Vorlage erzeugen |
| `video.js` | dieselben Overlays als Bilder, aufgenommen im Browser |
| `export.js` | Herunterladen einzelner Dateien und als ZIP |

## Video für andere Schnittprogramme

Die eigentliche Ausgabe sind editierbare Ebenen. Wer weder DaVinci Resolve noch
After Effects hat, kann ein Overlay stattdessen als Video mitnehmen. `video.js`
zeichnet dafür dieselben dreizehn Overlays noch einmal auf eine Leinwand, im
selben Entwurfsmaß 1920×1080 und mit demselben Faktor wie die
After-Effects-Ausgabe — sonst säße dasselbe Overlay im Video woanders als in der
exportierten Ebene.

Zwei Formate, beide im Browser des Nutzers aufgenommen, ohne Upload:

| Datei | Wofür |
|---|---|
| `.webm` (VP9) | echter Deckkraftkanal, ohne Freistellen. Shotcut, Kdenlive, OBS, Web |
| `.mp4` (H.264) auf Grün | für alles andere: ein Klick „Chroma Key" in CapCut, iMovie, Canva |

Ein MP4 mit Deckkraftkanal gibt es nicht — H.264 hat keinen. Deshalb die
Stanzfarbe.

Aufgenommen wird in Echtzeit: Der Browser stempelt die Bilder nach der Uhr,
schnelleres Zuführen ergäbe eine Datei, die zu schnell abspielt. Deshalb lässt
sich ein Ausschnitt wählen — meistens braucht niemand die ganze Fahrt.

## Externe Ressourcen

Beim Aufruf der Seite werden keine externen Ressourcen angefordert. Erst
nachdem eine Datei geladen wurde, holt die Kartenvorschau Kartenkacheln von
OpenStreetMap. Die Karte ist niemals Bestandteil eines Exports.

## Deployment

Reine statische Auslieferung, kein PHP und keine Datenbank. Der Inhalt des
Repositorys gehört unverändert nach `/activitylayers.com/httpdocs`.

## Beispieldateien und Prüflauf

`examples/` enthält vier erzeugte Aufzeichnungen – keine echten Touren, damit
keine Bewegungsdaten im Repository landen. Sie decken die Fälle ab, die sich im
Verhalten unterscheiden:

| Datei | Ergibt |
|---|---|
| `demo-ride.fit` | alle dreizehn Overlays, drei Runden |
| `demo-ride.tcx` | elf Overlays, ohne Leistung und Temperatur |
| `demo-ride.gpx` | neun Overlays, ohne Puls, Trittfrequenz, Temperatur und Runden |
| `demo-minimal.gpx` | sechs Overlays, weder Höhe noch Sensorwerte |

Neu erzeugen mit `python3 tools/make-examples.py`. Die Dateien sind
deterministisch, derselbe Lauf liefert dieselben Bytes.

`tools/golden-test.mjs` schickt zwanzig Fälle durch alle sechsundzwanzig
Generatoren und vergleicht die Ausgaben, dazu die gerechneten Reihen selbst, mit
den Prüfsummen in `tools/golden.json` — 646 Einträge:

    node tools/golden-test.mjs            prüfen
    node tools/golden-test.mjs --write     Prüfsummen neu aufnehmen

Die Fälle sind die vier Beispieldateien und sechzehn gebaute Grenzfälle: mehrere
Aufnahmeabschnitte mit eigener Fahrtrichtung und eigenem Tempo, eine kurze
GPX-Trennung über `<trkseg>`, Gerätestrecken mit Lücken und ohne Nullpunkt,
negativer Versatz mit Abweichungsfaktor, Bild 0 mitten in einer Aufnahmepause,
eine Pause mit Sensorwerten mitten im Video, ein Versatz ohne jede zeitliche
Überlappung, ein Abweichungsfaktor jenseits des zulässigen Bereichs,
die Datumsgrenze, der Südpol,
vertauschte Zonengrenzen, eine Geisterspur, ein Hochformat sowie ein leerer,
ein einpunktiger und ein aus lauter Einzelpunkten bestehender Track.

Einige Einträge prüfen keine Ausgabe, sondern Angaben, die an zwei Stellen
stehen: die Dateigrenze aus `js/import.js` gegen die Zahl im Blog und die
Overlayzahlen der Beispieldateien gegen die Tabelle oben — beides war schon
einmal auseinandergelaufen. Dazu der Abweichungsfaktor für acht Eingaben und
die angezeigte Dauer bei Bildraten, bei denen das Aufrunden eine Bildnummer
ergab, die es nicht gibt.

Ein Eintrag stellt einen zweiten Besuch nach: Er füllt den Speicher mit
Einstellungen und lädt alle Dateien in einen frischen Raum. Greift eine Datei
beim Laden auf etwas zu, das erst später definiert wird, bricht die
Einrichtung ab — für einen neuen Besucher unsichtbar, für einen
wiederkehrenden fatal.

Dazu kommen drei Fälle, die nicht die Generatoren prüfen, sondern die
Oberfläche: Sie lösen die echten Klickbehandler aller sechsundzwanzig
Einzelknopfe und der drei Sammelknopfe aus und halten fest, ob eine Datei
entstanden ist – und ob sie Inhalt hatte. Ein Knopf, der ein leeres Ergebnis
zum Download gibt, und ein Archiv ohne eine einzige Datei fallen damit auf.

Der Test braucht keine Abhängigkeiten. Er bewertet nicht, ob ein Overlay gut
aussieht – er findet Änderungen an gemeinsam genutztem Code, die unbemerkt
andere Overlays verschieben.

## Lizenzen

Dieses Projekt steht unter der MIT-Lizenz, Copyright (c) 2026 Daniel Heidrich
(siehe `LICENSE`).

Es baut auf [GPS-Data-overlay-tool](https://github.com/J-Hulin/GPS-Data-overlay-tool)
von Josiah Hulin auf. Dessen Urhebervermerk und die Lizenzen der übrigen
verwendeten Werke stehen in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
