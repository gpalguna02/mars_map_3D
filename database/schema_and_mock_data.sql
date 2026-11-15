-- Sol Nav // PostGIS Database Initialization & Mock Dataset
-- Target Database: sol_nav_db

CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS geology_features CASCADE;
CREATE TABLE geology_features (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    feature_type VARCHAR(64) NOT NULL,
    mineral VARCHAR(64),
    diameter_km DOUBLE PRECISION,
    elevation_m DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS mars_routes CASCADE;
CREATE TABLE mars_routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    rover_target VARCHAR(64) NOT NULL DEFAULT 'Curiosity',
    start_lat DOUBLE PRECISION NOT NULL,
    start_lon DOUBLE PRECISION NOT NULL,
    end_lat DOUBLE PRECISION NOT NULL,
    end_lon DOUBLE PRECISION NOT NULL,
    total_distance_km DOUBLE PRECISION NOT NULL,
    max_slope_deg DOUBLE PRECISION NOT NULL,
    path_geom GEOMETRY(LineString, 4326),
    elevation_profile JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS perseverance_images CASCADE;
CREATE TABLE perseverance_images (
    id SERIAL PRIMARY KEY,
    sol INTEGER NOT NULL,
    earth_date VARCHAR(32) NOT NULL,
    camera VARCHAR(64) NOT NULL,
    title VARCHAR(256) NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    caption TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation_m DOUBLE PRECISION NOT NULL DEFAULT -2500.0,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO geology_features (name, feature_type, mineral, diameter_km, elevation_m, description, latitude, longitude, geom)
VALUES 
(
    'Jezero Crater Delta Deposit',
    'mineral_deposit',
    'hydrated_silica',
    45.0,
    -2530.0,
    'Ancient lacustrine delta fan rich in smectite clay minerals and biosignature-preserving carbonates.',
    18.38,
    77.58,
    ST_SetSRID(ST_MakePoint(77.58, 18.38), 4326)
),
(
    'Olympus Mons Summit Caldera',
    'caldera',
    'pyroxene_basalt',
    80.0,
    21287.0,
    'Massive shield volcano summit complex featuring nested collapse calderas and sheer basalt cliffs.',
    18.65,
    -133.80,
    ST_SetSRID(ST_MakePoint(-133.80, 18.65), 4326)
),
(
    'Gale Crater Central Peak (Aeolis Mons)',
    'crater',
    'hematite_sulfates',
    154.0,
    -4450.0,
    'Stratified sulfate and clay strata ascending 5.5 km from the crater floor explored by Curiosity.',
    -5.36,
    137.84,
    ST_SetSRID(ST_MakePoint(137.84, -5.36), 4326)
);

INSERT INTO mars_routes (name, rover_target, start_lat, start_lon, end_lat, end_lon, total_distance_km, max_slope_deg, path_geom, elevation_profile)
VALUES (
    'Curiosity Traverse: Bradbury Landing to Mount Sharp Base',
    'Curiosity',
    -4.5895, 137.4417,
    -4.6500, 137.5200,
    5.82,
    16.4,
    ST_SetSRID(ST_GeomFromText('LINESTRING(137.4417 -4.5895, 137.4700 -4.6100, 137.5200 -4.6500)'), 4326),
    '[
        {"step": 0, "lat": -4.5895, "lon": 137.4417, "distance_km": 0.0, "elevation_m": -4520.0, "slope_deg": 2.1, "is_hazard": false},
        {"step": 1, "lat": -4.6100, "lon": 137.4700, "distance_km": 2.6, "elevation_m": -4490.0, "slope_deg": 16.4, "is_hazard": true},
        {"step": 2, "lat": -4.6500, "lon": 137.5200, "distance_km": 5.82, "elevation_m": -4410.0, "slope_deg": 8.3, "is_hazard": false}
    ]'::jsonb
);

INSERT INTO perseverance_images (sol, earth_date, camera, title, image_url, caption, latitude, longitude, elevation_m, geom)
VALUES 
(
    743,
    '2023-03-24',
    'MASTCAM_Z_RIGHT',
    'Jezero Fan Delta Sedimentary Stratification',
    'https://photojournal.jpl.nasa.gov/jpeg/PIA25752.jpg',
    'High-resolution mosaic showing fine-scale cross-bedding in the delta front scarp, indicative of high-energy fluvial transport.',
    18.38,
    77.58,
    -2530.0,
    ST_SetSRID(ST_MakePoint(77.58, 18.38), 4326)
),
(
    378,
    '2022-03-14',
    'SUPERCAM_RMI',
    'Kodiak Butte Erosional Remnant',
    'https://photojournal.jpl.nasa.gov/jpeg/PIA24836.jpg',
    'Telescopic micro-imager view of bottomset and topset strata in isolated delta butte confirming lake paleodepth.',
    18.35,
    77.51,
    -2490.0,
    ST_SetSRID(ST_MakePoint(77.51, 18.35), 4326)
);
