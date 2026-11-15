"""
Sol Nav - Turn-by-Turn GPS Navigation & Earth Planetary Extensions Engine
Generates turn-by-turn navigation maneuvers, voice cues, GPX/GeoJSON exports,
and Earth-Mars comparative geospatial metrics.
"""

import math
from typing import List, Dict, Any, Tuple
from mars_datasets import MARS_MEAN_RADIUS_KM

def calculate_initial_compass_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the initial compass bearing in degrees (0-360) from point 1 to point 2."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

    bearing_rad = math.atan2(y, x)
    bearing_deg = (math.degrees(bearing_rad) + 360.0) % 360.0
    return round(bearing_deg, 1)

def bearing_to_cardinal(bearing_deg: float) -> str:
    """Convert bearing degrees to 8-point compass cardinal direction."""
    cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = int((bearing_deg + 22.5) / 45.0) % 8
    return cardinals[idx]

def generate_turn_by_turn_directions(profile_points: List[Dict[str, Any]], waypoints: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Generate step-by-step turn-by-turn GPS navigation cues, turn maneuvers,
    slope warnings, and voice prompts from route profile coordinates.
    """
    if len(profile_points) < 2:
        return []

    steps = []
    total_dist = profile_points[-1]["distance_km"]

    # Initial Departure Step
    init_bearing = calculate_initial_compass_bearing(
        profile_points[0]["lat"], profile_points[0]["lon"],
        profile_points[1]["lat"], profile_points[1]["lon"]
    )
    init_card = bearing_to_cardinal(init_bearing)
    last_wp = waypoints[-1] if waypoints and len(waypoints) > 0 else {}
    dest_name = last_wp.get("name") or last_wp.get("label") or "Mission Target"

    steps.append({
        "step_number": 1,
        "maneuver": "DEPART",
        "icon": "⬆️",
        "instruction": f"Head {init_card} ({init_bearing}°) towards {dest_name}",
        "voice_cue": f"Starting traverse. Head {init_card} at heading {int(init_bearing)} degrees.",
        "distance_km": round(profile_points[1]["distance_km"], 2),
        "cumulative_distance_km": 0.0,
        "bearing_deg": init_bearing,
        "cardinal": init_card,
        "elevation_m": profile_points[0]["elevation_m"],
        "lat": profile_points[0]["lat"],
        "lon": profile_points[0]["lon"]
    })

    prev_bearing = init_bearing
    step_accum_dist = 0.0

    # Intermediate Waypoints and Turn Maneuvers
    # Sample every ~4-8 points to detect genuine turns and slope alerts
    step_stride = max(3, len(profile_points) // 12)

    for i in range(step_stride, len(profile_points) - 1, step_stride):
        pt_prev = profile_points[i - 1]
        pt_cur = profile_points[i]
        pt_next = profile_points[min(len(profile_points) - 1, i + 1)]

        curr_bearing = calculate_initial_compass_bearing(pt_cur["lat"], pt_cur["lon"], pt_next["lat"], pt_next["lon"])
        bearing_diff = (curr_bearing - prev_bearing + 180) % 360 - 180

        dist_from_prev = pt_cur["distance_km"] - steps[-1]["cumulative_distance_km"]
        card = bearing_to_cardinal(curr_bearing)

        maneuver = "STRAIGHT"
        icon = "⬆️"
        instruction = f"Continue straight {card} for {dist_from_prev:.1f} km"
        voice_cue = f"Continue on heading {card} for {dist_from_prev:.1f} kilometers."

        # Detect Turns
        if bearing_diff > 35:
            maneuver = "TURN_RIGHT"
            icon = "↗️"
            instruction = f"In {dist_from_prev:.1f} km, turn right onto heading {card} ({curr_bearing}°)"
            voice_cue = f"In {dist_from_prev:.1f} kilometers, turn right towards {card}."
        elif bearing_diff > 15:
            maneuver = "SLIGHT_RIGHT"
            icon = "↗️"
            instruction = f"Bear slightly right towards {card} ({curr_bearing}°)"
            voice_cue = f"Bear slightly right onto heading {int(curr_bearing)} degrees."
        elif bearing_diff < -35:
            maneuver = "TURN_LEFT"
            icon = "↖️"
            instruction = f"In {dist_from_prev:.1f} km, turn left onto heading {card} ({curr_bearing}°)"
            voice_cue = f"In {dist_from_prev:.1f} kilometers, turn left towards {card}."
        elif bearing_diff < -15:
            maneuver = "SLIGHT_LEFT"
            icon = "↖️"
            instruction = f"Bear slightly left towards {card} ({curr_bearing}°)"
            voice_cue = f"Bear slightly left onto heading {int(curr_bearing)} degrees."
        elif pt_cur["slope_deg"] >= 12.0:
            maneuver = "STEEP_GRADE"
            icon = "⚠️"
            instruction = f"Steep grade warning: {pt_cur['slope_deg']}° slope for next 800m. Maintain low traction speed."
            voice_cue = f"Caution. Steep grade of {int(pt_cur['slope_deg'])} degrees ahead. Maintain low speed."

        steps.append({
            "step_number": len(steps) + 1,
            "maneuver": maneuver,
            "icon": icon,
            "instruction": instruction,
            "voice_cue": voice_cue,
            "distance_km": round(dist_from_prev, 2),
            "cumulative_distance_km": round(pt_cur["distance_km"], 2),
            "bearing_deg": curr_bearing,
            "cardinal": card,
            "elevation_m": pt_cur["elevation_m"],
            "slope_deg": pt_cur["slope_deg"],
            "lat": pt_cur["lat"],
            "lon": pt_cur["lon"]
        })

        prev_bearing = curr_bearing

    # Destination Arrival Step
    final_pt = profile_points[-1]
    steps.append({
        "step_number": len(steps) + 1,
        "maneuver": "ARRIVE",
        "icon": "🏁",
        "instruction": f"Arrive at destination: {dest_name}",
        "voice_cue": f"You have reached your destination: {dest_name}.",
        "distance_km": round(total_dist - steps[-1]["cumulative_distance_km"], 2),
        "cumulative_distance_km": round(total_dist, 2),
        "bearing_deg": prev_bearing,
        "cardinal": bearing_to_cardinal(prev_bearing),
        "elevation_m": final_pt["elevation_m"],
        "lat": final_pt["lat"],
        "lon": final_pt["lon"]
    })

    return steps

# Earth vs Mars Geospatial & Planetary Scale Comparison
EARTH_MARS_COMPARISONS = [
    {
        "category": "Volcanoes / Highest Peaks",
        "mars_feature": "Olympus Mons",
        "mars_metric": "21,229 m (21.2 km)",
        "earth_feature": "Mount Everest (Chomolungma)",
        "earth_metric": "8,848 m (8.8 km)",
        "scale_ratio": "2.4x higher than Everest",
        "comparison_note": "Olympus Mons could cover the entire state of Arizona or France; its caldera alone could swallow Hawaii."
    },
    {
        "category": "Rift Canyons",
        "mars_feature": "Valles Marineris",
        "mars_metric": "4,000 km long, 7,000 m deep, 200 km wide",
        "earth_feature": "Grand Canyon (Arizona)",
        "earth_metric": "446 km long, 1,800 m deep, 29 km wide",
        "scale_ratio": "9.0x longer, 4.0x deeper, 7.0x wider",
        "comparison_note": "Valles Marineris would span from New York to Los Angeles across the entire continental United States."
    },
    {
        "category": "Deepest Depressions",
        "mars_feature": "Hellas Planitia Impact Basin",
        "mars_metric": "2,300 km diameter, 7,152 m below datum",
        "earth_feature": "Mariana Trench / Pacific Basin",
        "earth_metric": "10,994 m below sea level",
        "scale_ratio": "Mars Hellas basin pressure is highest on planet (>11.5 mbar)",
        "comparison_note": "Hellas was created by an asteroid 4 billion years ago; it could easily contain the Mediterranean Sea."
    },
    {
        "category": "Planetary Dimensions",
        "mars_feature": "Mars Spheroid",
        "mars_metric": "Radius: 3,389.5 km | Gravity: 3.72 m/s² (38%)",
        "earth_feature": "Earth Geoid (WGS84)",
        "earth_metric": "Radius: 6,371.0 km | Gravity: 9.81 m/s² (100%)",
        "scale_ratio": "Mars diameter is 53% of Earth, with 10.7% Earth's mass",
        "comparison_note": "Mars land surface area (144.8 million km²) is almost identical to Earth's total dry land area (148.9 million km²)."
    }
]

# Standard GPS GPX Format Generator (Used in Garmin, Gaia GPS, AllTrails, Google Earth)
def generate_gpx_xml(route_name: str, profile_points: List[Dict[str, Any]]) -> str:
    """Generate valid GPX 1.1 XML string for GPS navigation devices."""
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="Sol Nav Planetary GPS Navigation System" xmlns="http://www.topografix.com/GPX/1/1">',
        f'  <metadata>',
        f'    <name>{route_name}</name>',
        f'    <desc>Martian Surface EVA Traverse Export - Sol Nav IAU Areoid</desc>',
        f'  </metadata>',
        f'  <trk>',
        f'    <name>{route_name}</name>',
        f'    <trkseg>'
    ]

    for pt in profile_points:
        xml_lines.append(f'      <trkpt lat="{pt["lat"]:.6f}" lon="{pt["lon"]:.6f}">')
        xml_lines.append(f'        <ele>{pt["elevation_m"]:.1f}</ele>')
        xml_lines.append(f'      </trkpt>')

    xml_lines.extend([
        '    </trkseg>',
        '  </trk>',
        '</gpx>'
    ])

    return '\n'.join(xml_lines)

# Standard GeoJSON FeatureCollection Generator (Used in Mapbox, Leaflet, QGIS, ArcGIS)
def generate_geojson(route_name: str, profile_points: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate GeoJSON FeatureCollection containing LineString and elevation properties."""
    coordinates = [[pt["lon"], pt["lat"], pt["elevation_m"]] for pt in profile_points]

    return {
        "type": "FeatureCollection",
        "name": route_name,
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": route_name,
                    "total_distance_km": profile_points[-1]["distance_km"] if len(profile_points) > 0 else 0.0,
                    "elevation_min_m": min(p["elevation_m"] for p in profile_points) if len(profile_points) > 0 else 0.0,
                    "elevation_max_m": max(p["elevation_m"] for p in profile_points) if len(profile_points) > 0 else 0.0,
                    "datum": "IAU/IAG 2000 Mars Spheroid"
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                }
            }
        ]
    }
