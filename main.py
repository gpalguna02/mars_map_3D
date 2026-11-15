"""
Sol Nav - Martian EVA & Surface Navigation System
FastAPI Backend orchestrating NASA Mars Trek, USGS GIS Hub, Curiosity Traverses, 
Worldview Time-Series, and Perseverance Ground-Truth Data.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import uvicorn

import mars_datasets as datasets
from elevation_engine import get_mola_elevation, compute_elevation_profile, plan_optimized_safe_traverse, haversine_distance_km
from solar_engine import calculate_martian_solar_position
import navigation_engine

app = FastAPI(
    title="Sol Nav - Martian EVA Navigation System",
    description="Unified 3D Martian Navigation, Geospatial GIS & Traverse Hazard Engine",
    version="2.4.0"
)

# Enable CORS for cross-origin frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class WaypointModel(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees (-90 to +90)")
    lon: float = Field(..., description="Longitude in degrees (0 to 360 or -180 to 180)")
    label: Optional[str] = Field(None, description="Optional waypoint identifier")

class TraverseRequest(BaseModel):
    waypoints: List[WaypointModel]
    rover_mode: Optional[str] = Field("ASTRONAUT_EVA", description="ASTRONAUT_EVA or UNCREWED_ROVER")

# Base API Endpoints
@app.get("/api/status")
def get_system_status():
    """Telemetry heartbeat and active geodetic datum info."""
    return {
        "system": "Sol Nav Surface Navigation OS",
        "status": "OPERATIONAL",
        "datum": "IAU/IAG 2000 Mars Spheroid (Areoid R=3389.5 km)",
        "elevation_reference": "MOLA Precision Megadr (0m datum = 6.105 mbar triple point)",
        "active_rovers": ["Perseverance (Jezero)", "Curiosity (Mount Sharp)"],
        "orbital_relay": "Mars Reconnaissance Orbiter (MRO Electra UHF Link)"
    }

@app.get("/api/mars/features")
def get_nomenclature():
    """Retrieve IAU-approved Martian landmarks, volcanoes, chasmata, and craters."""
    return {
        "count": len(datasets.MARS_NOMENCLATURE),
        "features": datasets.MARS_NOMENCLATURE
    }

@app.get("/api/geology/layers")
def get_geology_layers():
    """Retrieve USGS planetary geologic units and CRISM mineralogical hotspots."""
    return {
        "geologic_units": datasets.USGS_GEOLOGIC_UNITS,
        "mineralogy_hotspots": datasets.USGS_MINERALOGY_HOTSPOTS
    }

@app.get("/api/traverse/curiosity")
def get_curiosity_traverse():
    """Curiosity traverse path across Mount Sharp with elevation checkpoints."""
    return {
        "rover": "Curiosity (MSL)",
        "mission_sol_span": "Sol 0 to Sol 3800+",
        "waypoints": datasets.CURIOSITY_TRAVERSE_WAYPOINTS
    }

@app.get("/api/traverse/perseverance")
def get_perseverance_traverse():
    """Perseverance traverse path up Jezero Delta scarp with core sample sites."""
    return {
        "rover": "Perseverance (Mars 2020)",
        "mission_sol_span": "Sol 0 to Sol 1000+",
        "waypoints": datasets.PERSEVERANCE_TRAVERSE_WAYPOINTS
    }

@app.post("/api/traverse/profile")
def analyze_traverse_profile(req: TraverseRequest):
    """
    Compute cross-sectional elevation profile along a user-specified or preset traverse.
    Flags slopes >15° in HAZARD_CRITICAL (red), calculates rover battery cost and duration.
    """
    if len(req.waypoints) < 2:
        raise HTTPException(status_code=400, detail="Traverse requires at least 2 waypoints.")
    
    dict_waypoints = [w.dict() for w in req.waypoints]
    profile_data = compute_elevation_profile(dict_waypoints)
    profile_data["mode"] = req.rover_mode
    return profile_data

@app.get("/api/hazards")
def get_surface_hazards():
    """Retrieve NASA HiRISE & rover ground hazard zones (ventifacts, sand traps, cliffs)."""
    return {
        "count": len(datasets.MARS_SURFACE_HAZARDS),
        "hazards": datasets.MARS_SURFACE_HAZARDS
    }

@app.post("/api/traverse/optimize-safe")
def optimize_safe_traverse(req: TraverseRequest):
    """
    Autonomous Hazard Avoidance & Terrain Optimization Engine.
    Detects uneven terrain, steep grades (>14°), and NASA rover hazard zones,
    generating an optimized safe detour with route comparison metrics.
    """
    if len(req.waypoints) < 2:
        raise HTTPException(status_code=400, detail="Traverse requires at least 2 waypoints.")
    
    dict_waypoints = [w.dict() for w in req.waypoints]
    return plan_optimized_safe_traverse(dict_waypoints)

@app.get("/api/elevation/point")
def get_point_elevation(lat: float = Query(..., ge=-90.0, le=90.0), lon: float = Query(...)):
    """Query precise MOLA topographic elevation in meters for any Martian coordinate."""
    elevation_m = get_mola_elevation(lat, lon)
    return {
        "lat": lat,
        "lon": lon % 360.0,
        "elevation_m": elevation_m,
        "datum": "MOLA Aeroid Datum (0m = 610.5 Pa)"
    }

@app.get("/api/sun/angle")
def get_solar_angle(
    sol: float = Query(500.0, ge=1.0, le=2000.0),
    ltst_hour: float = Query(12.0, ge=0.0, le=24.0),
    lat: float = Query(0.0, ge=-90.0, le=90.0),
    lon: float = Query(0.0)
):
    """
    Compute Mars solar declination, subsolar point, solar elevation/azimuth, 
    and Three.js 3D directional light vectors for real-time shadow projection.
    """
    return calculate_martian_solar_position(sol, ltst_hour, lat, lon)

@app.get("/api/worldview/timeline")
def get_worldview_timeline():
    """
    NASA Worldview time-series dataset covering atmospheric optical depth (tau),
    global dust storm events, and orbital satellite passes over Sols.
    """
    return {
        "series": datasets.WORLDVIEW_TIMELINE_SERIES
    }

@app.get("/api/rover/inspection")
def get_ground_truth_imagery(rover: Optional[str] = None):
    """
    Retrieve coordinate-tagged ground-level raw rover photographs with
    high-res imagery, instrument FOV, azimuth, and spectrometer rock chemistry.
    """
    photos = datasets.ROVER_GROUND_TRUTH_PHOTOS
    if rover:
        photos = [p for p in photos if p["rover"].lower() == rover.lower()]
    return {
        "count": len(photos),
        "photos": photos
    }

# Turn-by-Turn Navigation & GPS Directions Endpoint
@app.post("/api/navigation/directions")
def get_turn_by_turn_directions(req: TraverseRequest):
    """
    Generates step-by-step turn-by-turn navigation cues, voice prompts, 
    compass bearings, and maneuvers for rovers or astronauts.
    """
    if len(req.waypoints) < 2:
        raise HTTPException(status_code=400, detail="Traverse requires at least 2 waypoints.")
    
    dict_waypoints = [w.dict() for w in req.waypoints]
    # Use optimized safe traverse if hazards exist
    plan = plan_optimized_safe_traverse(dict_waypoints)
    active_profile = plan["safe_route"]["profile"] if plan["has_hazards_detected"] else plan["direct_route"]["profile"]
    
    steps = navigation_engine.generate_turn_by_turn_directions(active_profile, dict_waypoints)
    return {
        "status": "SUCCESS",
        "route_mode": req.rover_mode,
        "is_safe_rerouted": plan["has_hazards_detected"],
        "total_distance_km": active_profile[-1]["distance_km"],
        "estimated_duration_hrs": round(active_profile[-1]["distance_km"] / 3.2, 1),
        "total_steps": len(steps),
        "steps": steps
    }

# Earth vs Mars Geospatial Comparison Extension
@app.get("/api/earth-compare")
def get_earth_mars_comparison():
    """Retrieve comparative scale, elevation, canyon, and planetary metrics for Earth vs Mars."""
    return {
        "comparisons": navigation_engine.EARTH_MARS_COMPARISONS
    }

# GPS Export Extensions (GPX & GeoJSON)
@app.post("/api/export/gpx")
def export_route_gpx(req: TraverseRequest):
    """Export the active traverse route as a standard GPS GPX XML file for Earth/Planetary GPS tools."""
    dict_waypoints = [w.dict() for w in req.waypoints]
    plan = plan_optimized_safe_traverse(dict_waypoints)
    profile = plan["safe_route"]["profile"] if plan["has_hazards_detected"] else plan["direct_route"]["profile"]
    
    gpx_xml = navigation_engine.generate_gpx_xml("Sol_Nav_Mars_Traverse", profile)
    return Response(content=gpx_xml, media_type="application/gpx+xml", headers={
        "Content-Disposition": "attachment; filename=Sol_Nav_Traverse.gpx"
    })

@app.post("/api/export/geojson")
def export_route_geojson(req: TraverseRequest):
    """Export the active traverse route as a standard RFC 7946 GeoJSON FeatureCollection."""
    dict_waypoints = [w.dict() for w in req.waypoints]
    plan = plan_optimized_safe_traverse(dict_waypoints)
    profile = plan["safe_route"]["profile"] if plan["has_hazards_detected"] else plan["direct_route"]["profile"]
    
    return navigation_engine.generate_geojson("Sol_Nav_Mars_Traverse", profile)

# Global Search & POI Finder
@app.get("/api/search")
def search_features(q: str = Query(..., min_length=1)):
    """Search landmarks, craters, hazards, rovers, and mineral deposits across Mars."""
    query = q.lower().strip()
    results = []

    # Search Nomenclature Landmarks
    for lm in datasets.MARS_NOMENCLATURE:
        if query in lm["name"].lower() or query in lm["type"].lower() or query in lm["description"].lower():
            results.append({
                "name": lm["name"],
                "category": lm["type"],
                "lat": lm["lat"],
                "lon": lm["lon"],
                "elevation_m": lm["elevation_m"],
                "icon": "🌋" if "Mons" in lm["name"] else "🪐"
            })

    # Search Ground Hazards
    for hz in datasets.MARS_SURFACE_HAZARDS:
        if query in hz["name"].lower() or query in hz["hazard_type"].lower():
            results.append({
                "name": hz["name"],
                "category": f"Ground Hazard ({hz['severity']})",
                "lat": hz["lat"],
                "lon": hz["lon"],
                "elevation_m": get_mola_elevation(hz["lat"], hz["lon"]),
                "icon": "⚠️"
            })

    # Search Rover Sites
    for p in datasets.ROVER_GROUND_TRUTH_PHOTOS:
        if query in p["rover"].lower() or query in p["target_name"].lower():
            results.append({
                "name": f"{p['rover']}: {p['target_name']}",
                "category": f"Rover Photo Site (Sol {p['sol']})",
                "lat": p["lat"],
                "lon": p["lon"],
                "elevation_m": p["elevation_m"],
                "icon": "📷"
            })

    # Search Minerals
    for m in datasets.USGS_MINERALOGY_HOTSPOTS:
        if query in m["mineral"].lower() or query in m["significance"].lower():
            results.append({
                "name": m["mineral"],
                "category": f"Mineral Deposit ({m['category']})",
                "lat": m["lat"],
                "lon": m["lon"],
                "elevation_m": get_mola_elevation(m["lat"], m["lon"]),
                "icon": "💎"
            })

    return {
        "query": q,
        "count": len(results),
        "results": results[:8]
    }

# Mount static frontend directory
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Sol Nav API is running. Static frontend not yet compiled."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
