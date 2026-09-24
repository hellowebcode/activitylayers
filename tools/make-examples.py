#!/usr/bin/env python3
"""Erzeugt die Beispieldateien unter examples/ - deterministisch, ohne echte Aufzeichnungen.

Drei Dateien decken die Fälle ab, die sich im Verhalten unterscheiden:
  demo-ride.fit      alles vorhanden, drei Runden
  demo-ride.gpx      dieselbe Runde als GPX mit Garmin-Erweiterungen, ohne Runden
  demo-minimal.gpx   nur Koordinaten und Zeit, weder Höhe noch Sensorwerte
"""
import math, struct, os

HIER = os.path.dirname(os.path.abspath(__file__))
ZIEL = os.path.join(os.path.dirname(HIER), 'examples')

MITTE_LAT, MITTE_LON = 50.3356, 6.9475      # Nürburgring, öffentliche Rennstrecke
RADIUS_LAT, RADIUS_LON = 0.00225, 0.0035
RUNDEN, PRO_RUNDE = 3, 240                  # 3 x 4 Minuten bei 1 Hz
START_FIT = 1_090_000_000                   # Sekunden seit der FIT-Epoche
FIT_EPOCHE = 631065600

def punkte():
    """Eine geschlossene Rundstrecke, dreimal befahren. Alle Werte deterministisch."""
    aus = []
    gesamt = 0.0
    vorher = None
    for i in range(RUNDEN * PRO_RUNDE + 1):
        t = (i % PRO_RUNDE) / PRO_RUNDE * 2 * math.pi
        lat = MITTE_LAT + RADIUS_LAT * math.sin(t)
        lon = MITTE_LON + RADIUS_LON * math.sin(t) * math.cos(t) * 1.6
        hoehe = 480 + 30 * (0.5 - 0.5 * math.cos(t)) + 2 * math.sin(3 * t)
        schritt = 0.0
        if vorher is not None:
            schritt = haversine(vorher[0], vorher[1], lat, lon)
            gesamt += schritt
        vorher = (lat, lon)
        aus.append({
            'i': i, 'lat': lat, 'lon': lon, 'ele': hoehe, 'spd': schritt, 'dist': gesamt,
            # Herzfrequenz setzt bewusst erst nach 30 Sekunden ein - Brustgurt verbindet sich spät
            'hr':  None if i < 30 else int(128 + 34 * (0.5 - 0.5 * math.cos(t)) + 6 * math.sin(7 * t)),
            'cad': int(82 + 9 * math.cos(t + 0.6)),
            'pwr': int(205 + 95 * (0.5 - 0.5 * math.cos(t)) + 18 * math.sin(4 * t)),
        })
    if len(aus) > 1:
        aus[0]['spd'] = aus[1]['spd']
    return aus

def haversine(la1, lo1, la2, lo2):
    R = 6371000.0
    p1, p2 = math.radians(la1), math.radians(la2)
    dp, dl = math.radians(la2 - la1), math.radians(lo2 - lo1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

# ---------- FIT ----------
def u32(b, v): b += struct.pack('<I', v & 0xFFFFFFFF)
def i32(b, v): b += struct.pack('<i', v)
def u16(b, v): b += struct.pack('<H', v & 0xFFFF)

def schreibe_fit(pts, pfad):
    d = bytearray()
    SC = 2**31 / 180.0
    # Definition, lokale Art 0 -> Message 20 (record)
    d += bytes([0x40, 0, 0]); u16(d, 20); d += bytes([9])
    for num, size, typ in ((253,4,0x86),(0,4,0x85),(1,4,0x85),(78,4,0x86),(5,4,0x86),(6,2,0x84),(3,1,0x02),(4,1,0x02),(7,2,0x84)):
        d += bytes([num, size, typ])
    for p in pts:
        d += bytes([0x00])
        u32(d, START_FIT + p['i'])
        i32(d, int(round(p['lat'] * SC)))
        i32(d, int(round(p['lon'] * SC)))
        u32(d, int(round((p['ele'] + 500) * 5)))
        u32(d, int(round(p['dist'] * 100)))
        u16(d, int(round(p['spd'] * 1000)))
        d += bytes([0xFF if p['hr'] is None else p['hr']])
        d += bytes([p['cad']])
        u16(d, p['pwr'])
    # Definition, lokale Art 1 -> Message 19 (lap)
    d += bytes([0x41, 0, 0]); u16(d, 19); d += bytes([4])
    for num, size, typ in ((253,4,0x86),(2,4,0x86),(7,4,0x86),(9,4,0x86)):
        d += bytes([num, size, typ])
    for r in range(RUNDEN):
        a, e = r * PRO_RUNDE, (r + 1) * PRO_RUNDE
        d += bytes([0x01])
        u32(d, START_FIT + e); u32(d, START_FIT + a)
        u32(d, (e - a) * 1000)
        u32(d, int(round((pts[e]['dist'] - pts[a]['dist']) * 100)))
    kopf = bytearray([14, 0x20, 0x00, 0x08]); u32(kopf, len(d)); kopf += b'.FIT\x00\x00'
    alles = bytearray(kopf + d)
    p = crc(alles, 0, len(alles))
    alles += struct.pack('<H', p)
    open(pfad, 'wb').write(bytes(alles))
    return len(alles)

TAB = [0x0000,0xCC01,0xD801,0x1400,0xF001,0x3C00,0x2800,0xE401,
       0xA001,0x6C00,0x7800,0xB401,0x5000,0x9C01,0x8801,0x4400]
def crc(b, start, ende):
    c = 0
    for i in range(start, ende):
        for halb in (b[i] & 0x0F, (b[i] >> 4) & 0x0F):
            t = TAB[c & 0xF]; c = (c >> 4) & 0x0FFF; c = c ^ t ^ TAB[halb]
    return c

# ---------- GPX ----------
def zeit(i):
    import datetime
    basis = datetime.datetime(1989,12,31,tzinfo=datetime.timezone.utc) + datetime.timedelta(seconds=START_FIT + i)
    return basis.strftime('%Y-%m-%dT%H:%M:%SZ')

def schreibe_gpx(pts, pfad, mit_sensoren):
    ns = (' xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"') if mit_sensoren else ''
    z = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<gpx version="1.1" creator="Activity Layers example" xmlns="http://www.topografix.com/GPX/1/1"%s>' % ns,
         '  <metadata><name>Demo lap course</name><time>%s</time></metadata>' % zeit(0),
         '  <trk><name>Demo lap course</name><trkseg>']
    for p in pts:
        z.append('    <trkpt lat="%.7f" lon="%.7f">' % (p['lat'], p['lon']))
        if mit_sensoren:
            z.append('      <ele>%.1f</ele>' % p['ele'])
        z.append('      <time>%s</time>' % zeit(p['i']))
        if mit_sensoren:
            z.append('      <extensions><power>%d</power><gpxtpx:TrackPointExtension>' % p['pwr'])
            if p['hr'] is not None:
                z.append('        <gpxtpx:hr>%d</gpxtpx:hr>' % p['hr'])
            z.append('        <gpxtpx:cad>%d</gpxtpx:cad>' % p['cad'])
            z.append('      </gpxtpx:TrackPointExtension></extensions>')
        z.append('    </trkpt>')
    z += ['  </trkseg></trk>', '</gpx>', '']
    inhalt = '\n'.join(z)
    open(pfad, 'w', encoding='utf-8').write(inhalt)
    return len(inhalt.encode('utf-8'))

if __name__ == '__main__':
    os.makedirs(ZIEL, exist_ok=True)
    pts = punkte()
    a = schreibe_fit(pts, os.path.join(ZIEL, 'demo-ride.fit'))
    b = schreibe_gpx(pts, os.path.join(ZIEL, 'demo-ride.gpx'), True)
    c = schreibe_gpx(pts[::3], os.path.join(ZIEL, 'demo-minimal.gpx'), False)
    print('demo-ride.fit     %7d Byte  %d Punkte, %d Runden' % (a, len(pts), RUNDEN))
    print('demo-ride.gpx     %7d Byte  %d Punkte, mit Sensorwerten' % (b, len(pts)))
    print('demo-minimal.gpx  %7d Byte  %d Punkte, nur Position und Zeit' % (c, len(pts[::3])))
