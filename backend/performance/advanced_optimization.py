"""
Advanced Performance Optimization Service
Implements sophisticated caching, CDN, and performance monitoring
"""

import asyncio
import time
import json
import hashlib
from typing import Dict, Any, Optional, List, Tuple, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging
import redis
import aioredis
from functools import wraps
import gzip
import brotli
import base64

logger = logging.getLogger(__name__)

class CacheStrategy(Enum):
    """Cache strategies"""
    CACHE_FIRST = "cache_first"
    NETWORK_FIRST = "network_first"
    STALE_WHILE_REVALIDATE = "stale_while_revalidate"
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"

class CompressionType(Enum):
    """Compression types"""
    GZIP = "gzip"
    BROTLI = "brotli"
    DEFLATE = "deflate"
    NONE = "none"

@dataclass
class PerformanceMetric:
    """Performance metric record"""
    metric_name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Dict[str, str]
    metadata: Dict[str, Any]

@dataclass
class CacheEntry:
    """Cache entry"""
    key: str
    value: Any
    ttl: int
    created_at: datetime
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    compression_type: CompressionType = CompressionType.NONE

class AdvancedPerformanceService:
    """Advanced performance optimization service"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client: Optional[aioredis.Redis] = None
        self.local_cache: Dict[str, CacheEntry] = {}
        self.performance_metrics: List[PerformanceMetric] = []
        self.cdn_endpoints: Dict[str, str] = {}
        self.cache_strategies: Dict[str, CacheStrategy] = {}
        
        # Performance thresholds
        self.thresholds = {
            'response_time_ms': 200,
            'cache_hit_ratio': 0.8,
            'memory_usage_mb': 512,
            'cpu_usage_percent': 80,
            'database_query_time_ms': 100
        }
        
    async def initialize(self):
        """Initialize the performance service"""
        try:
            self.redis_client = await aioredis.from_url(self.redis_url)
            await self._setup_cache_strategies()
            await self._setup_cdn_endpoints()
            logger.info("Advanced performance service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize performance service: {str(e)}")
            
    async def close(self):
        """Close the performance service"""
        if self.redis_client:
            await self.redis_client.close()
            
    async def cache_with_strategy(self, 
                                key: str,
                                value: Any,
                                strategy: CacheStrategy = CacheStrategy.CACHE_FIRST,
                                ttl: int = 3600,
                                compression: CompressionType = CompressionType.GZIP) -> bool:
        """Cache data with specified strategy"""
        try:
            # Compress value if needed
            compressed_value = await self._compress_data(value, compression)
            
            # Create cache entry
            cache_entry = CacheEntry(
                key=key,
                value=compressed_value,
                ttl=ttl,
                created_at=datetime.utcnow(),
                compression_type=compression
            )
            
            # Store in local cache
            self.local_cache[key] = cache_entry
            
            # Store in Redis if available
            if self.redis_client:
                redis_data = {
                    'value': compressed_value,
                    'ttl': ttl,
                    'created_at': cache_entry.created_at.isoformat(),
                    'compression_type': compression.value
                }
                await self.redis_client.setex(
                    key, 
                    ttl, 
                    json.dumps(redis_data)
                )
                
            # Record cache operation metric
            await self._record_metric('cache_operation', 1, 'count', {
                'operation': 'set',
                'strategy': strategy.value,
                'compression': compression.value
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Cache operation failed: {str(e)}")
            return False
            
    async def get_from_cache(self, 
                           key: str,
                           strategy: CacheStrategy = CacheStrategy.CACHE_FIRST) -> Optional[Any]:
        """Get data from cache with specified strategy"""
        try:
            # Try local cache first
            if key in self.local_cache:
                entry = self.local_cache[key]
                
                # Check if entry is expired
                if datetime.utcnow() - entry.created_at > timedelta(seconds=entry.ttl):
                    del self.local_cache[key]
                else:
                    # Update access statistics
                    entry.access_count += 1
                    entry.last_accessed = datetime.utcnow()
                    
                    # Decompress and return value
                    return await self._decompress_data(entry.value, entry.compression_type)
                    
            # Try Redis cache
            if self.redis_client:
                redis_data = await self.redis_client.get(key)
                if redis_data:
                    data = json.loads(redis_data)
                    
                    # Check if entry is expired
                    created_at = datetime.fromisoformat(data['created_at'])
                    if datetime.utcnow() - created_at > timedelta(seconds=data['ttl']):
                        await self.redis_client.delete(key)
                    else:
                        # Decompress and return value
                        compression_type = CompressionType(data['compression_type'])
                        return await self._decompress_data(data['value'], compression_type)
                        
            # Record cache miss
            await self._record_metric('cache_miss', 1, 'count', {'key': key})
            return None
            
        except Exception as e:
            logger.error(f"Cache retrieval failed: {str(e)}")
            return None
            
    async def invalidate_cache(self, 
                             pattern: str,
                             strategy: str = "exact") -> int:
        """Invalidate cache entries matching pattern"""
        try:
            invalidated_count = 0
            
            # Invalidate local cache
            if strategy == "exact":
                if pattern in self.local_cache:
                    del self.local_cache[pattern]
                    invalidated_count += 1
            else:
                # Pattern matching
                keys_to_remove = [
                    key for key in self.local_cache.keys()
                    if pattern in key
                ]
                for key in keys_to_remove:
                    del self.local_cache[key]
                    invalidated_count += 1
                    
            # Invalidate Redis cache
            if self.redis_client:
                if strategy == "exact":
                    result = await self.redis_client.delete(pattern)
                    invalidated_count += result
                else:
                    keys = await self.redis_client.keys(f"*{pattern}*")
                    if keys:
                        result = await self.redis_client.delete(*keys)
                        invalidated_count += result
                        
            # Record invalidation metric
            await self._record_metric('cache_invalidation', invalidated_count, 'count', {
                'pattern': pattern,
                'strategy': strategy
            })
            
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Cache invalidation failed: {str(e)}")
            return 0
            
    async def optimize_database_queries(self, 
                                      query: str,
                                      params: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize database queries with caching and analysis"""
        try:
            # Generate query hash for caching
            query_hash = hashlib.md5(f"{query}{json.dumps(params, sort_keys=True)}".encode()).hexdigest()
            cache_key = f"db_query:{query_hash}"
            
            # Try to get from cache first
            cached_result = await self.get_from_cache(cache_key, CacheStrategy.CACHE_FIRST)
            if cached_result:
                await self._record_metric('database_query_cache_hit', 1, 'count')
                return {
                    'result': cached_result,
                    'cached': True,
                    'query_time_ms': 0
                }
                
            # Execute query (mock implementation)
            start_time = time.time()
            result = await self._execute_database_query(query, params)
            query_time = (time.time() - start_time) * 1000
            
            # Cache result if query time is significant
            if query_time > 50:  # Cache queries taking more than 50ms
                await self.cache_with_strategy(
                    cache_key,
                    result,
                    CacheStrategy.WRITE_THROUGH,
                    ttl=300  # 5 minutes
                )
                
            # Record query performance metric
            await self._record_metric('database_query_time', query_time, 'milliseconds', {
                'query_type': self._classify_query(query),
                'cached': False
            })
            
            return {
                'result': result,
                'cached': False,
                'query_time_ms': query_time
            }
            
        except Exception as e:
            logger.error(f"Database query optimization failed: {str(e)}")
            return {
                'result': None,
                'error': str(e),
                'query_time_ms': 0
            }
            
    async def optimize_api_response(self, 
                                  endpoint: str,
                                  data: Any,
                                  compression: CompressionType = CompressionType.BROTLI) -> Dict[str, Any]:
        """Optimize API response with compression and caching"""
        try:
            # Compress response data
            compressed_data = await self._compress_data(data, compression)
            
            # Calculate compression ratio
            original_size = len(json.dumps(data).encode('utf-8'))
            compressed_size = len(compressed_data)
            compression_ratio = (1 - compressed_size / original_size) * 100
            
            # Record compression metric
            await self._record_metric('api_compression_ratio', compression_ratio, 'percent', {
                'endpoint': endpoint,
                'compression_type': compression.value
            })
            
            return {
                'data': compressed_data,
                'compression_type': compression.value,
                'compression_ratio': compression_ratio,
                'original_size': original_size,
                'compressed_size': compressed_size
            }
            
        except Exception as e:
            logger.error(f"API response optimization failed: {str(e)}")
            return {
                'data': data,
                'error': str(e)
            }
            
    async def setup_cdn_optimization(self, 
                                   static_assets: List[str],
                                   cdn_provider: str = "cloudflare") -> Dict[str, Any]:
        """Setup CDN optimization for static assets"""
        try:
            cdn_config = {
                'provider': cdn_provider,
                'assets': [],
                'optimization_rules': [],
                'cache_headers': {},
                'compression': True
            }
            
            for asset in static_assets:
                # Generate CDN URL
                cdn_url = await self._generate_cdn_url(asset, cdn_provider)
                
                # Optimize asset
                optimized_asset = await self._optimize_static_asset(asset)
                
                cdn_config['assets'].append({
                    'original_path': asset,
                    'cdn_url': cdn_url,
                    'optimized': optimized_asset,
                    'cache_ttl': self._get_asset_cache_ttl(asset)
                })
                
            # Setup cache headers
            cdn_config['cache_headers'] = {
                'css': 'max-age=31536000, immutable',
                'js': 'max-age=31536000, immutable',
                'images': 'max-age=31536000, immutable',
                'fonts': 'max-age=31536000, immutable'
            }
            
            # Record CDN setup metric
            await self._record_metric('cdn_assets_optimized', len(static_assets), 'count', {
                'provider': cdn_provider
            })
            
            return cdn_config
            
        except Exception as e:
            logger.error(f"CDN optimization setup failed: {str(e)}")
            return {
                'error': str(e)
            }
            
    async def monitor_performance(self) -> Dict[str, Any]:
        """Monitor system performance and generate report"""
        try:
            # Collect performance metrics
            metrics = {
                'response_times': await self._get_response_time_metrics(),
                'cache_performance': await self._get_cache_performance_metrics(),
                'memory_usage': await self._get_memory_usage_metrics(),
                'cpu_usage': await self._get_cpu_usage_metrics(),
                'database_performance': await self._get_database_performance_metrics(),
                'api_performance': await self._get_api_performance_metrics()
            }
            
            # Analyze performance
            analysis = await self._analyze_performance_metrics(metrics)
            
            # Generate recommendations
            recommendations = await self._generate_performance_recommendations(analysis)
            
            return {
                'metrics': metrics,
                'analysis': analysis,
                'recommendations': recommendations,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Performance monitoring failed: {str(e)}")
            return {
                'error': str(e)
            }
            
    async def _compress_data(self, data: Any, compression_type: CompressionType) -> bytes:
        """Compress data using specified compression type"""
        try:
            # Serialize data to JSON
            json_data = json.dumps(data).encode('utf-8')
            
            if compression_type == CompressionType.GZIP:
                return gzip.compress(json_data)
            elif compression_type == CompressionType.BROTLI:
                return brotli.compress(json_data)
            elif compression_type == CompressionType.DEFLATE:
                import zlib
                return zlib.compress(json_data)
            else:
                return json_data
                
        except Exception as e:
            logger.error(f"Data compression failed: {str(e)}")
            return json.dumps(data).encode('utf-8')
            
    async def _decompress_data(self, compressed_data: bytes, compression_type: CompressionType) -> Any:
        """Decompress data using specified compression type"""
        try:
            if compression_type == CompressionType.GZIP:
                decompressed = gzip.decompress(compressed_data)
            elif compression_type == CompressionType.BROTLI:
                decompressed = brotli.decompress(compressed_data)
            elif compression_type == CompressionType.DEFLATE:
                import zlib
                decompressed = zlib.decompress(compressed_data)
            else:
                decompressed = compressed_data
                
            return json.loads(decompressed.decode('utf-8'))
            
        except Exception as e:
            logger.error(f"Data decompression failed: {str(e)}")
            return None
            
    async def _execute_database_query(self, query: str, params: Dict[str, Any]) -> Any:
        """Execute database query (mock implementation)"""
        # Mock implementation - would execute actual database query
        await asyncio.sleep(0.01)  # Simulate query execution time
        return {"result": "mock_data"}
        
    def _classify_query(self, query: str) -> str:
        """Classify query type"""
        query_lower = query.lower()
        if 'select' in query_lower:
            return 'select'
        elif 'insert' in query_lower:
            return 'insert'
        elif 'update' in query_lower:
            return 'update'
        elif 'delete' in query_lower:
            return 'delete'
        else:
            return 'other'
            
    async def _generate_cdn_url(self, asset_path: str, provider: str) -> str:
        """Generate CDN URL for asset"""
        # Mock implementation - would generate actual CDN URL
        return f"https://cdn.{provider}.com/{asset_path}"
        
    async def _optimize_static_asset(self, asset_path: str) -> Dict[str, Any]:
        """Optimize static asset"""
        # Mock implementation - would optimize actual asset
        return {
            'minified': True,
            'compressed': True,
            'optimized_size': 1024
        }
        
    def _get_asset_cache_ttl(self, asset_path: str) -> int:
        """Get cache TTL for asset based on file type"""
        if asset_path.endswith(('.css', '.js')):
            return 31536000  # 1 year
        elif asset_path.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg')):
            return 31536000  # 1 year
        elif asset_path.endswith(('.woff', '.woff2', '.ttf', '.eot')):
            return 31536000  # 1 year
        else:
            return 3600  # 1 hour
            
    async def _setup_cache_strategies(self):
        """Setup cache strategies for different data types"""
        self.cache_strategies = {
            'user_data': CacheStrategy.CACHE_FIRST,
            'nft_metadata': CacheStrategy.STALE_WHILE_REVALIDATE,
            'market_data': CacheStrategy.NETWORK_FIRST,
            'static_content': CacheStrategy.CACHE_FIRST,
            'api_responses': CacheStrategy.WRITE_THROUGH
        }
        
    async def _setup_cdn_endpoints(self):
        """Setup CDN endpoints"""
        self.cdn_endpoints = {
            'images': 'https://cdn.soladia.com/images',
            'assets': 'https://cdn.soladia.com/assets',
            'fonts': 'https://cdn.soladia.com/fonts'
        }
        
    async def _record_metric(self, 
                           metric_name: str, 
                           value: float, 
                           unit: str, 
                           tags: Dict[str, str] = None):
        """Record performance metric"""
        metric = PerformanceMetric(
            metric_name=metric_name,
            value=value,
            unit=unit,
            timestamp=datetime.utcnow(),
            tags=tags or {},
            metadata={}
        )
        self.performance_metrics.append(metric)
        
    async def _get_response_time_metrics(self) -> Dict[str, float]:
        """Get response time metrics"""
        # Mock implementation - would collect actual metrics
        return {
            'average_response_time_ms': 150,
            'p95_response_time_ms': 300,
            'p99_response_time_ms': 500
        }
        
    async def _get_cache_performance_metrics(self) -> Dict[str, float]:
        """Get cache performance metrics"""
        total_requests = len(self.performance_metrics)
        cache_hits = len([m for m in self.performance_metrics if 'cache_hit' in m.metric_name])
        
        return {
            'cache_hit_ratio': cache_hits / total_requests if total_requests > 0 else 0,
            'cache_size': len(self.local_cache),
            'cache_evictions': 0
        }
        
    async def _get_memory_usage_metrics(self) -> Dict[str, float]:
        """Get memory usage metrics"""
        # Mock implementation - would collect actual memory metrics
        return {
            'used_memory_mb': 256,
            'available_memory_mb': 768,
            'memory_usage_percent': 25
        }
        
    async def _get_cpu_usage_metrics(self) -> Dict[str, float]:
        """Get CPU usage metrics"""
        # Mock implementation - would collect actual CPU metrics
        return {
            'cpu_usage_percent': 45,
            'load_average': 1.2
        }
        
    async def _get_database_performance_metrics(self) -> Dict[str, float]:
        """Get database performance metrics"""
        # Mock implementation - would collect actual database metrics
        return {
            'average_query_time_ms': 25,
            'slow_queries_count': 5,
            'connection_pool_usage': 0.3
        }
        
    async def _get_api_performance_metrics(self) -> Dict[str, float]:
        """Get API performance metrics"""
        # Mock implementation - would collect actual API metrics
        return {
            'requests_per_second': 100,
            'error_rate_percent': 0.5,
            'average_response_size_kb': 2.5
        }
        
    async def _analyze_performance_metrics(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze performance metrics and identify issues"""
        analysis = {
            'issues': [],
            'warnings': [],
            'performance_score': 100
        }
        
        # Check response time thresholds
        if metrics['response_times']['average_response_time_ms'] > self.thresholds['response_time_ms']:
            analysis['issues'].append('High average response time')
            analysis['performance_score'] -= 20
            
        # Check cache hit ratio
        if metrics['cache_performance']['cache_hit_ratio'] < self.thresholds['cache_hit_ratio']:
            analysis['warnings'].append('Low cache hit ratio')
            analysis['performance_score'] -= 10
            
        # Check memory usage
        if metrics['memory_usage']['memory_usage_percent'] > 80:
            analysis['warnings'].append('High memory usage')
            analysis['performance_score'] -= 15
            
        return analysis
        
    async def _generate_performance_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate performance recommendations"""
        recommendations = []
        
        if 'High average response time' in analysis['issues']:
            recommendations.append('Consider implementing response caching and database query optimization')
            
        if 'Low cache hit ratio' in analysis['warnings']:
            recommendations.append('Review cache strategies and increase cache TTL for frequently accessed data')
            
        if 'High memory usage' in analysis['warnings']:
            recommendations.append('Consider implementing memory optimization and garbage collection tuning')
            
        return recommendations

# Create singleton instance
advanced_performance_service = AdvancedPerformanceService()


