from sqlalchemy import Column, Integer, String, Float, Text, JSON, DateTime
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from database import Base


class GeologyFeature(Base):
    """USGS Martian Geologic Layer: Impact Craters, Minerals, Volcanic Scarps."""
    __tablename__ = "geology_features"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False, index=True)
    feature_type = Column(String(64), nullable=False)
    mineral = Column(String(64), nullable=True)
    diameter_km = Column(Float, nullable=True)
    elevation_m = Column(Float, nullable=False, default=0.0)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MarsRoute(Base):
    """Simulated or historic Rover traverse path with elevation profile."""
    __tablename__ = "mars_routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    rover_target = Column(String(64), nullable=False, default="Curiosity")
    start_lat = Column(Float, nullable=False)
    start_lon = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lon = Column(Float, nullable=False)
    total_distance_km = Column(Float, nullable=False)
    max_slope_deg = Column(Float, nullable=False)
    path_geom = Column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True)
    elevation_profile = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PerseveranceImage(Base):
    """Perseverance ground-truth surface imagery hub with Mastcam-Z / SuperCam coordinates."""
    __tablename__ = "perseverance_images"

    id = Column(Integer, primary_key=True, index=True)
    sol = Column(Integer, nullable=False)
    earth_date = Column(String(32), nullable=False)
    camera = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    image_url = Column(String(512), nullable=False)
    caption = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_m = Column(Float, nullable=False, default=-2500.0)
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
