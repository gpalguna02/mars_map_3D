import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg2://postgres:postgres@localhost:5432/sol_nav_db"
)

try:
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True, 
        pool_size=10, 
        max_overflow=20
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db_available = True
except Exception as e:
    print(f"[DATABASE WARNING] Unable to connect to PostGIS at {DATABASE_URL}: {e}")
    print("[DATABASE NOTICE] System will utilize high-fidelity fallback data store.")
    engine = None
    SessionLocal = None
    db_available = False

Base = declarative_base()


def get_db():
    """Dependency injection yield for FastAPI request lifecycle."""
    if SessionLocal is None:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
