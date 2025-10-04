"""
Configuration management for Soladia Marketplace
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database Configuration
    DATABASE_URL: str = "sqlite:///./soladia.db"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_PRE_PING: bool = True
    DB_ECHO_POOL: bool = False
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # CORS Configuration
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8081"
    
    # Solana Configuration
    SOLANA_RPC_URL: str = "https://api.devnet.solana.com"
    SOLANA_NETWORK: str = "devnet"
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_GENERAL: str = "100/minute"
    RATE_LIMIT_PAYMENT: str = "10/minute"
    RATE_LIMIT_AUTH: str = "5/minute"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 30
    
    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False
    
    # Monitoring
    ENABLE_METRICS: bool = True
    ENABLE_HEALTH_CHECK: bool = True
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

