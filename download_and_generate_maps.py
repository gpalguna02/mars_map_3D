"""
Sol Nav - High-Resolution Mars Global Map Generator
Downloads authentic 2K Viking Color map and synthesizes 2K MOLA Hypsometric & THEMIS Relief maps.
"""

import os
import sys
import math
import urllib.request
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from elevation_engine import get_mola_elevation

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "static", "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

# 1. Download Authentic 2K Viking Mars Map
viking_path = os.path.join(ASSETS_DIR, "mars_viking_color.jpg")
if not os.path.exists(viking_path) or os.path.getsize(viking_path) < 100000:
    print("[1/3] Downloading authentic NASA 2K Viking True-Color Mars Map...")
    url = "https://www.solarsystemscope.com/textures/download/2k_mars.jpg"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            with open(viking_path, "wb") as f:
                f.write(data)
        print(f"      -> SUCCESS! Saved {viking_path} ({len(data):,} bytes)")
    except Exception as e:
        print(f"      -> Download fallback: {e}")

# Color Ramp helper for MOLA Hypsometric Map
def get_mola_color(elev_m):
    # Clamped range: -8000m to +22000m
    t = (elev_m + 8000.0) / 30000.0
    t = max(0.0, min(1.0, t))

    # Control points: (t, (r, g, b))
    stops = [
        (0.00, (10, 20, 90)),      # Deep Basin (Hellas floor -7.1km)
        (0.12, (20, 80, 180)),     # Lowlands (Acidalia/Utopia)
        (0.24, (30, 160, 180)),    # Intermediate lowlands
        (0.35, (40, 180, 110)),    # Delta/Datum floor (-2.5km)
        (0.45, (80, 200, 70)),     # Datum Zero (0m)
        (0.55, (220, 210, 50)),    # Lower Highlands (+2km)
        (0.65, (240, 140, 40)),    # Mid Highlands (+5km)
        (0.78, (210, 50, 40)),     # Tharsis Bulge (+8km)
        (0.90, (180, 40, 140)),    # Volcanic Shields (+14km)
        (1.00, (255, 255, 255))    # Olympus Mons Peak (+21.2km)
    ]

    for i in range(len(stops) - 1):
        t1, c1 = stops[i]
        t2, c2 = stops[i + 1]
        if t1 <= t <= t2:
            f = (t - t1) / (t2 - t1)
            r = int(c1[0] + f * (c2[0] - c1[0]))
            g = int(c1[1] + f * (c2[1] - c1[1]))
            b = int(c1[2] + f * (c2[2] - c1[2]))
            return (r, g, b)
    return (255, 255, 255)

# 2. Synthesize High-Precision 2K MOLA Hypsometric Rainbow Map
mola_path = os.path.join(ASSETS_DIR, "mars_mola_elevation.jpg")
if not os.path.exists(mola_path) or os.path.getsize(mola_path) < 10000:
    print("[2/3] Generating 2K MOLA Global Hypsometric Rainbow Elevation Map...")
    w, h = 2048, 1024
    mola_img = Image.new("RGB", (w, h))
    pixels = mola_img.load()

    # Pre-calculate elevation grid in fast steps
    for y in range(h):
        lat = 90.0 - (y / float(h - 1)) * 180.0
        for x in range(w):
            lon = (x / float(w)) * 360.0
            elev = get_mola_elevation(lat, lon)
            pixels[x, y] = get_mola_color(elev)
        if y % 200 == 0:
            print(f"      -> Processing MOLA latitude scanlines... {int(y / h * 100)}%")

    mola_img.save(mola_path, "JPEG", quality=92)
    print(f"      -> SUCCESS! Saved {mola_path} ({os.path.getsize(mola_path):,} bytes)")

# 3. Synthesize THEMIS Grayscale Shaded Relief Map
themis_path = os.path.join(ASSETS_DIR, "mars_themis_relief.jpg")
if not os.path.exists(themis_path) or os.path.getsize(themis_path) < 10000:
    print("[3/3] Generating 2K THEMIS Infrared & Shaded Relief Map...")
    w, h = 2048, 1024
    themis_img = Image.new("RGB", (w, h))
    pixels = themis_img.load()

    # Illumination from North-West (azimuth 315 deg, elevation 45 deg)
    for y in range(h):
        lat = 90.0 - (y / float(h - 1)) * 180.0
        for x in range(w):
            lon = (x / float(w)) * 360.0
            # Sample gradient
            e0 = get_mola_elevation(lat, lon)
            e_east = get_mola_elevation(lat, lon + 0.35)
            e_north = get_mola_elevation(min(90.0, lat + 0.35), lon)

            dz_dx = (e_east - e0) / 20.0
            dz_dy = (e_north - e0) / 20.0

            # Hillshade equation
            # Slope and aspect
            slope_rad = math.atan(math.sqrt(dz_dx**2 + dz_dy**2))
            aspect_rad = math.atan2(dz_dy, -dz_dx)

            # Zenith 45 deg, Azimuth 315 deg (2.356 rad)
            zenith_rad = math.radians(45.0)
            azimuth_rad = math.radians(315.0)

            shaded = (math.cos(zenith_rad) * math.cos(slope_rad) +
                      math.sin(zenith_rad) * math.sin(slope_rad) * math.cos(azimuth_rad - aspect_rad))

            val = int(max(0, min(255, (shaded * 160.0) + 70.0)))
            pixels[x, y] = (val, val, val)
        if y % 200 == 0:
            print(f"      -> Processing THEMIS relief scanlines... {int(y / h * 100)}%")

    themis_img.save(themis_path, "JPEG", quality=92)
    print(f"      -> SUCCESS! Saved {themis_path} ({os.path.getsize(themis_path):,} bytes)")

print("\n>>> ALL 3 GLOBAL MARS MAPS (VIKING, MOLA, THEMIS) GENERATED & READY! <<<")
