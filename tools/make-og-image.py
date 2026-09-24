#!/usr/bin/env python3
"""Erzeugt og-image.png, das Vorschaubild fuer geteilte Links.

Nutzt die Schriften und Farben der Seite, damit die Karte zum Auftritt passt.
Aufruf:  python3 tools/make-og-image.py
"""
import math, os, sys, tempfile
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)
BREITE, HOEHE, S = 1200, 630, 2          # S = Ueberabtastung fuer glatte Kanten

BG        = (15, 19, 24)
TILE      = (47, 101, 245)
AKZENT    = (91, 134, 255)
TEXT      = (238, 241, 245)
GEDAEMPFT = (154, 165, 179)
SCHWACH   = (123, 134, 148)
WEISS     = (255, 255, 255)


def schrift(name, groesse):
    """Wandelt eine der mitgelieferten woff2-Dateien in eine nutzbare Schrift."""
    quelle = os.path.join(WURZEL, 'vendor', 'fonts', name + '-latin.woff2')
    ziel = os.path.join(tempfile.gettempdir(), name + '.ttf')
    if not os.path.exists(ziel):
        f = TTFont(quelle)
        f.flavor = None
        f.save(ziel)
    return ImageFont.truetype(ziel, groesse)


def bezier(p0, p1, p2, p3, n=48):
    punkte = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        punkte.append((
            u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
            u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
        ))
    return punkte


def marke(d, x, y, groesse):
    """Das Zeichen der Seite: gerundete Kachel mit drei Wellen und Endpunkten."""
    e = groesse / 48.0
    d.rounded_rectangle([x, y, x + groesse, y + groesse], radius=11*e, fill=TILE)
    sk = 0.84
    def P(px, py):
        return (x + (24 + (px - 24)*sk)*e, y + (24 + (py - 24)*sk)*e)
    strich = max(2, round(3.1*e*sk))
    radius = 2*e*sk
    for mitte, erst_hoch in ((14, True), (24, False), (34, True)):
        v = -5 if erst_hoch else 5
        a = bezier(P(8, mitte), P(13.5, mitte+v), P(18.5, mitte-v), P(24, mitte))
        b = bezier(P(24, mitte), P(29.5, mitte+v), P(34.5, mitte+v), P(40, mitte))
        d.line(a, fill=WEISS, width=strich, joint='curve')
        d.line(b, fill=WEISS, width=strich, joint='curve')
        for px in (8, 40):
            cx, cy = P(px, mitte)
            d.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], fill=WEISS)


def hoehenprofil(d, y, hoehe, breite, unterkante, punkt_x):
    """Angedeutetes Hoehenprofil als Band am unteren Rand."""
    punkte = []
    for i in range(321):
        t = i / 320
        w = (math.sin(t*6.1) * 0.5 + math.sin(t*15.3 + 1.2) * 0.26
             + math.sin(t*31.0 + 2.7) * 0.12)
        punkte.append((t*breite, y + hoehe/2 - w*hoehe/2))
    d.polygon(punkte + [(breite, unterkante), (0, unterkante)], fill=(26, 35, 54))
    d.line(punkte, fill=AKZENT, width=5, joint='curve')
    naechster = min(punkte, key=lambda q: abs(q[0] - punkt_x))
    ex, ey = naechster
    d.ellipse([ex-13, ey-13, ex+13, ey+13], fill=BG, outline=AKZENT, width=5)


def bau():
    B, H = BREITE*S, HOEHE*S
    bild = Image.new('RGB', (B, H), BG)

    # weicher Schein oben rechts
    schein = Image.new('L', (B, H), 0)
    sd = ImageDraw.Draw(schein)
    for i in range(70):
        r = (70 - i) * 13 * S
        sd.ellipse([B - 150*S - r, -220*S - r, B - 150*S + r, -220*S + r], fill=i)
    bild.paste(Image.new('RGB', (B, H), (32, 52, 104)), (0, 0), schein)

    d = ImageDraw.Draw(bild)
    r = lambda v: round(v*S)

    marke(d, r(80), r(72), r(92))
    d.text((r(200), r(96)), 'Activity Layers', font=schrift('inter-700', r(50)), fill=TEXT)
    d.text((r(202), r(146)), 'activitylayers.com', font=schrift('inter-500', r(24)), fill=SCHWACH)

    kopf = schrift('inter-700', r(66))
    d.text((r(80), r(244)), 'Turn GPS recordings into', font=kopf, fill=TEXT)
    d.text((r(80), r(324)), 'animated video overlays', font=kopf, fill=AKZENT)

    d.text((r(80), r(428)), 'GPX · FIT · TCX — for DaVinci Resolve and After Effects',
           font=schrift('inter-500', r(30)), fill=GEDAEMPFT)

    hoehenprofil(d, r(512), r(76), B, H, r(1040))

    return bild.resize((BREITE, HOEHE), Image.LANCZOS)


if __name__ == '__main__':
    ziel = os.path.join(WURZEL, 'og-image.png')
    bau().save(ziel, optimize=True)
    print(ziel, os.path.getsize(ziel), 'Bytes')
