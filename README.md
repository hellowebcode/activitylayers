# Activity Layers

Browser-Tool, das aus GPX-, FIT- und TCX-Aufzeichnungen neun animierte Overlays für
DaVinci Resolve (Fusion `.setting`) und After Effects (ExtendScript `.jsx`)
erzeugt. Die Verarbeitung findet vollständig im Browser statt – es gibt keinen
Upload.

Live: https://activitylayers.com

## Aufbau

Das Repository entspricht dem ausgelieferten Verzeichnis. Es gibt keinen
Build-Schritt: Der Inhalt der Wurzel wird unverändert ins Webroot gespiegelt.

| Datei | Inhalt |
|---|---|
| `index.html` | das Tool |
| `hilfe.html` | Anleitung, deutsch und englisch |
| `impressum.html`, `datenschutz.html` | rechtliche Angaben, zweisprachig |
| `style.css`, `script.js` | Oberfläche und gesamte Logik |
| `lang-toggle.js` | Sprachumschalter der Unterseiten |
| `favicon.svg`, `assets/icons/` | Symbole |
| `examples/` | Beispieldateien zum Ausprobieren |
| `tools/` | Hilfsskripte für die Entwicklung, nicht Teil der Seite |
| `vendor/fonts/` | Inter und IBM Plex Mono, lokal ausgeliefert |
| `vendor/jszip.min.js` | ZIP-Erzeugung für den Sammel-Download |
| `vendor/leaflet/` | Kartenvorschau, lokal ausgeliefert |

## Externe Ressourcen

Beim Aufruf der Seite werden keine externen Ressourcen angefordert. Erst
nachdem eine Datei geladen wurde, holt die Kartenvorschau Kartenkacheln von
OpenStreetMap. Die Karte ist niemals Bestandteil eines Exports.

## Deployment

Reine statische Auslieferung, kein PHP und keine Datenbank. Der Inhalt des
Repositorys gehört unverändert nach `/activitylayers.com/httpdocs`.

## Beispieldateien und Prüflauf

`examples/` enthält drei erzeugte Aufzeichnungen – keine echten Touren, damit
keine Bewegungsdaten im Repository landen. Sie decken die drei Fälle ab, die
sich im Verhalten unterscheiden:

| Datei | Ergibt |
|---|---|
| `demo-ride.fit` | alle neun Overlays, drei Runden |
| `demo-ride.gpx` | acht Overlays, GPX kennt keine Runden |
| `demo-minimal.gpx` | fünf Overlays, weder Höhe noch Sensorwerte |
| `demo-ride.tcx` | alle neun Overlays, drei Runden |

Neu erzeugen mit `python3 tools/make-examples.py`. Die Dateien sind
deterministisch, derselbe Lauf liefert dieselben Bytes.

`tools/golden-test.mjs` schickt `demo-ride.fit` durch alle achtzehn Generatoren
und vergleicht die Ausgaben mit den Prüfsummen in `tools/golden.json`:

    node tools/golden-test.mjs            prüfen
    node tools/golden-test.mjs --write     Prüfsummen neu aufnehmen

Der Test braucht keine Abhängigkeiten. Er bewertet nicht, ob ein Overlay gut
aussieht – er findet Änderungen an gemeinsam genutztem Code, die unbemerkt
andere Overlays verschieben.

## Lizenzen

Dieses Projekt steht unter der MIT-Lizenz, Copyright (c) 2026 Daniel Heidrich
(siehe `LICENSE`).

Es baut auf [GPS-Data-overlay-tool](https://github.com/J-Hulin/GPS-Data-overlay-tool)
von Josiah Hulin auf. Dessen Urhebervermerk und die Lizenzen der übrigen
verwendeten Werke stehen in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
