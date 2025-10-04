from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL - using SQLite for development, can be changed to PostgreSQL for production
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./soladia.db")

# Connection pool configuration from environment
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "20"))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "40"))
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))  # 1 hour
POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "True").lower() == "true"
ECHO_POOL = os.getenv("DB_ECHO_POOL", "False").lower() == "true"

# Create engine with connection pooling
# Note: SQLite doesn't support connection pooling in the same way as PostgreSQL
# For production, use PostgreSQL with these settings
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo_pool=ECHO_POOL
    )
else:
    # PostgreSQL/MySQL with proper connection pooling
    engine = create_engine(
        DATABASE_URL,
        pool_size=POOL_SIZE,
        max_overflow=MAX_OVERFLOW,
        pool_recycle=POOL_RECYCLE,
        pool_pre_ping=POOL_PRE_PING,
        echo_pool=ECHO_POOL
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
