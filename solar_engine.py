"""
Sol Nav - Martian Solar Geometry & Shadow Projection Engine
Based on Allison & McEwen (2000) formulations for Mars 24h 39m 35s diurnal cycle.
"""

import math
from typing import Dict, Any

def calculate_martian_solar_position(sol: float, ltst_hour: float = 12.0, target_lat: float = 0.0, target_lon: float = 0.0) -> Dict[str, Any]:
    """
    Compute Martian solar coordinates, subsolar ground point, solar zenith/elevation, 
    and Three.js directional light vector for shadow casting.
    
    :param sol: Martian Sol index (e.g. 1 to 1000)
    :param ltst_hour: Local True Solar Time (0.0 to 24.0, where 12.0 is solar noon)
    :param target_lat: Observer's latitude (-90 to +90)
    :param target_lon: Observer's longitude (0 to 360)
    """
    # Mars orbital eccentricity e = 0.0934, obliquity = 25.19 degrees
    OBLIQUITY_DEG = 25.19
    
    # Mars Sol Date (MSD) calculation relative to arbitrary mission epoch
    msd = 50000.0 + sol + (ltst_hour / 24.65979)
    
    # Solar Longitude Ls (degrees) - defines Martian season (0 = Vernal Equinox, 180 = Autumnal, 270 = Perihelion)
    # 668.6 sols in a Martian Year
    ls_deg = ((sol * 360.0 / 668.6) + 30.0) % 360.0
    ls_rad = math.radians(ls_deg)
    
    # Solar declination angle delta_s
    sin_delta = math.sin(math.radians(OBLIQUITY_DEG)) * math.sin(ls_rad)
    solar_declination_deg = math.degrees(math.asin(sin_delta))
    
    # Subsolar longitude (moves 360 degrees every Martian Sol of 24h 39m 35s)
    # At LTST 12.0 (noon), the subsolar longitude aligns with target_lon
    hour_offset = (ltst_hour - 12.0) * 15.0  # 15 degrees per hour
    subsolar_lon = (target_lon - hour_offset) % 360.0
    subsolar_lat = solar_declination_deg
    
    # Hour angle (omega) between target location and subsolar meridian
    hour_angle_deg = (target_lon - subsolar_lon)
    hour_angle_rad = math.radians(hour_angle_deg)
    
    phi = math.radians(target_lat)
    dec = math.radians(solar_declination_deg)
    
    # Solar Elevation (alpha) and Zenith angle (z)
    sin_elev = math.sin(phi) * math.sin(dec) + math.cos(phi) * math.cos(dec) * math.cos(hour_angle_rad)
    sin_elev = max(-1.0, min(1.0, sin_elev))
    solar_elevation_rad = math.asin(sin_elev)
    solar_elevation_deg = math.degrees(solar_elevation_rad)
    solar_zenith_deg = 90.0 - solar_elevation_deg
    
    # Solar Azimuth (A)
    cos_az = (math.sin(dec) - math.sin(phi) * sin_elev) / (math.cos(phi) * math.cos(solar_elevation_rad) + 1e-9)
    cos_az = max(-1.0, min(1.0, cos_az))
    azimuth_deg = math.degrees(math.acos(cos_az))
    if math.sin(hour_angle_rad) < 0:
        azimuth_deg = 360.0 - azimuth_deg
        
    # 3D Directional Light Vector for Three.js World Coordinate System
    # Three.js Sphere: (lat, lon) maps to unit sphere
    # Light direction points FROM the Sun TOWARDS Mars origin (0,0,0)
    sun_x = math.cos(math.radians(subsolar_lat)) * math.cos(math.radians(subsolar_lon))
    sun_y = math.sin(math.radians(subsolar_lat))
    sun_z = math.cos(math.radians(subsolar_lat)) * math.sin(math.radians(subsolar_lon))
    
    is_daylight = solar_elevation_deg > -0.5
    day_state = "SOLAR_NOON" if solar_elevation_deg > 60 else ("DAYLIGHT" if is_daylight else "NIGHT_TERMINATOR")

    return {
        "sol": sol,
        "ltst_hour": ltst_hour,
        "ltst_formatted": f"{int(ltst_hour):02d}:{int((ltst_hour % 1) * 60):02d} MTC",
        "ls_season_deg": round(ls_deg, 2),
        "solar_declination_deg": round(solar_declination_deg, 2),
        "subsolar_point": {
            "lat": round(subsolar_lat, 3),
            "lon": round(subsolar_lon, 3)
        },
        "target_solar_telemetry": {
            "elevation_deg": round(solar_elevation_deg, 2),
            "zenith_deg": round(solar_zenith_deg, 2),
            "azimuth_deg": round(azimuth_deg, 2),
            "is_daylight": is_daylight,
            "illumination_state": day_state
        },
        "light_vector_3d": {
            "x": round(sun_x, 4),
            "y": round(sun_y, 4),
            "z": round(sun_z, 4)
        }
    }
