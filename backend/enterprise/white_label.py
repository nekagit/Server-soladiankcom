"""
White-label customization for Soladia Enterprise
"""
from typing import Optional, Dict, Any, List
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid
import json

Base = declarative_base()

class WhiteLabelConfig(Base):
    """White-label configuration model"""
    __tablename__ = "white_label_configs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False)
    
    # Branding
    brand_name = Column(String(255), nullable=False)
    brand_logo = Column(String(500), nullable=True)
    brand_favicon = Column(String(500), nullable=True)
    brand_slogan = Column(String(500), nullable=True)
    
    # Color scheme
    primary_color = Column(String(7), default="#E60012")
    secondary_color = Column(String(7), default="#0066CC")
    accent_color = Column(String(7), default="#FFD700")
    background_color = Column(String(7), default="#FFFFFF")
    text_color = Column(String(7), default="#000000")
    
    # Typography
    font_family = Column(String(100), default="Inter")
    heading_font = Column(String(100), default="Poppins")
    font_size_base = Column(Integer, default=16)
    font_size_heading = Column(Integer, default=24)
    
    # Layout
    layout_style = Column(String(50), default="modern")  # modern, classic, minimal
    header_style = Column(String(50), default="sticky")  # sticky, fixed, static
    sidebar_style = Column(String(50), default="collapsible")  # collapsible, fixed, hidden
    
    # Custom CSS/JS
    custom_css = Column(Text, nullable=True)
    custom_js = Column(Text, nullable=True)
    custom_html = Column(Text, nullable=True)
    
    # Domain settings
    custom_domain = Column(String(255), nullable=True)
    ssl_enabled = Column(Boolean, default=True)
    
    # Feature customization
    enabled_features = Column(JSON, nullable=True)
    disabled_features = Column(JSON, nullable=True)
    custom_features = Column(JSON, nullable=True)
    
    # Content customization
    welcome_message = Column(Text, nullable=True)
    footer_text = Column(Text, nullable=True)
    terms_of_service = Column(Text, nullable=True)
    privacy_policy = Column(Text, nullable=True)
    
    # Social media
    social_links = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WhiteLabelTheme(Base):
    """White-label theme model"""
    __tablename__ = "white_label_themes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Theme configuration
    config = Column(JSON, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WhiteLabelService:
    """Service for managing white-label customization"""
    
    def __init__(self, db_session):
        self.db = db_session
    
    async def create_white_label_config(
        self,
        tenant_id: str,
        brand_name: str,
        **kwargs
    ) -> WhiteLabelConfig:
        """Create white-label configuration"""
        config = WhiteLabelConfig(
            tenant_id=tenant_id,
            brand_name=brand_name,
            **kwargs
        )
        
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        
        return config
    
    async def get_white_label_config(self, tenant_id: str) -> Optional[WhiteLabelConfig]:
        """Get white-label configuration for tenant"""
        return self.db.query(WhiteLabelConfig).filter(
            WhiteLabelConfig.tenant_id == tenant_id
        ).first()
    
    async def update_white_label_config(
        self,
        tenant_id: str,
        config_data: Dict[str, Any]
    ) -> WhiteLabelConfig:
        """Update white-label configuration"""
        config = self.db.query(WhiteLabelConfig).filter(
            WhiteLabelConfig.tenant_id == tenant_id
        ).first()
        
        if not config:
            config = WhiteLabelConfig(tenant_id=tenant_id)
            self.db.add(config)
        
        for key, value in config_data.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        self.db.commit()
        self.db.refresh(config)
        
        return config
    
    async def create_theme(
        self,
        tenant_id: str,
        name: str,
        config: Dict[str, Any],
        description: Optional[str] = None
    ) -> WhiteLabelTheme:
        """Create a new theme"""
        theme = WhiteLabelTheme(
            tenant_id=tenant_id,
            name=name,
            description=description,
            config=config
        )
        
        self.db.add(theme)
        self.db.commit()
        self.db.refresh(theme)
        
        return theme
    
    async def get_tenant_themes(self, tenant_id: str) -> List[WhiteLabelTheme]:
        """Get all themes for a tenant"""
        return self.db.query(WhiteLabelTheme).filter(
            WhiteLabelTheme.tenant_id == tenant_id
        ).all()
    
    async def activate_theme(self, tenant_id: str, theme_id: str) -> WhiteLabelTheme:
        """Activate a theme"""
        # Deactivate all other themes
        self.db.query(WhiteLabelTheme).filter(
            WhiteLabelTheme.tenant_id == tenant_id
        ).update({"is_active": False})
        
        # Activate the selected theme
        theme = self.db.query(WhiteLabelTheme).filter(
            WhiteLabelTheme.id == theme_id,
            WhiteLabelTheme.tenant_id == tenant_id
        ).first()
        
        if theme:
            theme.is_active = True
            self.db.commit()
            self.db.refresh(theme)
        
        return theme
    
    async def get_active_theme(self, tenant_id: str) -> Optional[WhiteLabelTheme]:
        """Get the active theme for a tenant"""
        return self.db.query(WhiteLabelTheme).filter(
            WhiteLabelTheme.tenant_id == tenant_id,
            WhiteLabelTheme.is_active == True
        ).first()
    
    async def generate_custom_css(self, tenant_id: str) -> str:
        """Generate custom CSS for tenant"""
        config = await self.get_white_label_config(tenant_id)
        if not config:
            return ""
        
        css_variables = f"""
        :root {{
            --brand-primary: {config.primary_color};
            --brand-secondary: {config.secondary_color};
            --brand-accent: {config.accent_color};
            --brand-background: {config.background_color};
            --brand-text: {config.text_color};
            --font-family: {config.font_family};
            --heading-font: {config.heading_font};
            --font-size-base: {config.font_size_base}px;
            --font-size-heading: {config.font_size_heading}px;
        }}
        """
        
        custom_css = config.custom_css or ""
        
        return css_variables + custom_css
    
    async def generate_custom_js(self, tenant_id: str) -> str:
        """Generate custom JavaScript for tenant"""
        config = await self.get_white_label_config(tenant_id)
        if not config:
            return ""
        
        return config.custom_js or ""
    
    async def get_brand_assets(self, tenant_id: str) -> Dict[str, Any]:
        """Get brand assets for tenant"""
        config = await self.get_white_label_config(tenant_id)
        if not config:
            return {}
        
        return {
            "brand_name": config.brand_name,
            "brand_logo": config.brand_logo,
            "brand_favicon": config.brand_favicon,
            "brand_slogan": config.brand_slogan,
            "primary_color": config.primary_color,
            "secondary_color": config.secondary_color,
            "accent_color": config.accent_color,
            "font_family": config.font_family,
            "heading_font": config.heading_font,
        }
    
    async def get_social_links(self, tenant_id: str) -> Dict[str, str]:
        """Get social media links for tenant"""
        config = await self.get_white_label_config(tenant_id)
        if not config or not config.social_links:
            return {}
        
        return config.social_links
    
    async def get_custom_content(self, tenant_id: str) -> Dict[str, str]:
        """Get custom content for tenant"""
        config = await self.get_white_label_config(tenant_id)
        if not config:
            return {}
        
        return {
            "welcome_message": config.welcome_message,
            "footer_text": config.footer_text,
            "terms_of_service": config.terms_of_service,
            "privacy_policy": config.privacy_policy,
        }
    
    async def get_enabled_features(self, tenant_id: str) -> List[str]:
        """Get enabled features for tenant"""
        config = await self.get_white_label_config(tenant_id)
        if not config or not config.enabled_features:
            return []
        
        return config.enabled_features
    
    async def get_disabled_features(self, tenant_id: str) -> List[str]:
        """Get disabled features for tenant"""
        config = await self.get_white_label_config(tenant_id)
        if not config or not config.disabled_features:
            return []
        
        return config.disabled_features
    
    async def is_feature_enabled(self, tenant_id: str, feature: str) -> bool:
        """Check if a feature is enabled for tenant"""
        enabled_features = await self.get_enabled_features(tenant_id)
        disabled_features = await self.get_disabled_features(tenant_id)
        
        # If feature is explicitly disabled, return False
        if feature in disabled_features:
            return False
        
        # If feature is explicitly enabled, return True
        if feature in enabled_features:
            return True
        
        # Default to enabled for most features
        return True
    
    async def create_default_theme(self, tenant_id: str) -> WhiteLabelTheme:
        """Create default theme for tenant"""
        default_config = {
            "colors": {
                "primary": "#E60012",
                "secondary": "#0066CC",
                "accent": "#FFD700",
                "background": "#FFFFFF",
                "text": "#000000"
            },
            "typography": {
                "font_family": "Inter",
                "heading_font": "Poppins",
                "font_size_base": 16,
                "font_size_heading": 24
            },
            "layout": {
                "style": "modern",
                "header_style": "sticky",
                "sidebar_style": "collapsible"
            }
        }
        
        return await self.create_theme(
            tenant_id=tenant_id,
            name="Default Theme",
            config=default_config,
            description="Default white-label theme"
        )
    
    async def export_theme(self, tenant_id: str, theme_id: str) -> Dict[str, Any]:
        """Export theme configuration"""
        theme = self.db.query(WhiteLabelTheme).filter(
            WhiteLabelTheme.id == theme_id,
            WhiteLabelTheme.tenant_id == tenant_id
        ).first()
        
        if not theme:
            return {}
        
        return {
            "name": theme.name,
            "description": theme.description,
            "config": theme.config,
            "created_at": theme.created_at.isoformat(),
            "updated_at": theme.updated_at.isoformat()
        }
    
    async def import_theme(
        self,
        tenant_id: str,
        theme_data: Dict[str, Any]
    ) -> WhiteLabelTheme:
        """Import theme configuration"""
        return await self.create_theme(
            tenant_id=tenant_id,
            name=theme_data.get("name", "Imported Theme"),
            config=theme_data.get("config", {}),
            description=theme_data.get("description", "Imported theme")
        )