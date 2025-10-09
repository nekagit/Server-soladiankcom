"""
Advanced caching system with Redis for Soladia
"""
import json
import pickle
import hashlib
import time
from typing import Any, Optional, Dict, List, Union, Callable
from datetime import datetime, timedelta
import aioredis
from functools import wraps
import asyncio
import logging

logger = logging.getLogger(__name__)

class CacheStrategy:
    """Cache strategy enumeration"""
    WRITE_THROUGH = "write_through"
    WRITE_BACK = "write_back"
    WRITE_AROUND = "write_around"
    CACHE_ASIDE = "cache_aside"

class CacheSerializer:
    """Cache serialization strategies"""
    
    @staticmethod
    def json_serialize(data: Any) -> str:
        """JSON serialization"""
        return json.dumps(data, default=str)
    
    @staticmethod
    def json_deserialize(data: str) -> Any:
        """JSON deserialization"""
        return json.loads(data)
    
    @staticmethod
    def pickle_serialize(data: Any) -> bytes:
        """Pickle serialization for complex objects"""
        return pickle.dumps(data)
    
    @staticmethod
    def pickle_deserialize(data: bytes) -> Any:
        """Pickle deserialization"""
        return pickle.loads(data)

class CacheKeyGenerator:
    """Generate consistent cache keys"""
    
    @staticmethod
    def generate_key(
        prefix: str,
        *args,
        **kwargs
    ) -> str:
        """Generate cache key from prefix and arguments"""
        key_parts = [prefix]
        
        # Add positional arguments
        for arg in args:
            if isinstance(arg, (str, int, float, bool)):
                key_parts.append(str(arg))
            elif isinstance(arg, dict):
                key_parts.append(json.dumps(arg, sort_keys=True))
            else:
                key_parts.append(str(hash(str(arg))))
        
        # Add keyword arguments
        for key, value in sorted(kwargs.items()):
            if value is not None:
                key_parts.append(f"{key}:{value}")
        
        return ":".join(key_parts)
    
    @staticmethod
    def generate_pattern(prefix: str) -> str:
        """Generate Redis pattern for key matching"""
        return f"{prefix}:*"

class CacheMetrics:
    """Cache performance metrics"""
    
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.sets = 0
        self.deletes = 0
        self.errors = 0
        self.total_requests = 0
        self.start_time = time.time()
    
    def record_hit(self):
        """Record cache hit"""
        self.hits += 1
        self.total_requests += 1
    
    def record_miss(self):
        """Record cache miss"""
        self.misses += 1
        self.total_requests += 1
    
    def record_set(self):
        """Record cache set operation"""
        self.sets += 1
    
    def record_delete(self):
        """Record cache delete operation"""
        self.deletes += 1
    
    def record_error(self):
        """Record cache error"""
        self.errors += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        uptime = time.time() - self.start_time
        hit_rate = (self.hits / self.total_requests * 100) if self.total_requests > 0 else 0
        
        return {
            "hits": self.hits,
            "misses": self.misses,
            "sets": self.sets,
            "deletes": self.deletes,
            "errors": self.errors,
            "total_requests": self.total_requests,
            "hit_rate": round(hit_rate, 2),
            "uptime_seconds": round(uptime, 2),
            "requests_per_second": round(self.total_requests / uptime, 2) if uptime > 0 else 0
        }

class AdvancedCache:
    """Advanced Redis-based caching system"""
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        default_ttl: int = 3600,
        max_connections: int = 10,
        strategy: str = CacheStrategy.CACHE_ASIDE,
        serializer: str = "json"
    ):
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self.max_connections = max_connections
        self.strategy = strategy
        self.serializer = serializer
        self.redis_pool = None
        self.metrics = CacheMetrics()
        self.key_generator = CacheKeyGenerator()
        
        # Serialization methods
        if serializer == "json":
            self.serialize = CacheSerializer.json_serialize
            self.deserialize = CacheSerializer.json_deserialize
        else:
            self.serialize = CacheSerializer.pickle_serialize
            self.deserialize = CacheSerializer.pickle_deserialize
    
    async def initialize(self):
        """Initialize Redis connection pool"""
        try:
            self.redis_pool = aioredis.ConnectionPool.from_url(
                self.redis_url,
                max_connections=self.max_connections,
                retry_on_timeout=True
            )
            logger.info("Redis connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            raise
    
    async def get_redis(self) -> aioredis.Redis:
        """Get Redis connection from pool"""
        if not self.redis_pool:
            await self.initialize()
        return aioredis.Redis(connection_pool=self.redis_pool)
    
    async def get(
        self,
        key: str,
        default: Any = None
    ) -> Any:
        """Get value from cache"""
        try:
            redis = await self.get_redis()
            data = await redis.get(key)
            
            if data is None:
                self.metrics.record_miss()
                return default
            
            self.metrics.record_hit()
            
            if self.serializer == "json":
                return self.deserialize(data)
            else:
                return self.deserialize(data)
                
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            self.metrics.record_error()
            return default
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        tags: Optional[List[str]] = None
    ) -> bool:
        """Set value in cache"""
        try:
            redis = await self.get_redis()
            
            # Serialize value
            if self.serializer == "json":
                serialized_value = self.serialize(value)
            else:
                serialized_value = self.serialize(value)
            
            # Set with TTL
            ttl = ttl or self.default_ttl
            await redis.setex(key, ttl, serialized_value)
            
            # Store tags for invalidation
            if tags:
                for tag in tags:
                    await redis.sadd(f"cache:tags:{tag}", key)
                    await redis.expire(f"cache:tags:{tag}", ttl)
            
            self.metrics.record_set()
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            self.metrics.record_error()
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            redis = await self.get_redis()
            result = await redis.delete(key)
            self.metrics.record_delete()
            return bool(result)
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            self.metrics.record_error()
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            redis = await self.get_redis()
            keys = await redis.keys(pattern)
            if keys:
                result = await redis.delete(*keys)
                self.metrics.record_delete()
                return result
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            self.metrics.record_error()
            return 0
    
    async def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all cache entries with specific tag"""
        try:
            redis = await self.get_redis()
            keys = await redis.smembers(f"cache:tags:{tag}")
            if keys:
                result = await redis.delete(*keys)
                await redis.delete(f"cache:tags:{tag}")
                self.metrics.record_delete()
                return result
            return 0
        except Exception as e:
            logger.error(f"Cache invalidate by tag error for {tag}: {e}")
            self.metrics.record_error()
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            redis = await self.get_redis()
            result = await redis.exists(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            self.metrics.record_error()
            return False
    
    async def ttl(self, key: str) -> int:
        """Get TTL for key"""
        try:
            redis = await self.get_redis()
            return await redis.ttl(key)
        except Exception as e:
            logger.error(f"Cache TTL error for key {key}: {e}")
            self.metrics.record_error()
            return -1
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set TTL for key"""
        try:
            redis = await self.get_redis()
            result = await redis.expire(key, ttl)
            return bool(result)
        except Exception as e:
            logger.error(f"Cache expire error for key {key}: {e}")
            self.metrics.record_error()
            return False
    
    async def get_or_set(
        self,
        key: str,
        factory: Callable,
        ttl: Optional[int] = None,
        tags: Optional[List[str]] = None
    ) -> Any:
        """Get value from cache or set it using factory function"""
        value = await self.get(key)
        if value is not None:
            return value
        
        # Generate value using factory
        if asyncio.iscoroutinefunction(factory):
            value = await factory()
        else:
            value = factory()
        
        # Cache the value
        await self.set(key, value, ttl, tags)
        return value
    
    async def mget(self, keys: List[str]) -> List[Any]:
        """Get multiple values from cache"""
        try:
            redis = await self.get_redis()
            values = await redis.mget(keys)
            
            result = []
            for i, value in enumerate(values):
                if value is None:
                    self.metrics.record_miss()
                    result.append(None)
                else:
                    self.metrics.record_hit()
                    if self.serializer == "json":
                        result.append(self.deserialize(value))
                    else:
                        result.append(self.deserialize(value))
            
            return result
        except Exception as e:
            logger.error(f"Cache mget error: {e}")
            self.metrics.record_error()
            return [None] * len(keys)
    
    async def mset(
        self,
        mapping: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """Set multiple values in cache"""
        try:
            redis = await self.get_redis()
            
            # Serialize values
            serialized_mapping = {}
            for key, value in mapping.items():
                if self.serializer == "json":
                    serialized_mapping[key] = self.serialize(value)
                else:
                    serialized_mapping[key] = self.serialize(value)
            
            # Set values
            await redis.mset(serialized_mapping)
            
            # Set TTL for all keys
            if ttl:
                pipe = redis.pipeline()
                for key in mapping.keys():
                    pipe.expire(key, ttl)
                await pipe.execute()
            
            self.metrics.record_set()
            return True
        except Exception as e:
            logger.error(f"Cache mset error: {e}")
            self.metrics.record_error()
            return False
    
    async def increment(
        self,
        key: str,
        amount: int = 1,
        ttl: Optional[int] = None
    ) -> int:
        """Increment numeric value in cache"""
        try:
            redis = await self.get_redis()
            result = await redis.incrby(key, amount)
            
            if ttl:
                await redis.expire(key, ttl)
            
            return result
        except Exception as e:
            logger.error(f"Cache increment error for key {key}: {e}")
            self.metrics.record_error()
            return 0
    
    async def decrement(
        self,
        key: str,
        amount: int = 1,
        ttl: Optional[int] = None
    ) -> int:
        """Decrement numeric value in cache"""
        try:
            redis = await self.get_redis()
            result = await redis.decrby(key, amount)
            
            if ttl:
                await redis.expire(key, ttl)
            
            return result
        except Exception as e:
            logger.error(f"Cache decrement error for key {key}: {e}")
            self.metrics.record_error()
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return self.metrics.get_stats()
    
    async def clear_all(self) -> bool:
        """Clear all cache entries"""
        try:
            redis = await self.get_redis()
            await redis.flushdb()
            return True
        except Exception as e:
            logger.error(f"Cache clear all error: {e}")
            self.metrics.record_error()
            return False
    
    async def close(self):
        """Close Redis connection pool"""
        if self.redis_pool:
            await self.redis_pool.disconnect()

def cache_key(prefix: str):
    """Decorator to generate cache key"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = CacheKeyGenerator.generate_key(prefix, *args, **kwargs)
            return key
        return wrapper
    return decorator

def cached(
    ttl: int = 3600,
    tags: Optional[List[str]] = None,
    cache_instance: Optional[AdvancedCache] = None
):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if not cache_instance:
                return await func(*args, **kwargs)
            
            # Generate cache key
            key = CacheKeyGenerator.generate_key(
                func.__name__,
                *args,
                **kwargs
            )
            
            # Try to get from cache
            result = await cache_instance.get(key)
            if result is not None:
                return result
            
            # Execute function and cache result
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            await cache_instance.set(key, result, ttl, tags)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if not cache_instance:
                return func(*args, **kwargs)
            
            # Generate cache key
            key = CacheKeyGenerator.generate_key(
                func.__name__,
                *args,
                **kwargs
            )
            
            # Try to get from cache
            import asyncio
            loop = asyncio.get_event_loop()
            result = loop.run_until_complete(cache_instance.get(key))
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            loop.run_until_complete(cache_instance.set(key, result, ttl, tags))
            return result
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    return decorator

# Global cache instance
cache = AdvancedCache()

async def get_cache() -> AdvancedCache:
    """Get global cache instance"""
    if not cache.redis_pool:
        await cache.initialize()
    return cache
