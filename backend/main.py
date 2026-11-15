import math
import numpy as np
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import engine, get_db, Base, db_available
from models import GeologyFeature, MarsRoute, PerseveranceImage

# Create database tables if PostGIS connection is active
if engine and db_available:
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"[POSTGIS NOTICE] Schema sync deferred: {exc}")

app = FastAPI(
    title="Sol Nav // 3D Martian Surface EVA Navigator API",
    description="Spatial GIS backend synthesizing USGS Geology, Curiosity Route Planner, and Perseverance Imagery",
    version="2.0.0"
)

# Robust Cross-Origin Resource Sharing for Vite client
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FALLBACK_GEOLOGY = [
    {
        "id": 1,
        "name": "Jezero Crater Delta Deposit",
        "feature_type": "mineral_deposit",
        "mineral": "hydrated_silica",
        "diameter_km": 45.0,
        "elevation_m": -2530.0,
        "description": "Ancient lacustrine delta fan rich in smectite clay minerals and biosignature-preserving carbonates.",
        "latitude": 18.38,
        "longitude": 77.58
    },
    {
        "id": 2,
        "name": "Olympus Mons Summit Caldera",
        "feature_type": "caldera",
        "mineral": "pyroxene_basalt",
        "diameter_km": 80.0,
        "elevation_m": 21287.0,
        "description": "Massive shield volcano summit complex featuring nested collapse calderas and sheer basalt cliffs.",
        "latitude": 18.65,
        "longitude": -133.80
    },
    {
        "id": 3,
        "name": "Gale Crater Central Peak (Aeolis Mons)",
        "feature_type": "crater",
        "mineral": "hematite_sulfates",
        "diameter_km": 154.0,
        "elevation_m": -4450.0,
        "description": "Stratified sulfate and clay strata ascending 5.5 km from the crater floor explored by Curiosity.",
        "latitude": -5.36,
        "longitude": 137.84
    },
    {
        "id": 4,
        "name": "Valles Marineris (Coprates Chasma)",
        "feature_type": "chasma",
        "mineral": "iron_oxides",
        "diameter_km": 400.0,
        "elevation_m": -7100.0,
        "description": "Tectonic rift valley exhibiting steep wall escarpments and recurring slope lineae (RSL).",
        "latitude": -14.20,
        "longitude": -59.20
    },
    {
        "id": 5,
        "name": "Belva Impact Crater",
        "feature_type": "crater",
        "mineral": "olivine",
        "diameter_km": 0.9,
        "elevation_m": -2410.0,
        "description": "Secondary impact crater in Jezero exposing inclined sedimentary bedrock layers.",
        "latitude": 18.42,
        "longitude": 77.40
    }
]

FALLBACK_IMAGES = {
    1: {
        "id": 1,
        "sol": 743,
        "earth_date": "2023-03-24",
        "camera": "MASTCAM_Z_RIGHT",
        "title": "Jezero Fan Delta Sedimentary Stratification",
        "image_url": "https://photojournal.jpl.nasa.gov/jpeg/PIA25752.jpg",
        "caption": "High-resolution mosaic showing fine-scale cross-bedding in the delta front scarp, indicative of high-energy fluvial transport.",
        "latitude": 18.38,
        "longitude": 77.58,
        "elevation_m": -2530.0
    },
    2: {
        "id": 2,
        "sol": 378,
        "earth_date": "2022-03-14",
        "camera": "SUPERCAM_RMI",
        "title": "Kodiak Butte Erosional Remnant",
        "image_url": "https://photojournal.jpl.nasa.gov/jpeg/PIA24836.jpg",
        "caption": "Telescopic micro-imager view of bottomset and topset strata in isolated delta butte confirming lake paleodepth.",
        "latitude": 18.35,
        "longitude": 77.51,
        "elevation_m": -2490.0
    },
    3: {
        "id": 3,
        "sol": 890,
        "earth_date": "2023-08-21",
        "camera": "NAVCAM_LEFT",
        "title": "Mandu Wall Lithology Assessment",
        "image_url": "https://photojournal.jpl.nasa.gov/jpeg/PIA25895.jpg",
        "caption": "Wide-angle stereoscopic image of textured bedrock outcrop exhibiting polygonal desiccation fractures.",
        "latitude": 18.41,
        "longitude": 77.62,
        "elevation_m": -2545.0
    }
}


class RouteRequest(BaseModel):
    start_lat: float = Field(..., ge=-90.0, le=90.0)
    start_lon: float = Field(..., ge=-180.0, le=180.0)
    end_lat: float = Field(..., ge=-90.0, le=90.0)
    end_lon: float = Field(..., ge=-180.0, le=180.0)
    steps: Optional[int] = Field(60, ge=10, le=300)


class RoutePoint(BaseModel):
    step: int
    lat: float
    lon: float
    distance_km: float
    elevation_m: float
    slope_deg: float
    is_hazard: bool


class RouteResponse(BaseModel):
    name: str
    total_distance_km: float
    min_elevation_m: float
    max_elevation_m: float
    max_slope_deg: float
    hazard_count: int
    points: List[RoutePoint]


def estimate_mars_mola_elevation(lat: float, lon: float) -> float:
    rad_lat = math.radians(lat)
    rad_lon = math.radians(lon)
    dichotomy = -2200.0 if lat >= 0 else 1400.0
    h1 = 1800.0 * math.sin(rad_lat) * math.cos(rad_lon)
    h2 = 900.0 * math.cos(2.0 * rad_lat) * math.sin(2.0 * rad_lon)
    h3 = 450.0 * math.sin(3.0 * rad_lat + 0.5) * math.cos(rad_lon)
    elev = dichotomy + h1 + h2 + h3

    d_olympus = math.sqrt((lat - 18.65)**2 + (lon - (-133.80))**2)
    if d_olympus < 8.0:
        elev += 19000.0 * math.exp(-(d_olympus**2) / 10.0)

    d_jezero = math.sqrt((lat - 18.38)**2 + (lon - 77.58)**2)
    if d_jezero < 4.0:
        elev = -2530.0 + (d_jezero * 110.0)

    d_gale = math.sqrt((lat - (-5.36))**2 + (lon - 137.84)**2)
    if d_gale < 4.0:
        elev = -4450.0 + (d_gale * 320.0)

    return round(elev, 2)


def haversine_distance_mars(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R_MARS = 3389.5
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0)**2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R_MARS * c


@app.get("/")
def root():
    return {
        "system": "Sol Nav // Martian EVA Pathfinding Engine",
        "status": "OPERATIONAL",
        "postgis_active": db_available,
        "endpoints": ["/api/geology", "/api/route", "/api/images/{coord_id}"]
    }


@app.get("/api/geology")
def get_geology_layers(db: Optional[Session] = Depends(get_db)):
    if db and db_available:
        try:
            records = db.query(GeologyFeature).all()
            if records:
                return [
                    {
                        "id": r.id,
                        "name": r.name,
                        "feature_type": r.feature_type,
                        "mineral": r.mineral,
                        "diameter_km": r.diameter_km,
                        "elevation_m": r.elevation_m,
                        "description": r.description,
                        "latitude": r.latitude,
                        "longitude": r.longitude
                    }
                    for r in records
                ]
        except Exception as e:
            print(f"[SQL ERROR] Reverting to cached geology dataset: {e}")

    return FALLBACK_GEOLOGY


@app.post("/api/route", response_model=RouteResponse)
def calculate_curiosity_route(req: RouteRequest, db: Optional[Session] = Depends(get_db)):
    num_steps = req.steps
    total_dist = haversine_distance_mars(req.start_lat, req.start_lon, req.end_lat, req.end_lon)

    if total_dist < 0.001:
        elev = estimate_mars_mola_elevation(req.start_lat, req.start_lon)
        pt = RoutePoint(
            step=0,
            lat=req.start_lat,
            lon=req.start_lon,
            distance_km=0.0,
            elevation_m=elev,
            slope_deg=0.0,
            is_hazard=False
        )
        return RouteResponse(
            name="Stationary EVA Observation",
            total_distance_km=0.0,
            min_elevation_m=elev,
            max_elevation_m=elev,
            max_slope_deg=0.0,
            hazard_count=0,
            points=[pt]
        )

    route_points: List[RoutePoint] = []
    elevations: List[float] = []
    slopes: List[float] = []
    hazard_tally = 0

    accumulated_km = 0.0
    prev_lat = req.start_lat
    prev_lon = req.start_lon
    prev_elev = estimate_mars_mola_elevation(req.start_lat, req.start_lon)

    for i in range(num_steps):
        t = i / float(num_steps - 1)
        base_lat = req.start_lat + t * (req.end_lat - req.start_lat)
        base_lon = req.start_lon + t * (req.end_lon - req.start_lon)

        arc_offset = 0.08 * math.sin(t * math.pi)
        curr_lat = base_lat + arc_offset * math.cos(math.radians(base_lon))
        curr_lon = base_lon + arc_offset * math.sin(math.radians(base_lat))

        curr_elev = estimate_mars_mola_elevation(curr_lat, curr_lon)

        if i == 0:
            step_dist = 0.0
            slope = 0.0
        else:
            step_dist = haversine_distance_mars(prev_lat, prev_lon, curr_lat, curr_lon)
            accumulated_km += step_dist
            delta_elev_m = abs(curr_elev - prev_elev)
            horiz_dist_m = max(step_dist * 1000.0, 1.0)
            slope = math.degrees(math.atan(delta_elev_m / horiz_dist_m))
            slope = min(round(slope, 2), 35.0)

        is_hazard = slope > 15.0
        if is_hazard:
            hazard_tally += 1

        route_points.append(RoutePoint(
            step=i,
            lat=round(curr_lat, 5),
            lon=round(curr_lon, 5),
            distance_km=round(accumulated_km, 3),
            elevation_m=round(curr_elev, 1),
            slope_deg=round(slope, 2),
            is_hazard=is_hazard
        ))

        elevations.append(curr_elev)
        slopes.append(slope)

        prev_lat = curr_lat
        prev_lon = curr_lon
        prev_elev = curr_elev

    return RouteResponse(
        name=f"EVA Traverse: ({req.start_lat:.2f}, {req.start_lon:.2f}) -> ({req.end_lat:.2f}, {req.end_lon:.2f})",
        total_distance_km=round(accumulated_km, 3),
        min_elevation_m=min(elevations),
        max_elevation_m=max(elevations),
        max_slope_deg=max(slopes) if slopes else 0.0,
        hazard_count=hazard_tally,
        points=route_points
    )


@app.get("/api/images/{coord_id}")
def get_perseverance_image(coord_id: int, db: Optional[Session] = Depends(get_db)):
    if db and db_available:
        try:
            record = db.query(PerseveranceImage).filter(PerseveranceImage.id == coord_id).first()
            if record:
                return {
                    "id": record.id,
                    "sol": record.sol,
                    "earth_date": record.earth_date,
                    "camera": record.camera,
                    "title": record.title,
                    "image_url": record.image_url,
                    "caption": record.caption,
                    "latitude": record.latitude,
                    "longitude": record.longitude,
                    "elevation_m": record.elevation_m
                }
        except Exception as e:
            print(f"[SQL ERROR] Image query fallback: {e}")

    if coord_id in FALLBACK_IMAGES:
        return FALLBACK_IMAGES[coord_id]

    raise HTTPException(status_code=404, detail=f"No Martian ground imagery matching coordinate ID #{coord_id}")


@app.get("/api/images")
def list_perseverance_images(db: Optional[Session] = Depends(get_db)):
    if db and db_available:
        try:
            records = db.query(PerseveranceImage).all()
            if records:
                return [
                    {
                        "id": r.id,
                        "sol": r.sol,
                        "earth_date": r.earth_date,
                        "camera": r.camera,
                        "title": r.title,
                        "image_url": r.image_url,
                        "caption": r.caption,
                        "latitude": r.latitude,
                        "longitude": r.longitude,
                        "elevation_m": r.elevation_m
                    }
                    for r in records
                ]
        except Exception:
            pass

    return list(FALLBACK_IMAGES.values())
