"""
Sol Nav - Martian Geodetic & Geological Datasets
Synthesized from NASA Mars Trek (MOLA, Viking, CTX) and USGS Planetary GIS Hub.
"""

from typing import List, Dict, Any
import math

# IAU Mars Aeroid Constants (WGS-Mars Equivalent)
MARS_EQUATORIAL_RADIUS_KM = 3396.19
MARS_POLAR_RADIUS_KM = 3376.20
MARS_MEAN_RADIUS_KM = 3389.50
MARS_CIRCUMFERENCE_KM = 2 * math.pi * MARS_MEAN_RADIUS_KM

# Major Martian Features (IAU Nomenclature Gazetteer)
MARS_NOMENCLATURE = [
    {
        "id": "olympus-mons",
        "name": "Olympus Mons",
        "type": "Shield Volcano (Mons)",
        "lat": 18.65,
        "lon": 226.2,
        "elevation_m": 21229,
        "diameter_km": 624,
        "description": "Largest planetary volcano in the solar system, rising 21.2 km above the Mars datum.",
        "geologic_unit": "Amazonian Volcanic (eAv)"
    },
    {
        "id": "gale-crater",
        "name": "Gale Crater & Mount Sharp (Aeolis Mons)",
        "type": "Impact Crater / Central Mound",
        "lat": -5.37,
        "lon": 137.44,
        "elevation_m": -4500,
        "diameter_km": 154,
        "description": "Curiosity rover traverse site featuring 5.5 km tall central sediment mound displaying clay-to-sulfate transition.",
        "geologic_unit": "Hesperian-Noachian Lacustrine (Hl)"
    },
    {
        "id": "jezero-crater",
        "name": "Jezero Crater",
        "type": "Paleolake & Fluvial Delta",
        "lat": 18.38,
        "lon": 77.58,
        "elevation_m": -2530,
        "diameter_km": 49,
        "description": "Perseverance rover landing site containing an ancient river delta rich in hydrated clay and carbonate biosignatures.",
        "geologic_unit": "Noachian Deltaic (mNd)"
    },
    {
        "id": "valles-marineris",
        "name": "Valles Marineris (Melas Chasma)",
        "type": "Tectonic Rift System (Chasma)",
        "lat": -9.8,
        "lon": 283.6,
        "elevation_m": -7050,
        "diameter_km": 4000,
        "description": "Vast canyon system stretching 4,000 km along the Martian equator, plunging up to 7 km deep.",
        "geologic_unit": "Hesperian Tectonic / Sulfate Layered (eHc)"
    },
    {
        "id": "hellas-planitia",
        "name": "Hellas Planitia",
        "type": "Impact Basin",
        "lat": -42.4,
        "lon": 70.5,
        "elevation_m": -7152,
        "diameter_km": 2300,
        "description": "Deepest impact structure on Mars, with surface atmospheric pressure exceeding 11.5 mbar.",
        "geologic_unit": "Early Noachian Basin Fill (eNb)"
    },
    {
        "id": "elysium-mons",
        "name": "Elysium Mons",
        "type": "Shield Volcano",
        "lat": 25.02,
        "lon": 147.21,
        "elevation_m": 14127,
        "diameter_km": 410,
        "description": "Dominant volcanic edifice of the Elysium volcanic province.",
        "geologic_unit": "Amazonian Shield Basalt (lAv)"
    },
    {
        "id": "meridiani-planum",
        "name": "Meridiani Planum",
        "type": "Hematite Plain",
        "lat": -0.2,
        "lon": 357.5,
        "elevation_m": -1420,
        "diameter_km": 800,
        "description": "Opportunity landing plain dominated by gray hematite spherules ('blueberries') deposited in ancient groundwater.",
        "geologic_unit": "Hesperian Sulfate Bedrock (eHs)"
    },
    {
        "id": "gusev-crater",
        "name": "Gusev Crater",
        "type": "Impact Crater / Paleolake",
        "lat": -14.57,
        "lon": 175.47,
        "elevation_m": -1930,
        "diameter_km": 166,
        "description": "Spirit rover landing site with Ma'adim Vallis debouching into ancient crater lakebed.",
        "geologic_unit": "Hesperian Volcanic Plains (lHv)"
    }
]

# USGS Geologic Mapping Layers (Tanaka et al. 2014, USGS SIM 3292)
USGS_GEOLOGIC_UNITS = [
    {
        "code": "eAv",
        "name": "Early Amazonian Volcanic Unit",
        "epoch": "Amazonian (<3.0 Ga)",
        "color": "#e056fd",
        "fill_color": "rgba(224, 86, 253, 0.4)",
        "description": "Tharsis Montes and Olympus Mons basaltic flows, pyroclastic deposits and young caldera complexes.",
        "roughness": 0.35,
        "trafficability": "Moderate (sharp lava basalt)"
    },
    {
        "code": "lHv",
        "name": "Late Hesperian Volcanic Unit",
        "epoch": "Hesperian (3.7 - 3.0 Ga)",
        "color": "#f0932b",
        "fill_color": "rgba(240, 147, 43, 0.4)",
        "description": "Extensive ridged flood basalts, wrinkled plains, and low shield volcanic fields.",
        "roughness": 0.20,
        "trafficability": "High (flat regolith plain)"
    },
    {
        "code": "mNh",
        "name": "Middle Noachian Highland Unit",
        "epoch": "Noachian (>3.7 Ga)",
        "color": "#eb4d4b",
        "fill_color": "rgba(235, 77, 75, 0.4)",
        "description": "Ancient, heavily degraded impact cratered terrain dissected by relict valley networks.",
        "roughness": 0.65,
        "trafficability": "Low (boulder fields and steep escarpments)"
    },
    {
        "code": "eHc",
        "name": "Early Hesperian Chasma Floor Unit",
        "epoch": "Hesperian (3.7 - 3.4 Ga)",
        "color": "#686de0",
        "fill_color": "rgba(104, 109, 224, 0.4)",
        "description": "Interior layered deposits within Valles Marineris containing polyhydrated sulfates and iron oxides.",
        "roughness": 0.50,
        "trafficability": "Low to Variable (unconsolidated dunes & gullies)"
    },
    {
        "code": "mNd",
        "name": "Noachian Deltaic & Lacustrine Deposits",
        "epoch": "Noachian (3.8 Ga)",
        "color": "#22a6b3",
        "fill_color": "rgba(34, 166, 179, 0.4)",
        "description": "Stratified fan-delta clay and smectite siltstone beds deposited in open-basin paleolakes.",
        "roughness": 0.28,
        "trafficability": "High to Moderate (clay mudstones)"
    }
]

# Mineralogy Spatial Overlays (CRISM / OMEGA / TES Spectrometry)
USGS_MINERALOGY_HOTSPOTS = [
    {
        "id": "min-hematite-meridiani",
        "mineral": "Crystalline Gray Hematite (Fe2O3)",
        "category": "Iron Oxides",
        "color": "#e74c3c",
        "spectral_band": "850 nm / TIR 30 um",
        "lat": -0.2,
        "lon": 357.5,
        "radius_km": 350,
        "significance": "Indicator of prolonged neutral aqueous hydrothermal activity."
    },
    {
        "id": "min-clays-jezero",
        "mineral": "Fe/Mg Smectite Clays (Phyllosilicates)",
        "category": "Hydrated Silicates",
        "color": "#2ecc71",
        "spectral_band": "1.4 um / 1.9 um / 2.3 um",
        "lat": 18.38,
        "lon": 77.58,
        "radius_km": 120,
        "significance": "High preservation potential for ancient organic molecules and biosignatures."
    },
    {
        "id": "min-sulfates-gale",
        "mineral": "Hydrated Magnesium Sulfates (Kieserite/Epsomite)",
        "category": "Sulfates",
        "color": "#f1c40f",
        "spectral_band": "2.1 um / 2.4 um",
        "lat": -5.37,
        "lon": 137.44,
        "radius_km": 90,
        "significance": "Evaporite minerals marking the desiccation transition of Martian surface waters."
    },
    {
        "id": "min-olivine-nili",
        "mineral": "Olivine-rich Basaltic Bedrock (Mg,Fe)2SiO4",
        "category": "Igneous Minerals",
        "color": "#3498db",
        "spectral_band": "1.0 um wide absorption",
        "lat": 21.8,
        "lon": 74.3,
        "radius_km": 280,
        "significance": "Unaltered mantle-derived ultramafic igneous crust."
    },
    {
        "id": "min-chlorides-terra",
        "mineral": "Chloride Salt Deposits (Halite)",
        "category": "Halides",
        "color": "#9b59b6",
        "spectral_band": "TIR featureless slope",
        "lat": -28.4,
        "lon": 195.2,
        "radius_km": 160,
        "significance": "Terminal brine deposits from evaporating playa lakes."
    }
]

# Curiosity (MSL) Mount Sharp Historical Traverse Waypoints
CURIOSITY_TRAVERSE_WAYPOINTS = [
    {"name": "Bradbury Landing", "sol": 0, "lat": -4.5895, "lon": 137.4417, "elevation_m": -4520, "notes": "Touchdown site inside Gale Crater"},
    {"name": "Yellowknife Bay", "sol": 126, "lat": -4.5862, "lon": 137.4528, "elevation_m": -4525, "notes": "First drilling target 'John Klein', habitable mudstone"},
    {"name": "The Kimberley", "sol": 618, "lat": -4.6120, "lon": 137.4210, "elevation_m": -4505, "notes": "Triple stratigraphy junction"},
    {"name": "Pahrump Hills", "sol": 753, "lat": -4.6521, "lon": 137.3995, "elevation_m": -4460, "notes": "Basal boundary of Mount Sharp Murray formation"},
    {"name": "Namib Dune", "sol": 1192, "lat": -4.6710, "lon": 137.3820, "elevation_m": -4430, "notes": "Active dark basaltic barchan sand dune exploration"},
    {"name": "Vera Rubin Ridge", "sol": 1800, "lat": -4.7180, "lon": 137.3610, "elevation_m": -4290, "notes": "Prominent hematite-bearing resistant ridge"},
    {"name": "Glen Torridon (Clay Unit)", "sol": 2300, "lat": -4.7350, "lon": 137.3750, "elevation_m": -4240, "notes": "Smectite clay rich depression with biosignature potential"},
    {"name": "Greenheugh Pediment", "sol": 2700, "lat": -4.7480, "lon": 137.3450, "elevation_m": -4180, "notes": "Steepest climb conquered (31-degree slope)"},
    {"name": "Sulfate-Bearing Unit", "sol": 3300, "lat": -4.7650, "lon": 137.3890, "elevation_m": -4110, "notes": "Transition into hyper-arid sulfate rock records"},
    {"name": "Gediz Vallis Ridge", "sol": 3800, "lat": -4.7810, "lon": 137.4020, "elevation_m": -4020, "notes": "Late-stage debris flow canyon deposit on Mount Sharp"}
]

# Perseverance (Mars 2020) Jezero Delta Traverse Waypoints
PERSEVERANCE_TRAVERSE_WAYPOINTS = [
    {"name": "Octavia E. Butler Landing", "sol": 0, "lat": 18.4447, "lon": 77.4508, "elevation_m": -2574, "notes": "Crater floor touchdown"},
    {"name": "Séítah Unit", "sol": 180, "lat": 18.4285, "lon": 77.4390, "elevation_m": -2568, "notes": "Cumulate igneous olivine rock field"},
    {"name": "Three Forks Delta Base", "sol": 415, "lat": 18.4520, "lon": 77.4120, "elevation_m": -2540, "notes": "Staging area for ancient delta scarp ascent"},
    {"name": "Skinner Ridge / Delta Front", "sol": 485, "lat": 18.4610, "lon": 77.4030, "elevation_m": -2510, "notes": "Fine-grained clay delta siltstones, biosignature cores"},
    {"name": "Tenby / Enchanted Lake", "sol": 540, "lat": 18.4550, "lon": 77.4080, "elevation_m": -2522, "notes": "Layered bottomset sedimentary rock beds"},
    {"name": "Castell Henllys Margin", "sol": 720, "lat": 18.4810, "lon": 77.3890, "elevation_m": -2470, "notes": "Upper topset boulder conglomerate bed"},
    {"name": "Belva Crater Overlook", "sol": 810, "lat": 18.4980, "lon": 77.3620, "elevation_m": -2430, "notes": "1-km impact crater cross-cutting delta sediments"},
    {"name": "Neretva Vallis Inflow Channel", "sol": 980, "lat": 18.5250, "lon": 77.3180, "elevation_m": -2380, "notes": "Breached canyon wall where paleoriver flooded Jezero"}
]

# Ground-Truth Rover Image Library (Perseverance & Curiosity)
ROVER_GROUND_TRUTH_PHOTOS = [
    {
        "id": "img-percy-delta-scarp",
        "rover": "Perseverance",
        "instrument": "Mastcam-Z Stereo Left",
        "sol": 420,
        "earth_date": "2022-04-24",
        "lat": 18.4520,
        "lon": 77.4120,
        "elevation_m": -2540,
        "target_name": "Kodiak Butte / Delta Scarp Front",
        "image_url": "https://images-assets.nasa.gov/image/PIA24836/PIA24836~orig.jpg",
        "thumbnail_url": "https://images-assets.nasa.gov/image/PIA24836/PIA24836~medium.jpg",
        "fov_deg": 45.0,
        "azimuth_deg": 284.5,
        "description": "Cross-sectional stratification showing topset and dipping foreset delta beds proving active river sedimentation into ancient lake.",
        "spectral_composition": {"SiO2": "44.2%", "FeO": "18.5%", "Al2O3": "9.1%", "MgO": "8.4%", "H2O_smectite": "2.8%"}
    },
    {
        "id": "img-percy-abrasion-patch",
        "rover": "Perseverance",
        "instrument": "SuperCam Remote Micro-Imager (RMI)",
        "sol": 612,
        "earth_date": "2022-11-08",
        "lat": 18.4680,
        "lon": 77.3980,
        "elevation_m": -2495,
        "target_name": "Amalik Abrasion Patch",
        "image_url": "https://images-assets.nasa.gov/image/PIA25682/PIA25682~orig.jpg",
        "thumbnail_url": "https://images-assets.nasa.gov/image/PIA25682/PIA25682~medium.jpg",
        "fov_deg": 18.2,
        "azimuth_deg": 142.1,
        "description": "50mm diamond-coring abrasion patch showing crystal grains of magnesium sulfate and calcium carbonate precipitates.",
        "spectral_composition": {"SiO2": "38.1%", "CaO": "14.2%", "SO3": "16.8%", "FeO": "12.0%", "Organics": "Trace detected by SHERLOC"}
    },
    {
        "id": "img-curiosity-mount-sharp",
        "rover": "Curiosity",
        "instrument": "Mast Camera (Mastcam)",
        "sol": 2800,
        "earth_date": "2020-06-20",
        "lat": -4.7480,
        "lon": 137.3450,
        "elevation_m": -4180,
        "target_name": "Mount Sharp Stratified Escarpment",
        "image_url": "https://images-assets.nasa.gov/image/PIA24174/PIA24174~orig.jpg",
        "thumbnail_url": "https://images-assets.nasa.gov/image/PIA24174/PIA24174~medium.jpg",
        "fov_deg": 60.0,
        "azimuth_deg": 195.0,
        "description": "Panoramic view of the clay-bearing Glen Torridon valley transitioning up into the sulfate-rich central mound of Mount Sharp.",
        "spectral_composition": {"SiO2": "51.0%", "Al2O3": "12.4%", "Fe2O3": "21.0%", "K2O": "1.1%", "Clay_Content": "High (Fe-smectite)"}
    },
    {
        "id": "img-curiosity-namib-dune",
        "rover": "Curiosity",
        "instrument": "Hazcam Forward",
        "sol": 1192,
        "earth_date": "2015-12-14",
        "lat": -4.6710,
        "lon": 137.3820,
        "elevation_m": -4430,
        "target_name": "Namib Active Basalt Dune Field",
        "image_url": "https://images-assets.nasa.gov/image/PIA20168/PIA20168~orig.jpg",
        "thumbnail_url": "https://images-assets.nasa.gov/image/PIA20168/PIA20168~medium.jpg",
        "fov_deg": 120.0,
        "azimuth_deg": 210.3,
        "description": "Active aeolian ripples in Bagnold Dune Field showing dark coarse basaltic grains sorted by thin Martian wind gusts.",
        "spectral_composition": {"Pyroxene": "38%", "Plagioclase": "31%", "Olivine": "16%", "Magnetite": "7%"}
    }
]

# Time-Series Atmospheric & Dust Storm Progression (NASA Worldview Mars Equivalent)
WORLDVIEW_TIMELINE_SERIES = [
    {"sol": 50, "ls_deg": 15.2, "season": "Northern Spring", "tau_opacity": 0.32, "pressure_mbar": 7.4, "dust_storm_active": False, "pass_sat": "MRO"},
    {"sol": 150, "ls_deg": 65.4, "season": "Northern Spring", "tau_opacity": 0.28, "pressure_mbar": 7.1, "dust_storm_active": False, "pass_sat": "Mars Odyssey"},
    {"sol": 250, "ls_deg": 118.0, "season": "Northern Summer (Aphelion Cloud Belt)", "tau_opacity": 0.35, "pressure_mbar": 6.8, "dust_storm_active": False, "pass_sat": "Trace Gas Orbiter"},
    {"sol": 380, "ls_deg": 182.5, "season": "Northern Autumn / Southern Spring", "tau_opacity": 0.52, "pressure_mbar": 7.9, "dust_storm_active": False, "pass_sat": "MRO"},
    {"sol": 480, "ls_deg": 235.1, "season": "Perihelion / Dust Storm Season Start", "tau_opacity": 1.45, "pressure_mbar": 8.6, "dust_storm_active": True, "dust_storm_name": "Regional Chryse Dust Event", "pass_sat": "Mars Express"},
    {"sol": 540, "ls_deg": 268.0, "season": "Southern Summer Solstice", "tau_opacity": 4.10, "pressure_mbar": 9.2, "dust_storm_active": True, "dust_storm_name": "Global Planet-Encircling Dust Event (GDS)", "pass_sat": "MRO Mars Color Imager"},
    {"sol": 620, "ls_deg": 310.2, "season": "Decaying Dust Storm Phase", "tau_opacity": 1.80, "pressure_mbar": 8.5, "dust_storm_active": True, "dust_storm_name": "Atmospheric Clearing", "pass_sat": "Trace Gas Orbiter"},
    {"sol": 720, "ls_deg": 355.0, "season": "Northern Vernal Equinox", "tau_opacity": 0.40, "pressure_mbar": 7.6, "dust_storm_active": False, "pass_sat": "Mars Odyssey"}
]

# NASA HiRISE & Rover Mission Ground Hazard Records
# Catalog of real hazardous Martian terrains: sharp ventifacts, sand traps, cliffs, and boulder fields
MARS_SURFACE_HAZARDS = [
    {
        "id": "haz-gatorback-gale",
        "name": "Gatorback Fluted Ridge (Sharp Ventifacts)",
        "hazard_type": "SHARP_VENTIFACTS",
        "severity": "CRITICAL",
        "color": "#ff1744",
        "lat": -4.752,
        "lon": 137.362,
        "radius_km": 1.4,
        "slip_risk_pct": 35,
        "wheel_puncture_risk": "EXTREME",
        "max_slope_deg": 28.5,
        "nasa_mission_incident": "Curiosity Sol 3410-3430: Sharp fluted blades of wind-carved sandstone threatened rover aluminum wheels; NASA JPL planners ordered emergency 220-meter detour.",
        "avoidance_recommendation": "Divert traverse eastward across lower-grade smectite floor."
    },
    {
        "id": "haz-bagnold-dunes",
        "name": "Bagnold Active Dune Field (Sand Trap)",
        "hazard_type": "UNCONSOLIDATED_SAND_TRAP",
        "severity": "HIGH",
        "color": "#ff9100",
        "lat": -4.685,
        "lon": 137.378,
        "radius_km": 2.2,
        "slip_risk_pct": 74,
        "wheel_puncture_risk": "LOW",
        "max_slope_deg": 32.0,
        "nasa_mission_incident": "Curiosity Bagnold Traverse: Megaripple slip exceeded 65% with wheel sinkage up to 18cm. Required strict avoidance of slip-face lee slopes.",
        "avoidance_recommendation": "Traverse along firm ripple crests or bypass western margin."
    },
    {
        "id": "haz-jezero-delta-scarp",
        "name": "Jezero Delta Front Boulder Scarp",
        "hazard_type": "STEEP_CLIFF_AND_BOULDERS",
        "severity": "CRITICAL",
        "color": "#ff1744",
        "lat": 18.455,
        "lon": 77.408,
        "radius_km": 1.8,
        "slip_risk_pct": 55,
        "wheel_puncture_risk": "HIGH",
        "max_slope_deg": 29.0,
        "nasa_mission_incident": "Perseverance Sol 415: Frontal delta scarp slope exceeded 28° with loose conglomerate boulders >1.2m diameter. AutoNav rerouted to Hawksbill Gap.",
        "avoidance_recommendation": "Ascend via Hawksbill Gap ramp (gentle 9° grade)."
    },
    {
        "id": "haz-purgatory-ripple",
        "name": "Meridiani Purgatory Dune Sinkage Trap",
        "hazard_type": "UNCONSOLIDATED_SAND_TRAP",
        "severity": "CRITICAL",
        "color": "#ff9100",
        "lat": -1.948,
        "lon": 354.471,
        "radius_km": 3.5,
        "slip_risk_pct": 88,
        "wheel_puncture_risk": "LOW",
        "max_slope_deg": 14.0,
        "nasa_mission_incident": "Opportunity Sol 446: All 6 wheels embedded in soft sulfate drift; rover trapped for 5 weeks before extrication.",
        "avoidance_recommendation": "Enforce strict minimum 500m stand-off distance from large transverse aeolian ridges."
    },
    {
        "id": "haz-valles-wall-cliff",
        "name": "Valles Marineris Melas Chasma Escarpment",
        "hazard_type": "VERTICAL_CHASMA_WALL",
        "severity": "CRITICAL",
        "color": "#d50000",
        "lat": -9.85,
        "lon": 283.55,
        "radius_km": 15.0,
        "slip_risk_pct": 100,
        "wheel_puncture_risk": "FATAL_DROP",
        "max_slope_deg": 48.0,
        "nasa_mission_incident": "7,000-meter vertical sheer abyss; total vehicle rollover / destruction threshold.",
        "avoidance_recommendation": "Reroute along plateau rim or descend only via mapped spur ramps."
    },
    {
        "id": "haz-olympus-basal-scarp",
        "name": "Olympus Mons Basal Cliff Wall",
        "hazard_type": "BASAL_SCARP_CLIFF",
        "severity": "CRITICAL",
        "color": "#d50000",
        "lat": 18.25,
        "lon": 225.80,
        "radius_km": 25.0,
        "slip_risk_pct": 95,
        "wheel_puncture_risk": "EXTREME",
        "max_slope_deg": 42.0,
        "nasa_mission_incident": "Perpendicular 6-kilometer cliff barrier encircling volcanic edifice.",
        "avoidance_recommendation": "Navigate via southern landslide breach corridor."
    }
]
