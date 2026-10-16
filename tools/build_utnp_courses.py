#!/usr/bin/env python3
"""Convert the 2026-10-12 UTNP GPX copies into static course presets.

Run with the source directory as the first argument. Distances and aid-point
chainages are the reviewed GPX summary, since loop courses revisit coordinates.
"""
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / ".buzz/RESEARCH/UTNP_GPX_261016"
NS = {"g": "http://www.topografix.com/GPX/1/1"}
SPECS = {
    "1": ("1PEAK", 12.7, 1100, [("신불산", 6.0), ("간월재", 7.4)], "2026_UTNP_1P_AMAZFIT_1012.gpx"),
    "2": ("2PEAKS", 25.6, 2500, [("청수골", 11.8)], "2026_UTNP_2P_AMAZFIT_1012.gpx"),
    "5": ("5PEAKS", 44.2, 3900, [("배내고개", 9.7), ("철구소", 24.2), ("청수골", 30.7)], "2026_UTNP_5P_AMAZFIT_1012.gpx"),
    "7": ("7PEAKS", 94.0, 8300, [("양등리", 15.9), ("대현리", 32.0), ("천문사", 42.1), ("상운산", 48.6), ("얼음골", 62.6), ("도래재", 73.0), ("철구소", 83.8)], "2026_UTNP_7P_AMAZFIT_1012.gpx"),
    "9": ("9PEAKS", 119.6, 10100, [("양등리", 15.9), ("대현리", 32.0), ("천문사", 42.1), ("상운산", 48.6), ("얼음골", 62.6), ("도래재", 73.0), ("철구소", 83.8), ("배내천", 99.8), ("도라지고개", 104.6)], "2026_UTNP_9P_AMAZFIT_1012.gpx"),
}


def haversine(a, b):
    lat1, lon1 = a
    lat2, lon2 = b
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    v = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 12742000 * math.asin(math.sqrt(v))


for key, (name, km, gain, station_info, filename) in SPECS.items():
    root = ET.parse(SOURCE / filename).getroot()
    points = []
    for x in root.findall(".//g:trkpt", NS):
        e = x.findtext("g:ele", namespaces=NS)
        points.append((round(float(x.attrib["lat"]), 5), round(float(x.attrib["lon"]), 5), round(float(e or 0))))
    # Keep roughly 30 m between points, plus every altitude turn and both ends.
    selected = [points[0]]
    for pt in points[1:-1]:
        if haversine(selected[-1][:2], pt[:2]) >= 30:
            selected.append(pt)
    selected.append(points[-1])
    waypoints = []
    for x in root.findall(".//g:wpt", NS):
        label = x.findtext("g:name", namespaces=NS)
        if label and label != "START" and float(x.attrib["lat"]) != 0:
            waypoints.append((label, round(float(x.attrib["lat"]), 5), round(float(x.attrib["lon"]), 5)))
    assert len(waypoints) == len(station_info), (name, waypoints)
    stations = [{"code": code, "name": station_name, "km": chainage, "lat": lat, "lon": lon,
                 "source": "2026 official discipline page (name, km); 2026-10-12 GPX waypoint (coordinates)"}
                for (code, lat, lon), (station_name, chainage) in zip(waypoints, station_info)]
    out = {"id": "utnp-" + key, "name": "UTNP " + name, "region": "울산 울주",
           "ds": "2026 UTNP 공식 GPX 2026-10-12 (거리·상승은 GPX 추정)",
           "dist": round(km * 1000), "gain": gain, "loss": 0,
           "emin": min(p[2] for p in selected), "emax": max(p[2] for p in selected),
           "hasEle": True, "start": list(selected[0][:2]),
           "pts": [list(p[:2]) for p in selected], "ele": [p[2] for p in selected],
           "stations": stations, "source": "https://www.utnp.kr/download/?bmode=view&idx=175062976"}
    dest = ROOT / "course-data" / f"utnp-{key}.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(dest.relative_to(ROOT), len(selected), "points", len(stations), "stations")
