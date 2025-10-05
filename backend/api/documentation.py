"""
Comprehensive API Documentation for Soladia
OpenAPI/Swagger documentation with interactive features
"""

import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
import json
import yaml
from pathlib import Path

logger = logging.getLogger(__name__)

class APIVersion(Enum):
    V1 = "v1"
    V2 = "v2"
    BETA = "beta"

class DocumentationConfig:
    """API documentation configuration"""
    
    def __init__(
        self,
        title: str = "Soladia Marketplace API",
        description: str = "Comprehensive API for Soladia blockchain marketplace",
        version: str = "1.0.0",
        contact_name: str = "Soladia Team",
        contact_email: str = "api@soladia.com",
        contact_url: str = "https://soladia.com/contact",
        license_name: str = "MIT",
        license_url: str = "https://opensource.org/licenses/MIT",
        terms_of_service: str = "https://soladia.com/terms",
        servers: List[Dict[str, str]] = None
    ):
        self.title = title
        self.description = description
        self.version = version
        self.contact_name = contact_name
        self.contact_email = contact_email
        self.contact_url = contact_url
        self.license_name = license_name
        self.license_url = license_url
        self.terms_of_service = terms_of_service
        self.servers = servers or [
            {"url": "http://localhost:8000", "description": "Development server"},
            {"url": "https://api.soladia.com", "description": "Production server"}
        ]

class APIDocumentation:
    """Comprehensive API documentation system"""
    
    def __init__(self, app: FastAPI, config: DocumentationConfig):
        self.app = app
        self.config = config
        self.documentation_data = {}
        self.examples = {}
        self.schemas = {}
        
        # Initialize documentation
        self._setup_documentation()
        self._create_examples()
        self._create_schemas()
    
    def _setup_documentation(self):
        """Setup API documentation"""
        try:
            # Add documentation routes
            self._add_documentation_routes()
            
            # Customize OpenAPI schema
            self._customize_openapi_schema()
            
            logger.info("API documentation setup completed")
            
        except Exception as e:
            logger.error(f"Failed to setup documentation: {e}")
    
    def _add_documentation_routes(self):
        """Add documentation routes"""
        try:
            # Swagger UI
            @self.app.get("/docs", include_in_schema=False)
            async def swagger_ui():
                return get_swagger_ui_html(
                    openapi_url="/openapi.json",
                    title=f"{self.config.title} - Swagger UI",
                    swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
                    swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
                    swagger_ui_parameters={
                        "deepLinking": True,
                        "displayOperationId": True,
                        "filter": True,
                        "showExtensions": True,
                        "showCommonExtensions": True,
                        "tryItOutEnabled": True
                    }
                )
            
            # ReDoc
            @self.app.get("/redoc", include_in_schema=False)
            async def redoc():
                return get_redoc_html(
                    openapi_url="/openapi.json",
                    title=f"{self.config.title} - ReDoc"
                )
            
            # OpenAPI JSON
            @self.app.get("/openapi.json", include_in_schema=False)
            async def openapi():
                return self._get_custom_openapi()
            
            # API documentation
            @self.app.get("/api-docs", include_in_schema=False)
            async def api_docs():
                return HTMLResponse(self._generate_documentation_html())
            
            # Interactive examples
            @self.app.get("/api-examples", include_in_schema=False)
            async def api_examples():
                return JSONResponse(self.examples)
            
            # Schema documentation
            @self.app.get("/api-schemas", include_in_schema=False)
            async def api_schemas():
                return JSONResponse(self.schemas)
            
            logger.info("Documentation routes added")
            
        except Exception as e:
            logger.error(f"Failed to add documentation routes: {e}")
    
    def _customize_openapi_schema(self):
        """Customize OpenAPI schema"""
        try:
            def custom_openapi():
                if self.app.openapi_schema:
                    return self.app.openapi_schema
                
                openapi_schema = get_openapi(
                    title=self.config.title,
                    version=self.config.version,
                    description=self.config.description,
                    routes=self.app.routes,
                )
                
                # Add custom information
                openapi_schema["info"]["contact"] = {
                    "name": self.config.contact_name,
                    "email": self.config.contact_email,
                    "url": self.config.contact_url
                }
                
                openapi_schema["info"]["license"] = {
                    "name": self.config.license_name,
                    "url": self.config.license_url
                }
                
                openapi_schema["info"]["termsOfService"] = self.config.terms_of_service
                openapi_schema["servers"] = self.config.servers
                
                # Add custom tags
                openapi_schema["tags"] = self._get_api_tags()
                
                # Add custom examples
                openapi_schema["components"]["examples"] = self._get_openapi_examples()
                
                # Add custom schemas
                openapi_schema["components"]["schemas"].update(self._get_openapi_schemas())
                
                self.app.openapi_schema = openapi_schema
                return self.app.openapi_schema
            
            self.app.openapi = custom_openapi
            
        except Exception as e:
            logger.error(f"Failed to customize OpenAPI schema: {e}")
    
    def _get_custom_openapi(self):
        """Get customized OpenAPI schema"""
        return self.app.openapi()
    
    def _get_api_tags(self) -> List[Dict[str, str]]:
        """Get API tags for documentation"""
        return [
            {
                "name": "Authentication",
                "description": "User authentication and session management",
                "externalDocs": {
                    "description": "Authentication Guide",
                    "url": "https://docs.soladia.com/auth"
                }
            },
            {
                "name": "Users",
                "description": "User management and profiles",
                "externalDocs": {
                    "description": "User Guide",
                    "url": "https://docs.soladia.com/users"
                }
            },
            {
                "name": "Products",
                "description": "Product catalog and management",
                "externalDocs": {
                    "description": "Product Guide",
                    "url": "https://docs.soladia.com/products"
                }
            },
            {
                "name": "Orders",
                "description": "Order processing and management",
                "externalDocs": {
                    "description": "Order Guide",
                    "url": "https://docs.soladia.com/orders"
                }
            },
            {
                "name": "Solana",
                "description": "Solana blockchain integration",
                "externalDocs": {
                    "description": "Solana Guide",
                    "url": "https://docs.soladia.com/solana"
                }
            },
            {
                "name": "NFTs",
                "description": "NFT marketplace and management",
                "externalDocs": {
                    "description": "NFT Guide",
                    "url": "https://docs.soladia.com/nfts"
                }
            },
            {
                "name": "Analytics",
                "description": "Analytics and reporting",
                "externalDocs": {
                    "description": "Analytics Guide",
                    "url": "https://docs.soladia.com/analytics"
                }
            },
            {
                "name": "Webhooks",
                "description": "Webhook management and events",
                "externalDocs": {
                    "description": "Webhook Guide",
                    "url": "https://docs.soladia.com/webhooks"
                }
            }
        ]
    
    def _get_openapi_examples(self) -> Dict[str, Any]:
        """Get OpenAPI examples"""
        return {
            "user_example": {
                "summary": "User Example",
                "description": "Example user object",
                "value": {
                    "id": "user_123",
                    "username": "john_doe",
                    "email": "john@example.com",
                    "created_at": "2024-01-01T00:00:00Z",
                    "profile": {
                        "first_name": "John",
                        "last_name": "Doe",
                        "avatar": "https://example.com/avatar.jpg"
                    }
                }
            },
            "product_example": {
                "summary": "Product Example",
                "description": "Example product object",
                "value": {
                    "id": "product_123",
                    "name": "Solana NFT Collection",
                    "description": "Unique digital art collection",
                    "price": 2.5,
                    "currency": "SOL",
                    "category": "NFT",
                    "is_nft": True,
                    "is_solana": True,
                    "images": [
                        "https://example.com/image1.jpg",
                        "https://example.com/image2.jpg"
                    ]
                }
            },
            "order_example": {
                "summary": "Order Example",
                "description": "Example order object",
                "value": {
                    "id": "order_123",
                    "user_id": "user_123",
                    "status": "completed",
                    "total_amount": 2.5,
                    "currency": "SOL",
                    "items": [
                        {
                            "product_id": "product_123",
                            "quantity": 1,
                            "price": 2.5
                        }
                    ],
                    "created_at": "2024-01-01T00:00:00Z"
                }
            }
        }
    
    def _get_openapi_schemas(self) -> Dict[str, Any]:
        """Get OpenAPI schemas"""
        return {
            "ErrorResponse": {
                "type": "object",
                "properties": {
                    "error": {"type": "string"},
                    "message": {"type": "string"},
                    "details": {"type": "object"},
                    "timestamp": {"type": "string", "format": "date-time"}
                },
                "required": ["error", "timestamp"]
            },
            "SuccessResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "message": {"type": "string"},
                    "data": {"type": "object"},
                    "timestamp": {"type": "string", "format": "date-time"}
                },
                "required": ["success", "timestamp"]
            },
            "PaginationResponse": {
                "type": "object",
                "properties": {
                    "items": {"type": "array"},
                    "total": {"type": "integer"},
                    "page": {"type": "integer"},
                    "per_page": {"type": "integer"},
                    "pages": {"type": "integer"}
                },
                "required": ["items", "total", "page", "per_page"]
            }
        }
    
    def _create_examples(self):
        """Create API examples"""
        self.examples = {
            "authentication": {
                "login": {
                    "request": {
                        "email": "user@example.com",
                        "password": "secure_password"
                    },
                    "response": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 3600,
                        "user": {
                            "id": "user_123",
                            "email": "user@example.com",
                            "username": "john_doe"
                        }
                    }
                },
                "register": {
                    "request": {
                        "email": "newuser@example.com",
                        "password": "secure_password",
                        "username": "new_user"
                    },
                    "response": {
                        "message": "User created successfully",
                        "user": {
                            "id": "user_456",
                            "email": "newuser@example.com",
                            "username": "new_user"
                        }
                    }
                }
            },
            "products": {
                "create_product": {
                    "request": {
                        "name": "Solana NFT Collection",
                        "description": "Unique digital art collection",
                        "price": 2.5,
                        "category": "NFT",
                        "is_nft": True,
                        "is_solana": True
                    },
                    "response": {
                        "id": "product_123",
                        "name": "Solana NFT Collection",
                        "description": "Unique digital art collection",
                        "price": 2.5,
                        "category": "NFT",
                        "is_nft": True,
                        "is_solana": True,
                        "created_at": "2024-01-01T00:00:00Z"
                    }
                },
                "search_products": {
                    "request": {
                        "query": "NFT",
                        "category": "NFT",
                        "min_price": 1.0,
                        "max_price": 10.0,
                        "page": 1,
                        "per_page": 20
                    },
                    "response": {
                        "items": [
                            {
                                "id": "product_123",
                                "name": "Solana NFT Collection",
                                "price": 2.5,
                                "category": "NFT"
                            }
                        ],
                        "total": 1,
                        "page": 1,
                        "per_page": 20,
                        "pages": 1
                    }
                }
            },
            "solana": {
                "connect_wallet": {
                    "request": {
                        "wallet_type": "phantom",
                        "public_key": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                    },
                    "response": {
                        "wallet_id": "wallet_123",
                        "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                        "wallet_type": "phantom",
                        "connected": True
                    }
                },
                "get_balance": {
                    "request": {
                        "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                    },
                    "response": {
                        "balance": 5.25,
                        "currency": "SOL",
                        "tokens": [
                            {
                                "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                                "amount": 100.0,
                                "symbol": "USDC"
                            }
                        ]
                    }
                }
            }
        }
    
    def _create_schemas(self):
        """Create API schemas"""
        self.schemas = {
            "User": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "username": {"type": "string"},
                    "email": {"type": "string", "format": "email"},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"},
                    "profile": {"$ref": "#/components/schemas/UserProfile"}
                },
                "required": ["id", "username", "email", "created_at"]
            },
            "UserProfile": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "avatar": {"type": "string", "format": "uri"},
                    "bio": {"type": "string"},
                    "location": {"type": "string"}
                }
            },
            "Product": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "price": {"type": "number"},
                    "currency": {"type": "string"},
                    "category": {"type": "string"},
                    "is_nft": {"type": "boolean"},
                    "is_solana": {"type": "boolean"},
                    "images": {"type": "array", "items": {"type": "string"}},
                    "created_at": {"type": "string", "format": "date-time"}
                },
                "required": ["id", "name", "price", "currency", "category"]
            },
            "Order": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "user_id": {"type": "string"},
                    "status": {"type": "string", "enum": ["pending", "processing", "completed", "cancelled"]},
                    "total_amount": {"type": "number"},
                    "currency": {"type": "string"},
                    "items": {"type": "array", "items": {"$ref": "#/components/schemas/OrderItem"}},
                    "created_at": {"type": "string", "format": "date-time"}
                },
                "required": ["id", "user_id", "status", "total_amount", "currency"]
            },
            "OrderItem": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "quantity": {"type": "integer"},
                    "price": {"type": "number"}
                },
                "required": ["product_id", "quantity", "price"]
            }
        }
    
    def _generate_documentation_html(self) -> str:
        """Generate comprehensive documentation HTML"""
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{self.config.title} - Documentation</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 40px;
                    padding: 40px 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 10px;
                }}
                .section {{
                    margin-bottom: 40px;
                    padding: 20px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                }}
                .endpoint {{
                    background: #f8f9fa;
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 5px;
                    border-left: 4px solid #007bff;
                }}
                .method {{
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: bold;
                    margin-right: 10px;
                }}
                .get {{ background: #28a745; color: white; }}
                .post {{ background: #007bff; color: white; }}
                .put {{ background: #ffc107; color: black; }}
                .delete {{ background: #dc3545; color: white; }}
                .patch {{ background: #6f42c1; color: white; }}
                .code {{
                    background: #f1f3f4;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                }}
                .example {{
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 5px;
                    padding: 15px;
                    margin: 10px 0;
                }}
                .nav {{
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    padding: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .nav a {{
                    display: block;
                    padding: 5px 10px;
                    text-decoration: none;
                    color: #007bff;
                }}
                .nav a:hover {{
                    background: #f8f9fa;
                }}
            </style>
        </head>
        <body>
            <div class="nav">
                <a href="/docs">Swagger UI</a>
                <a href="/redoc">ReDoc</a>
                <a href="/openapi.json">OpenAPI JSON</a>
                <a href="/api-examples">Examples</a>
                <a href="/api-schemas">Schemas</a>
            </div>
            
            <div class="header">
                <h1>{self.config.title}</h1>
                <p>{self.config.description}</p>
                <p>Version: {self.config.version}</p>
            </div>
            
            <div class="section">
                <h2>Getting Started</h2>
                <p>Welcome to the Soladia Marketplace API! This comprehensive API provides access to all marketplace functionality including user management, product catalog, order processing, and Solana blockchain integration.</p>
                
                <h3>Base URL</h3>
                <p><span class="code">https://api.soladia.com</span></p>
                
                <h3>Authentication</h3>
                <p>Most endpoints require authentication. Include your API key in the Authorization header:</p>
                <div class="example">
                    <code>Authorization: Bearer your_api_key_here</code>
                </div>
            </div>
            
            <div class="section">
                <h2>API Endpoints</h2>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/api/v1/products</strong>
                    <p>Get a list of products with optional filtering and pagination.</p>
                    <p><strong>Parameters:</strong> query, category, min_price, max_price, page, per_page</p>
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/v1/products</strong>
                    <p>Create a new product listing.</p>
                    <p><strong>Body:</strong> Product object with name, description, price, category</p>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/api/v1/products/{id}</strong>
                    <p>Get detailed information about a specific product.</p>
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/v1/auth/login</strong>
                    <p>Authenticate a user and return access token.</p>
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/v1/auth/register</strong>
                    <p>Register a new user account.</p>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/api/v1/solana/wallet/balance</strong>
                    <p>Get Solana wallet balance and token information.</p>
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/v1/solana/transaction</strong>
                    <p>Create and send a Solana transaction.</p>
                </div>
            </div>
            
            <div class="section">
                <h2>Response Format</h2>
                <p>All API responses follow a consistent format:</p>
                
                <h3>Success Response</h3>
                <div class="example">
                    <pre>{{
  "success": true,
  "data": {{
    "id": "product_123",
    "name": "Solana NFT Collection",
    "price": 2.5
  }},
  "timestamp": "2024-01-01T00:00:00Z"
}}</pre>
                </div>
                
                <h3>Error Response</h3>
                <div class="example">
                    <pre>{{
  "error": "validation_error",
  "message": "Invalid input data",
  "details": {{
    "field": "email",
    "message": "Invalid email format"
  }},
  "timestamp": "2024-01-01T00:00:00Z"
}}</pre>
                </div>
            </div>
            
            <div class="section">
                <h2>Rate Limiting</h2>
                <p>API requests are rate limited to ensure fair usage:</p>
                <ul>
                    <li><strong>General endpoints:</strong> 100 requests per minute</li>
                    <li><strong>Authentication:</strong> 5 requests per minute</li>
                    <li><strong>Payment endpoints:</strong> 10 requests per minute</li>
                </ul>
                <p>Rate limit headers are included in all responses:</p>
                <div class="example">
                    <code>X-Rate-Limit-Remaining: 95</code><br>
                    <code>X-Rate-Limit-Reset: 1640995200</code>
                </div>
            </div>
            
            <div class="section">
                <h2>Error Codes</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 10px; border: 1px solid #ddd;">Code</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Description</th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">400</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">Bad Request - Invalid input data</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">401</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">Unauthorized - Invalid or missing authentication</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">403</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">Forbidden - Insufficient permissions</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">404</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">Not Found - Resource not found</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">429</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">Too Many Requests - Rate limit exceeded</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">500</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">Internal Server Error - Server error</td>
                    </tr>
                </table>
            </div>
            
            <div class="section">
                <h2>SDKs and Libraries</h2>
                <p>Official SDKs are available for popular programming languages:</p>
                <ul>
                    <li><strong>JavaScript/TypeScript:</strong> <code>npm install @soladia/api-client</code></li>
                    <li><strong>Python:</strong> <code>pip install soladia-api</code></li>
                    <li><strong>Go:</strong> <code>go get github.com/soladia/api-go</code></li>
                </ul>
            </div>
            
            <div class="section">
                <h2>Support</h2>
                <p>Need help? We're here to assist:</p>
                <ul>
                    <li><strong>Documentation:</strong> <a href="https://docs.soladia.com">https://docs.soladia.com</a></li>
                    <li><strong>Email:</strong> <a href="mailto:{self.config.contact_email}">{self.config.contact_email}</a></li>
                    <li><strong>GitHub:</strong> <a href="https://github.com/soladia/api">https://github.com/soladia/api</a></li>
                </ul>
            </div>
        </body>
        </html>
        """
    
    def add_endpoint_documentation(
        self,
        endpoint: str,
        method: str,
        description: str,
        parameters: List[Dict[str, Any]] = None,
        request_body: Dict[str, Any] = None,
        response_examples: Dict[str, Any] = None
    ):
        """Add custom endpoint documentation"""
        try:
            if endpoint not in self.documentation_data:
                self.documentation_data[endpoint] = {}
            
            self.documentation_data[endpoint][method.lower()] = {
                "description": description,
                "parameters": parameters or [],
                "request_body": request_body,
                "response_examples": response_examples or {}
            }
            
            logger.info(f"Added documentation for {method} {endpoint}")
            
        except Exception as e:
            logger.error(f"Failed to add endpoint documentation: {e}")
    
    def export_documentation(self, format: str = "json") -> Union[str, Dict[str, Any]]:
        """Export documentation in various formats"""
        try:
            if format == "json":
                return json.dumps({
                    "config": self.config.__dict__,
                    "examples": self.examples,
                    "schemas": self.schemas,
                    "documentation": self.documentation_data
                }, indent=2)
            elif format == "yaml":
                return yaml.dump({
                    "config": self.config.__dict__,
                    "examples": self.examples,
                    "schemas": self.schemas,
                    "documentation": self.documentation_data
                }, default_flow_style=False)
            else:
                raise ValueError(f"Unsupported format: {format}")
                
        except Exception as e:
            logger.error(f"Failed to export documentation: {e}")
            return ""

# Global documentation instance
_documentation: Optional[APIDocumentation] = None

def get_documentation() -> Optional[APIDocumentation]:
    """Get the global documentation instance"""
    return _documentation

def setup_documentation(
    app: FastAPI,
    config: Optional[DocumentationConfig] = None
) -> APIDocumentation:
    """Setup API documentation for the application"""
    global _documentation
    
    if config is None:
        config = DocumentationConfig()
    
    _documentation = APIDocumentation(app, config)
    return _documentation
