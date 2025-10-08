"""
White-Label System for Soladia Marketplace
Enterprise white-label customization and branding
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import uuid
import base64
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from fastapi import HTTPException, Depends, Request, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import aiofiles
import os
from PIL import Image
import io

Base = declarative_base()

class WhiteLabelTheme(Base):
    __tablename__ = "white_label_themes"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False)
    
    # Branding
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), default="#E60012")
    secondary_color = Column(String(7), default="#0066CC")
    accent_color = Column(String(7), default="#FFD700")
    background_color = Column(String(7), default="#FFFFFF")
    text_color = Column(String(7), default="#000000")
    
    # Typography
    font_family = Column(String(100), default="Inter")
    heading_font = Column(String(100), default="Poppins")
    font_size_base = Column(String(10), default="16px")
    
    # Layout
    header_height = Column(String(10), default="80px")
    sidebar_width = Column(String(10), default="250px")
    border_radius = Column(String(10), default="8px")
    box_shadow = Column(String(100), default="0 2px 4px rgba(0,0,0,0.1)")
    
    # Custom CSS/JS
    custom_css = Column(Text, nullable=True)
    custom_js = Column(Text, nullable=True)
    
    # Custom components
    custom_components = Column(JSON, default=dict)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WhiteLabelAsset(Base):
    __tablename__ = "white_label_assets"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    asset_type = Column(String(50), nullable=False)  # logo, favicon, banner, etc.
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class WhiteLabelDomain(Base):
    __tablename__ = "white_label_domains"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    domain = Column(String(255), unique=True, nullable=False)
    is_primary = Column(Boolean, default=False)
    ssl_certificate = Column(Text, nullable=True)
    ssl_private_key = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class WhiteLabelConfiguration(Base):
    __tablename__ = "white_label_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    
    # Branding
    company_name = Column(String(255), nullable=False)
    company_slogan = Column(String(500), nullable=True)
    company_description = Column(Text, nullable=True)
    company_website = Column(String(500), nullable=True)
    support_email = Column(String(255), nullable=True)
    support_phone = Column(String(50), nullable=True)
    
    # Legal
    terms_of_service = Column(Text, nullable=True)
    privacy_policy = Column(Text, nullable=True)
    cookie_policy = Column(Text, nullable=True)
    
    # Features
    enabled_features = Column(JSON, default=dict)
    disabled_features = Column(JSON, default=dict)
    
    # Customization
    custom_footer = Column(Text, nullable=True)
    custom_header = Column(Text, nullable=True)
    custom_404_page = Column(Text, nullable=True)
    custom_error_page = Column(Text, nullable=True)
    
    # Analytics
    google_analytics_id = Column(String(50), nullable=True)
    facebook_pixel_id = Column(String(50), nullable=True)
    custom_tracking_code = Column(Text, nullable=True)
    
    # Social media
    social_links = Column(JSON, default=dict)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic models
class ThemeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    primary_color: str = Field(default="#E60012", regex=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: str = Field(default="#0066CC", regex=r"^#[0-9A-Fa-f]{6}$")
    accent_color: str = Field(default="#FFD700", regex=r"^#[0-9A-Fa-f]{6}$")
    background_color: str = Field(default="#FFFFFF", regex=r"^#[0-9A-Fa-f]{6}$")
    text_color: str = Field(default="#000000", regex=r"^#[0-9A-Fa-f]{6}$")
    font_family: str = Field(default="Inter", max_length=100)
    heading_font: str = Field(default="Poppins", max_length=100)
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None

class ThemeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    primary_color: Optional[str] = Field(None, regex=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, regex=r"^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(None, regex=r"^#[0-9A-Fa-f]{6}$")
    background_color: Optional[str] = Field(None, regex=r"^#[0-9A-Fa-f]{6}$")
    text_color: Optional[str] = Field(None, regex=r"^#[0-9A-Fa-f]{6}$")
    font_family: Optional[str] = Field(None, max_length=100)
    heading_font: Optional[str] = Field(None, max_length=100)
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None

class ThemeResponse(BaseModel):
    id: int
    tenant_id: str
    name: str
    is_active: bool
    logo_url: Optional[str]
    favicon_url: Optional[str]
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    font_family: str
    heading_font: str
    font_size_base: str
    header_height: str
    sidebar_width: str
    border_radius: str
    box_shadow: str
    custom_css: Optional[str]
    custom_js: Optional[str]
    custom_components: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class ConfigurationCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    company_slogan: Optional[str] = Field(None, max_length=500)
    company_description: Optional[str] = None
    company_website: Optional[str] = Field(None, max_length=500)
    support_email: Optional[str] = Field(None, max_length=255)
    support_phone: Optional[str] = Field(None, max_length=50)
    terms_of_service: Optional[str] = None
    privacy_policy: Optional[str] = None
    cookie_policy: Optional[str] = None
    enabled_features: Dict[str, Any] = Field(default_factory=dict)
    disabled_features: Dict[str, Any] = Field(default_factory=dict)
    custom_footer: Optional[str] = None
    custom_header: Optional[str] = None
    social_links: Dict[str, str] = Field(default_factory=dict)
    google_analytics_id: Optional[str] = Field(None, max_length=50)
    facebook_pixel_id: Optional[str] = Field(None, max_length=50)
    custom_tracking_code: Optional[str] = None

class ConfigurationResponse(BaseModel):
    id: int
    tenant_id: str
    company_name: str
    company_slogan: Optional[str]
    company_description: Optional[str]
    company_website: Optional[str]
    support_email: Optional[str]
    support_phone: Optional[str]
    terms_of_service: Optional[str]
    privacy_policy: Optional[str]
    cookie_policy: Optional[str]
    enabled_features: Dict[str, Any]
    disabled_features: Dict[str, Any]
    custom_footer: Optional[str]
    custom_header: Optional[str]
    social_links: Dict[str, str]
    google_analytics_id: Optional[str]
    facebook_pixel_id: Optional[str]
    custom_tracking_code: Optional[str]
    created_at: datetime
    updated_at: datetime

class WhiteLabelService:
    def __init__(self, db_session, storage_path: str = "uploads/white_label"):
        self.db = db_session
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
    
    async def create_theme(self, tenant_id: str, theme_data: ThemeCreate) -> ThemeResponse:
        """Create a new white-label theme"""
        # Deactivate other themes for this tenant
        self.db.query(WhiteLabelTheme).filter(
            WhiteLabelTheme.tenant_id == tenant_id,
            WhiteLabelTheme.is_active == True
        ).update({"is_active": False})
        
        # Create new theme
        theme = WhiteLabelTheme(
            tenant_id=tenant_id,
            name=theme_data.name,
            is_active=True,
            primary_color=theme_data.primary_color,
            secondary_color=theme_data.secondary_color,
            accent_color=theme_data.accent_color,
            background_color=theme_data.background_color,
            text_color=theme_data.text_color,
            font_family=theme_data.font_family,
            heading_font=theme_data.heading_font,
            custom_css=theme_data.custom_css,
            custom_js=theme_data.custom_js
        )
        
        self.db.add(theme)
        self.db.commit()
        self.db.refresh(theme)
        
        return ThemeResponse.from_orm(theme)
    
    async def get_active_theme(self, tenant_id: str) -> Optional[ThemeResponse]:
        """Get active theme for tenant"""
        theme = self.db.query(WhiteLabelTheme).filter(
            WhiteLabelTheme.tenant_id == tenant_id,
            WhiteLabelTheme.is_active == True
        ).first()
        
        if not theme:
            return None
        
        return ThemeResponse.from_orm(theme)
    
    async def update_theme(self, theme_id: int, theme_data: ThemeUpdate) -> ThemeResponse:
        """Update theme"""
        theme = self.db.query(WhiteLabelTheme).filter(WhiteLabelTheme.id == theme_id).first()
        if not theme:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        # Update fields
        for field, value in theme_data.dict(exclude_unset=True).items():
            setattr(theme, field, value)
        
        theme.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(theme)
        
        return ThemeResponse.from_orm(theme)
    
    async def upload_asset(self, tenant_id: str, asset_type: str, file: UploadFile) -> str:
        """Upload white-label asset"""
        # Validate file type
        allowed_types = {
            "logo": ["image/png", "image/jpeg", "image/svg+xml"],
            "favicon": ["image/png", "image/x-icon", "image/svg+xml"],
            "banner": ["image/png", "image/jpeg", "image/svg+xml"],
            "background": ["image/png", "image/jpeg", "image/svg+xml"]
        }
        
        if asset_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid asset type")
        
        if file.content_type not in allowed_types[asset_type]:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # Generate filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "bin"
        filename = f"{tenant_id}_{asset_type}_{uuid.uuid4().hex}.{file_extension}"
        file_path = os.path.join(self.storage_path, filename)
        
        # Save file
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        # Get image dimensions if applicable
        width, height = None, None
        if file.content_type.startswith("image/"):
            try:
                with Image.open(io.BytesIO(content)) as img:
                    width, height = img.size
            except Exception:
                pass
        
        # Save asset record
        asset = WhiteLabelAsset(
            tenant_id=tenant_id,
            asset_type=asset_type,
            filename=filename,
            file_path=file_path,
            file_size=len(content),
            mime_type=file.content_type,
            width=width,
            height=height
        )
        
        self.db.add(asset)
        self.db.commit()
        
        return f"/api/white-label/assets/{asset.id}"
    
    async def get_asset(self, asset_id: int) -> Optional[WhiteLabelAsset]:
        """Get asset by ID"""
        return self.db.query(WhiteLabelAsset).filter(WhiteLabelAsset.id == asset_id).first()
    
    async def create_configuration(self, tenant_id: str, config_data: ConfigurationCreate) -> ConfigurationResponse:
        """Create white-label configuration"""
        # Check if configuration already exists
        existing = self.db.query(WhiteLabelConfiguration).filter(
            WhiteLabelConfiguration.tenant_id == tenant_id
        ).first()
        
        if existing:
            # Update existing configuration
            for field, value in config_data.dict(exclude_unset=True).items():
                setattr(existing, field, value)
            existing.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing)
            return ConfigurationResponse.from_orm(existing)
        else:
            # Create new configuration
            config = WhiteLabelConfiguration(
                tenant_id=tenant_id,
                **config_data.dict()
            )
            
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
            
            return ConfigurationResponse.from_orm(config)
    
    async def get_configuration(self, tenant_id: str) -> Optional[ConfigurationResponse]:
        """Get white-label configuration"""
        config = self.db.query(WhiteLabelConfiguration).filter(
            WhiteLabelConfiguration.tenant_id == tenant_id
        ).first()
        
        if not config:
            return None
        
        return ConfigurationResponse.from_orm(config)
    
    async def add_custom_domain(self, tenant_id: str, domain: str) -> bool:
        """Add custom domain for tenant"""
        # Check if domain already exists
        existing = self.db.query(WhiteLabelDomain).filter(
            WhiteLabelDomain.domain == domain
        ).first()
        
        if existing:
            return False
        
        # Add domain
        white_label_domain = WhiteLabelDomain(
            tenant_id=tenant_id,
            domain=domain
        )
        
        self.db.add(white_label_domain)
        self.db.commit()
        
        return True
    
    async def get_tenant_domains(self, tenant_id: str) -> List[str]:
        """Get tenant domains"""
        domains = self.db.query(WhiteLabelDomain).filter(
            WhiteLabelDomain.tenant_id == tenant_id,
            WhiteLabelDomain.is_active == True
        ).all()
        
        return [domain.domain for domain in domains]
    
    async def generate_theme_css(self, tenant_id: str) -> str:
        """Generate CSS for white-label theme"""
        theme = await self.get_active_theme(tenant_id)
        if not theme:
            return ""
        
        css = f"""
        :root {{
            --primary-color: {theme.primary_color};
            --secondary-color: {theme.secondary_color};
            --accent-color: {theme.accent_color};
            --background-color: {theme.background_color};
            --text-color: {theme.text_color};
            --font-family: {theme.font_family}, sans-serif;
            --heading-font: {theme.heading_font}, sans-serif;
            --font-size-base: {theme.font_size_base};
            --header-height: {theme.header_height};
            --sidebar-width: {theme.sidebar_width};
            --border-radius: {theme.border_radius};
            --box-shadow: {theme.box_shadow};
        }}
        
        body {{
            font-family: var(--font-family);
            background-color: var(--background-color);
            color: var(--text-color);
        }}
        
        h1, h2, h3, h4, h5, h6 {{
            font-family: var(--heading-font);
        }}
        
        .btn-primary {{
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }}
        
        .btn-secondary {{
            background-color: var(--secondary-color);
            border-color: var(--secondary-color);
        }}
        
        .text-primary {{
            color: var(--primary-color);
        }}
        
        .text-secondary {{
            color: var(--secondary-color);
        }}
        
        .bg-primary {{
            background-color: var(--primary-color);
        }}
        
        .bg-secondary {{
            background-color: var(--secondary-color);
        }}
        """
        
        if theme.custom_css:
            css += f"\n\n/* Custom CSS */\n{theme.custom_css}"
        
        return css
    
    async def generate_theme_js(self, tenant_id: str) -> str:
        """Generate JavaScript for white-label theme"""
        theme = await self.get_active_theme(tenant_id)
        if not theme:
            return ""
        
        js = f"""
        // White-label theme configuration
        window.WhiteLabelConfig = {{
            primaryColor: '{theme.primary_color}',
            secondaryColor: '{theme.secondary_color}',
            accentColor: '{theme.accent_color}',
            backgroundColor: '{theme.background_color}',
            textColor: '{theme.text_color}',
            fontFamily: '{theme.font_family}',
            headingFont: '{theme.heading_font}'
        }};
        """
        
        if theme.custom_js:
            js += f"\n\n/* Custom JavaScript */\n{theme.custom_js}"
        
        return js
    
    async def get_tenant_branding(self, tenant_id: str) -> Dict[str, Any]:
        """Get complete branding package for tenant"""
        theme = await self.get_active_theme(tenant_id)
        config = await self.get_configuration(tenant_id)
        domains = await self.get_tenant_domains(tenant_id)
        
        return {
            "theme": theme.dict() if theme else None,
            "configuration": config.dict() if config else None,
            "domains": domains,
            "css": await self.generate_theme_css(tenant_id),
            "js": await self.generate_theme_js(tenant_id)
        }

# Dependency injection
def get_white_label_service(db_session = Depends(get_db)) -> WhiteLabelService:
    """Get white-label service"""
    return WhiteLabelService(db_session)

