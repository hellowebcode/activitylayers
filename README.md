# Activity Layers

Browser-Tool, das aus GPX- und FIT-Aufzeichnungen sechs animierte Overlays für
DaVinci Resolve (Fusion `.setting`) und After Effects (ExtendScript `.jsx`)
erzeugt. Die Verarbeitung findet vollständig im Browser statt – es gibt keinen
Upload.

Live: https://activitylayers.com

## Aufbau

Der Ordner `Final/` enthält die Seite so, wie sie ausgeliefert wird. Es gibt
keinen Build-Schritt: der Inhalt von `Final/` wird unverändert ins Webroot
kopiert.

| Datei | Inhalt |
|---|---|
| `index.html` | das Tool |
| `hilfe.html` | Anleitung, deutsch und englisch |
| `impressum.html`, `datenschutz.html` | rechtliche Angaben, zweisprachig |
| `style.css`, `script.js` | Oberfläche und gesamte Logik |
| `vendor/fonts/` | Inter und IBM Plex Mono, lokal ausgeliefert |
| `vendor/jszip.min.js` | ZIP-Erzeugung für den Sammel-Download |
| `vendor/leaflet/` | Kartenvorschau, lokal ausgeliefert |

## Externe Ressourcen

Beim Laden der Seite werden keine externen Ressourcen angefordert. Die einzige Anfrage nach außen sind die Kartenkacheln von OpenStreetMap in der
interaktiven Kartenvorschau – diese ist niemals Bestandteil eines Exports.

## Deployment

Reine statische Auslieferung, kein PHP und keine Datenbank. Der Inhalt von
`Final/` gehört nach `/activitylayers.com/httpdocs`.

## Lizenzen

Dieses Projekt steht unter der MIT-Lizenz, Copyright (c) 2026 Daniel Heidrich
(siehe `LICENSE`).

Es baut auf [GPS-Data-overlay-tool](https://github.com/J-Hulin/GPS-Data-overlay-tool)
von Josiah Hulin auf. Dessen Urhebervermerk und die Lizenzen der übrigen
verwendeten Werke stehen in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
