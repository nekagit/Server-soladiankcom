"""
Edge Computing and CDN Optimization Service for Soladia Marketplace
Provides edge computing capabilities, CDN management, and performance optimization
"""

import asyncio
import logging
import hashlib
import json
import time
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import aiohttp
import redis
import boto3
from botocore.exceptions import ClientError
import cloudflare
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
import uvicorn
from pydantic import BaseModel
import yaml
import os

logger = logging.getLogger(__name__)

class EdgeLocation(Enum):
    US_EAST = "us-east-1"
    US_WEST = "us-west-2"
    EU_WEST = "eu-west-1"
    EU_CENTRAL = "eu-central-1"
    AP_SOUTHEAST = "ap-southeast-1"
    AP_NORTHEAST = "ap-northeast-1"

class CacheStrategy(Enum):
    CACHE_FIRST = "cache_first"
    NETWORK_FIRST = "network_first"
    CACHE_ONLY = "cache_only"
    NETWORK_ONLY = "network_only"

@dataclass
class EdgeNode:
    """Edge node configuration"""
    id: str
    location: EdgeLocation
    url: str
    capacity: int
    latency: float
    is_active: bool = True
    last_health_check: Optional[datetime] = None

@dataclass
class CacheRule:
    """Cache rule configuration"""
    pattern: str
    ttl: int
    strategy: CacheStrategy
    headers: Dict[str, str]
    compression: bool = True
    minify: bool = True

class CDNManager:
    """CDN Management Service"""
    
    def __init__(self, cloudflare_token: str, aws_access_key: str, aws_secret_key: str):
        self.cloudflare_token = cloudflare_token
        self.aws_access_key = aws_access_key
        self.aws_secret_key = aws_secret_key
        
        # Initialize Cloudflare client
        self.cf = cloudflare.CloudFlare(token=cloudflare_token)
        
        # Initialize AWS S3 client
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key
        )
        
        # Initialize AWS CloudFront client
        self.cloudfront = boto3.client(
            'cloudfront',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key
        )
    
    async def purge_cache(self, urls: List[str], zones: List[str] = None) -> Dict[str, Any]:
        """Purge CDN cache for specific URLs"""
        try:
            results = {}
            
            # Purge Cloudflare cache
            if zones:
                for zone_id in zones:
                    response = self.cf.zones.purge_cache.post(
                        zone_id=zone_id,
                        data={"files": urls}
                    )
                    results[f"cloudflare_{zone_id}"] = response
            
            # Purge CloudFront cache
            for url in urls:
                try:
                    response = self.cloudfront.create_invalidation(
                        DistributionId=os.getenv('CLOUDFRONT_DISTRIBUTION_ID'),
                        InvalidationBatch={
                            'Paths': {
                                'Quantity': 1,
                                'Items': [url]
                            },
                            'CallerReference': f"soladia-{int(time.time())}"
                        }
                    )
                    results[f"cloudfront_{url}"] = response
                except ClientError as e:
                    logger.error(f"Failed to purge CloudFront cache for {url}: {e}")
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to purge cache: {e}")
            return {"error": str(e)}
    
    async def upload_to_cdn(self, file_path: str, key: str, 
                          bucket: str = "soladia-cdn") -> Dict[str, Any]:
        """Upload file to CDN"""
        try:
            # Upload to S3
            with open(file_path, 'rb') as f:
                self.s3.upload_fileobj(
                    f, 
                    bucket, 
                    key,
                    ExtraArgs={
                        'ContentType': self._get_content_type(key),
                        'CacheControl': 'max-age=31536000',  # 1 year
                        'ACL': 'public-read'
                    }
                )
            
            # Get CDN URL
            cdn_url = f"https://{bucket}.s3.amazonaws.com/{key}"
            
            return {
                "success": True,
                "url": cdn_url,
                "bucket": bucket,
                "key": key
            }
            
        except Exception as e:
            logger.error(f"Failed to upload to CDN: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_content_type(self, key: str) -> str:
        """Get content type based on file extension"""
        ext = key.split('.')[-1].lower()
        content_types = {
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'woff': 'font/woff',
            'woff2': 'font/woff2',
            'ttf': 'font/ttf',
            'eot': 'application/vnd.ms-fontobject'
        }
        return content_types.get(ext, 'application/octet-stream')
    
    async def get_cache_analytics(self, zone_id: str) -> Dict[str, Any]:
        """Get CDN cache analytics"""
        try:
            # Get Cloudflare analytics
            analytics = self.cf.zones.analytics.dashboard.get(zone_id=zone_id)
            
            return {
                "cloudflare": analytics,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get cache analytics: {e}")
            return {"error": str(e)}

class EdgeComputingService:
    """Edge Computing Service"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.edge_nodes: List[EdgeNode] = []
        self.cache_rules: List[CacheRule] = []
        self.load_balancer = EdgeLoadBalancer()
        
        # Initialize edge nodes
        self._initialize_edge_nodes()
        
        # Load cache rules
        self._load_cache_rules()
    
    def _initialize_edge_nodes(self):
        """Initialize edge nodes"""
        self.edge_nodes = [
            EdgeNode(
                id="us-east-1",
                location=EdgeLocation.US_EAST,
                url="https://us-east-1.soladia.com",
                capacity=1000,
                latency=50.0
            ),
            EdgeNode(
                id="us-west-2",
                location=EdgeLocation.US_WEST,
                url="https://us-west-2.soladia.com",
                capacity=1000,
                latency=60.0
            ),
            EdgeNode(
                id="eu-west-1",
                location=EdgeLocation.EU_WEST,
                url="https://eu-west-1.soladia.com",
                capacity=800,
                latency=40.0
            ),
            EdgeNode(
                id="ap-southeast-1",
                location=EdgeLocation.AP_SOUTHEAST,
                url="https://ap-southeast-1.soladia.com",
                capacity=600,
                latency=30.0
            )
        ]
    
    def _load_cache_rules(self):
        """Load cache rules from configuration"""
        self.cache_rules = [
            CacheRule(
                pattern="*.css",
                ttl=31536000,  # 1 year
                strategy=CacheStrategy.CACHE_FIRST,
                headers={"Cache-Control": "public, max-age=31536000"},
                compression=True,
                minify=True
            ),
            CacheRule(
                pattern="*.js",
                ttl=31536000,  # 1 year
                strategy=CacheStrategy.CACHE_FIRST,
                headers={"Cache-Control": "public, max-age=31536000"},
                compression=True,
                minify=True
            ),
            CacheRule(
                pattern="*.png",
                ttl=31536000,  # 1 year
                strategy=CacheStrategy.CACHE_FIRST,
                headers={"Cache-Control": "public, max-age=31536000"},
                compression=False,
                minify=False
            ),
            CacheRule(
                pattern="*.jpg",
                ttl=31536000,  # 1 year
                strategy=CacheStrategy.CACHE_FIRST,
                headers={"Cache-Control": "public, max-age=31536000"},
                compression=False,
                minify=False
            ),
            CacheRule(
                pattern="/api/*",
                ttl=300,  # 5 minutes
                strategy=CacheStrategy.NETWORK_FIRST,
                headers={"Cache-Control": "public, max-age=300"},
                compression=True,
                minify=False
            ),
            CacheRule(
                pattern="/static/*",
                ttl=86400,  # 1 day
                strategy=CacheStrategy.CACHE_FIRST,
                headers={"Cache-Control": "public, max-age=86400"},
                compression=True,
                minify=True
            )
        ]
    
    async def get_best_edge_node(self, client_ip: str) -> EdgeNode:
        """Get the best edge node for a client"""
        try:
            # Get client location (simplified)
            client_location = await self._get_client_location(client_ip)
            
            # Find best edge node based on latency and capacity
            best_node = None
            best_score = float('inf')
            
            for node in self.edge_nodes:
                if not node.is_active:
                    continue
                
                # Calculate score based on latency and distance
                latency_score = node.latency
                distance_score = self._calculate_distance(client_location, node.location)
                capacity_score = 1.0 / (node.capacity + 1)  # Lower capacity = higher score
                
                total_score = latency_score + distance_score + capacity_score
                
                if total_score < best_score:
                    best_score = total_score
                    best_node = node
            
            return best_node or self.edge_nodes[0]
            
        except Exception as e:
            logger.error(f"Failed to get best edge node: {e}")
            return self.edge_nodes[0]
    
    async def _get_client_location(self, client_ip: str) -> Tuple[float, float]:
        """Get client location from IP (simplified)"""
        try:
            # In production, use a geolocation service
            # For now, return mock coordinates
            return (40.7128, -74.0060)  # New York coordinates
        except Exception as e:
            logger.error(f"Failed to get client location: {e}")
            return (40.7128, -74.0060)
    
    def _calculate_distance(self, client_location: Tuple[float, float], 
                          edge_location: EdgeLocation) -> float:
        """Calculate distance between client and edge location"""
        # Simplified distance calculation
        # In production, use proper geolocation distance calculation
        location_coords = {
            EdgeLocation.US_EAST: (39.8283, -98.5795),
            EdgeLocation.US_WEST: (37.7749, -122.4194),
            EdgeLocation.EU_WEST: (51.5074, -0.1278),
            EdgeLocation.EU_CENTRAL: (52.5200, 13.4050),
            EdgeLocation.AP_SOUTHEAST: (1.3521, 103.8198),
            EdgeLocation.AP_NORTHEAST: (35.6762, 139.6503)
        }
        
        edge_coords = location_coords.get(edge_location, (0, 0))
        
        # Simple distance calculation (not accurate for real distances)
        lat_diff = abs(client_location[0] - edge_coords[0])
        lon_diff = abs(client_location[1] - edge_coords[1])
        
        return (lat_diff + lon_diff) * 100  # Multiply by 100 for scoring
    
    async def process_request(self, request: Request, response: Response) -> Response:
        """Process request through edge computing"""
        try:
            # Get best edge node
            client_ip = request.client.host
            edge_node = await self.get_best_edge_node(client_ip)
            
            # Check cache rules
            cache_rule = self._get_cache_rule(request.url.path)
            
            if cache_rule:
                # Check if content is cached
                cache_key = self._generate_cache_key(request)
                cached_content = await self.redis.get(cache_key)
                
                if cached_content and cache_rule.strategy in [CacheStrategy.CACHE_FIRST, CacheStrategy.CACHE_ONLY]:
                    # Return cached content
                    return self._create_cached_response(cached_content, cache_rule)
                
                if cache_rule.strategy == CacheStrategy.CACHE_ONLY:
                    # Return 404 if not cached
                    return Response(status_code=404, content="Content not found")
            
            # Process request through edge node
            processed_response = await self._process_through_edge_node(
                request, edge_node, cache_rule
            )
            
            # Cache response if applicable
            if cache_rule and processed_response.status_code == 200:
                await self._cache_response(cache_key, processed_response, cache_rule)
            
            return processed_response
            
        except Exception as e:
            logger.error(f"Failed to process request: {e}")
            return Response(status_code=500, content="Internal server error")
    
    def _get_cache_rule(self, path: str) -> Optional[CacheRule]:
        """Get cache rule for path"""
        for rule in self.cache_rules:
            if self._matches_pattern(path, rule.pattern):
                return rule
        return None
    
    def _matches_pattern(self, path: str, pattern: str) -> bool:
        """Check if path matches pattern"""
        import fnmatch
        return fnmatch.fnmatch(path, pattern)
    
    def _generate_cache_key(self, request: Request) -> str:
        """Generate cache key for request"""
        key_data = {
            "path": request.url.path,
            "query": str(request.query_params),
            "headers": dict(request.headers)
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    async def _process_through_edge_node(self, request: Request, 
                                       edge_node: EdgeNode, 
                                       cache_rule: Optional[CacheRule]) -> Response:
        """Process request through edge node"""
        try:
            # Forward request to edge node
            edge_url = f"{edge_node.url}{request.url.path}"
            
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=request.method,
                    url=edge_url,
                    headers=dict(request.headers),
                    params=request.query_params,
                    data=await request.body()
                ) as response:
                    content = await response.read()
                    
                    # Apply transformations if needed
                    if cache_rule and cache_rule.minify:
                        content = await self._minify_content(content, request.url.path)
                    
                    if cache_rule and cache_rule.compression:
                        content = await self._compress_content(content)
                    
                    return Response(
                        content=content,
                        status_code=response.status,
                        headers=dict(response.headers)
                    )
                    
        except Exception as e:
            logger.error(f"Failed to process through edge node: {e}")
            return Response(status_code=502, content="Bad Gateway")
    
    async def _minify_content(self, content: bytes, path: str) -> bytes:
        """Minify content based on type"""
        try:
            if path.endswith('.css'):
                # Minify CSS
                import cssmin
                return cssmin.cssmin(content.decode()).encode()
            elif path.endswith('.js'):
                # Minify JavaScript
                import jsmin
                return jsmin.jsmin(content.decode()).encode()
            elif path.endswith('.html'):
                # Minify HTML
                import htmlmin
                return htmlmin.minify(content.decode()).encode()
            else:
                return content
        except Exception as e:
            logger.error(f"Failed to minify content: {e}")
            return content
    
    async def _compress_content(self, content: bytes) -> bytes:
        """Compress content using gzip"""
        try:
            import gzip
            return gzip.compress(content)
        except Exception as e:
            logger.error(f"Failed to compress content: {e}")
            return content
    
    def _create_cached_response(self, cached_content: bytes, 
                              cache_rule: CacheRule) -> Response:
        """Create response from cached content"""
        headers = cache_rule.headers.copy()
        headers["X-Cache"] = "HIT"
        headers["X-Cache-TTL"] = str(cache_rule.ttl)
        
        return Response(
            content=cached_content,
            status_code=200,
            headers=headers
        )
    
    async def _cache_response(self, cache_key: str, response: Response, 
                            cache_rule: CacheRule):
        """Cache response"""
        try:
            cache_data = {
                "content": response.body.decode() if isinstance(response.body, bytes) else response.body,
                "headers": dict(response.headers),
                "status_code": response.status_code,
                "timestamp": time.time()
            }
            
            await self.redis.setex(
                cache_key, 
                cache_rule.ttl, 
                json.dumps(cache_data)
            )
            
        except Exception as e:
            logger.error(f"Failed to cache response: {e}")
    
    async def health_check_edge_nodes(self):
        """Perform health check on all edge nodes"""
        try:
            for node in self.edge_nodes:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(f"{node.url}/health", timeout=5) as response:
                            if response.status == 200:
                                node.is_active = True
                                node.last_health_check = datetime.now()
                            else:
                                node.is_active = False
                except Exception as e:
                    logger.error(f"Health check failed for {node.id}: {e}")
                    node.is_active = False
            
        except Exception as e:
            logger.error(f"Failed to perform health checks: {e}")
    
    async def get_edge_analytics(self) -> Dict[str, Any]:
        """Get edge computing analytics"""
        try:
            analytics = {
                "total_nodes": len(self.edge_nodes),
                "active_nodes": sum(1 for node in self.edge_nodes if node.is_active),
                "inactive_nodes": sum(1 for node in self.edge_nodes if not node.is_active),
                "nodes": [
                    {
                        "id": node.id,
                        "location": node.location.value,
                        "url": node.url,
                        "capacity": node.capacity,
                        "latency": node.latency,
                        "is_active": node.is_active,
                        "last_health_check": node.last_health_check.isoformat() if node.last_health_check else None
                    }
                    for node in self.edge_nodes
                ],
                "cache_rules": [
                    {
                        "pattern": rule.pattern,
                        "ttl": rule.ttl,
                        "strategy": rule.strategy.value,
                        "compression": rule.compression,
                        "minify": rule.minify
                    }
                    for rule in self.cache_rules
                ],
                "timestamp": datetime.now().isoformat()
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get edge analytics: {e}")
            return {"error": str(e)}

class EdgeLoadBalancer:
    """Edge Load Balancer"""
    
    def __init__(self):
        self.algorithm = "round_robin"
        self.current_index = 0
    
    def select_node(self, nodes: List[EdgeNode]) -> EdgeNode:
        """Select edge node using load balancing algorithm"""
        if not nodes:
            return None
        
        active_nodes = [node for node in nodes if node.is_active]
        if not active_nodes:
            return nodes[0]  # Fallback to any node
        
        if self.algorithm == "round_robin":
            return self._round_robin(active_nodes)
        elif self.algorithm == "least_connections":
            return self._least_connections(active_nodes)
        elif self.algorithm == "weighted_round_robin":
            return self._weighted_round_robin(active_nodes)
        else:
            return active_nodes[0]
    
    def _round_robin(self, nodes: List[EdgeNode]) -> EdgeNode:
        """Round robin selection"""
        node = nodes[self.current_index % len(nodes)]
        self.current_index += 1
        return node
    
    def _least_connections(self, nodes: List[EdgeNode]) -> EdgeNode:
        """Least connections selection"""
        return min(nodes, key=lambda node: node.capacity)
    
    def _weighted_round_robin(self, nodes: List[EdgeNode]) -> EdgeNode:
        """Weighted round robin selection"""
        # Simplified implementation
        return self._round_robin(nodes)

class EdgeComputingAPI:
    """Edge Computing API"""
    
    def __init__(self, redis_client: redis.Redis):
        self.app = FastAPI(title="Soladia Edge Computing API")
        self.edge_service = EdgeComputingService(redis_client)
        self.cdn_manager = CDNManager(
            cloudflare_token=os.getenv('CLOUDFLARE_TOKEN', ''),
            aws_access_key=os.getenv('AWS_ACCESS_KEY_ID', ''),
            aws_secret_key=os.getenv('AWS_SECRET_ACCESS_KEY', '')
        )
        
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.now().isoformat()}
        
        @self.app.get("/analytics")
        async def get_analytics():
            return await self.edge_service.get_edge_analytics()
        
        @self.app.post("/purge-cache")
        async def purge_cache(request: Request):
            data = await request.json()
            urls = data.get("urls", [])
            zones = data.get("zones", [])
            
            result = await self.cdn_manager.purge_cache(urls, zones)
            return result
        
        @self.app.post("/upload")
        async def upload_file(request: Request):
            data = await request.json()
            file_path = data.get("file_path")
            key = data.get("key")
            bucket = data.get("bucket", "soladia-cdn")
            
            result = await self.cdn_manager.upload_to_cdn(file_path, key, bucket)
            return result
        
        @self.app.get("/cache-analytics")
        async def get_cache_analytics(zone_id: str):
            result = await self.cdn_manager.get_cache_analytics(zone_id)
            return result
        
        @self.app.post("/health-check")
        async def perform_health_check():
            await self.edge_service.health_check_edge_nodes()
            return {"status": "health check completed"}
    
    def get_app(self) -> FastAPI:
        """Get FastAPI app"""
        return self.app

def create_edge_computing_api(redis_client: redis.Redis) -> FastAPI:
    """Create Edge Computing API"""
    api = EdgeComputingAPI(redis_client)
    return api.get_app()

if __name__ == "__main__":
    redis_client = redis.Redis(host='localhost', port=6379, db=0)
    app = create_edge_computing_api(redis_client)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
