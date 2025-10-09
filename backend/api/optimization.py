"""
API optimization and performance enhancements for Soladia
"""
import asyncio
import time
import json
from typing import Dict, List, Optional, Any, Callable, Union
from functools import wraps
from datetime import datetime, timedelta
import gzip
import brotli
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

class ResponseOptimizer:
    """Optimize API responses for performance"""
    
    def __init__(self):
        self.compression_threshold = 1024  # Compress responses larger than 1KB
        self.max_response_size = 10 * 1024 * 1024  # 10MB max response size
    
    def compress_response(self, content: str, encoding: str = "gzip") -> bytes:
        """Compress response content"""
        if encoding == "gzip":
            return gzip.compress(content.encode('utf-8'))
        elif encoding == "brotli":
            return brotli.compress(content.encode('utf-8'))
        else:
            return content.encode('utf-8')
    
    def optimize_json_response(
        self,
        data: Any,
        exclude_none: bool = True,
        exclude_unset: bool = True
    ) -> str:
        """Optimize JSON response"""
        if isinstance(data, dict):
            # Remove None values if requested
            if exclude_none:
                data = {k: v for k, v in data.items() if v is not None}
            
            # Remove unset values if requested
            if exclude_unset:
                data = {k: v for k, v in data.items() if v != ""}
        
        return json.dumps(data, separators=(',', ':'), default=str)
    
    def add_response_headers(
        self,
        response: Response,
        cache_ttl: int = 300,
        etag: Optional[str] = None
    ) -> Response:
        """Add optimization headers to response"""
        # Cache headers
        response.headers["Cache-Control"] = f"public, max-age={cache_ttl}"
        response.headers["Expires"] = (datetime.utcnow() + timedelta(seconds=cache_ttl)).strftime("%a, %d %b %Y %H:%M:%S GMT")
        
        # ETag for caching
        if etag:
            response.headers["ETag"] = etag
        
        # Compression headers
        response.headers["Vary"] = "Accept-Encoding"
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        return response

class QueryOptimizer:
    """Optimize database queries for performance"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.query_cache = {}
        self.slow_query_threshold = 1.0  # Log queries slower than 1 second
    
    async def execute_optimized_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
        use_cache: bool = True,
        cache_ttl: int = 300
    ) -> List[Dict[str, Any]]:
        """Execute query with optimization"""
        start_time = time.time()
        
        # Check cache first
        if use_cache:
            cache_key = f"query:{hash(query)}:{hash(str(params))}"
            if cache_key in self.query_cache:
                cached_result, cached_time = self.query_cache[cache_key]
                if time.time() - cached_time < cache_ttl:
                    return cached_result
        
        try:
            # Execute query
            result = self.db.execute(text(query), params or {})
            rows = result.fetchall()
            
            # Convert to dictionary list
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in rows]
            
            # Cache result
            if use_cache:
                self.query_cache[cache_key] = (data, time.time())
            
            # Log slow queries
            execution_time = time.time() - start_time
            if execution_time > self.slow_query_threshold:
                logger.warning(f"Slow query detected: {execution_time:.2f}s - {query[:100]}...")
            
            return data
            
        except Exception as e:
            logger.error(f"Query execution error: {e}")
            raise HTTPException(status_code=500, detail="Database query failed")
    
    def add_query_hints(self, query: str, hints: List[str]) -> str:
        """Add database hints to query"""
        # This would be database-specific
        # For PostgreSQL, you might add hints like:
        # /*+ USE_INDEX(table_name, index_name) */
        return query
    
    def optimize_join_query(
        self,
        base_table: str,
        join_tables: List[Dict[str, str]],
        select_fields: List[str],
        where_conditions: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None
    ) -> str:
        """Build optimized JOIN query"""
        # Build SELECT clause
        select_clause = ", ".join(select_fields)
        
        # Build FROM clause with JOINs
        from_clause = base_table
        for join in join_tables:
            from_clause += f" {join['type']} JOIN {join['table']} ON {join['condition']}"
        
        # Build WHERE clause
        where_clause = ""
        if where_conditions:
            conditions = []
            for field, value in where_conditions.items():
                if isinstance(value, str):
                    conditions.append(f"{field} = '{value}'")
                else:
                    conditions.append(f"{field} = {value}")
            where_clause = "WHERE " + " AND ".join(conditions)
        
        # Build ORDER BY clause
        order_clause = f"ORDER BY {order_by}" if order_by else ""
        
        # Build LIMIT clause
        limit_clause = f"LIMIT {limit}" if limit else ""
        
        # Combine all clauses
        query = f"""
        SELECT {select_clause}
        FROM {from_clause}
        {where_clause}
        {order_clause}
        {limit_clause}
        """
        
        return query.strip()

class PaginationOptimizer:
    """Optimize pagination for large datasets"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    async def get_paginated_results(
        self,
        query: str,
        page: int = 1,
        per_page: int = 20,
        params: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get paginated results with optimization"""
        # Validate pagination parameters
        page = max(1, page)
        per_page = min(100, max(1, per_page))  # Cap at 100 items per page
        
        offset = (page - 1) * per_page
        
        # Count total records
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as count_query"
        count_result = await self.execute_optimized_query(count_query, params)
        total = count_result[0]["total"] if count_result else 0
        
        # Get paginated data
        paginated_query = f"""
        {query}
        {f"ORDER BY {order_by}" if order_by else ""}
        LIMIT {per_page} OFFSET {offset}
        """
        
        data = await self.execute_optimized_query(paginated_query, params)
        
        # Calculate pagination metadata
        total_pages = (total + per_page - 1) // per_page
        has_next = page < total_pages
        has_prev = page > 1
        
        return {
            "data": data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev,
                "next_page": page + 1 if has_next else None,
                "prev_page": page - 1 if has_prev else None
            }
        }
    
    async def execute_optimized_query(self, query: str, params: Optional[Dict[str, Any]] = None):
        """Execute query (placeholder - would use QueryOptimizer)"""
        # This would use the QueryOptimizer
        pass

class BatchProcessor:
    """Process multiple operations in batches for efficiency"""
    
    def __init__(self, batch_size: int = 100):
        self.batch_size = batch_size
    
    async def process_batch(
        self,
        items: List[Any],
        processor_func: Callable,
        *args,
        **kwargs
    ) -> List[Any]:
        """Process items in batches"""
        results = []
        
        for i in range(0, len(items), self.batch_size):
            batch = items[i:i + self.batch_size]
            
            if asyncio.iscoroutinefunction(processor_func):
                batch_result = await processor_func(batch, *args, **kwargs)
            else:
                batch_result = processor_func(batch, *args, **kwargs)
            
            results.extend(batch_result)
        
        return results
    
    async def process_parallel_batches(
        self,
        items: List[Any],
        processor_func: Callable,
        max_concurrent: int = 5,
        *args,
        **kwargs
    ) -> List[Any]:
        """Process items in parallel batches"""
        results = []
        
        # Create batches
        batches = [items[i:i + self.batch_size] for i in range(0, len(items), self.batch_size)]
        
        # Process batches in parallel with concurrency limit
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_single_batch(batch):
            async with semaphore:
                if asyncio.iscoroutinefunction(processor_func):
                    return await processor_func(batch, *args, **kwargs)
                else:
                    return processor_func(batch, *args, **kwargs)
        
        # Execute all batches
        batch_results = await asyncio.gather(*[process_single_batch(batch) for batch in batches])
        
        # Flatten results
        for batch_result in batch_results:
            results.extend(batch_result)
        
        return results

class APIMiddleware:
    """API optimization middleware"""
    
    def __init__(self, response_optimizer: ResponseOptimizer):
        self.response_optimizer = response_optimizer
        self.request_times = {}
    
    async def process_request(self, request: Request) -> Request:
        """Process incoming request"""
        # Record request start time
        request.state.start_time = time.time()
        
        # Add request ID for tracking
        request.state.request_id = f"req_{int(time.time() * 1000)}"
        
        return request
    
    async def process_response(
        self,
        request: Request,
        response: Response,
        data: Any
    ) -> Response:
        """Process outgoing response"""
        # Calculate processing time
        if hasattr(request.state, 'start_time'):
            processing_time = time.time() - request.state.start_time
            response.headers["X-Processing-Time"] = str(processing_time)
        
        # Add request ID to response
        if hasattr(request.state, 'request_id'):
            response.headers["X-Request-ID"] = request.state.request_id
        
        # Optimize response based on content type
        if response.headers.get("content-type", "").startswith("application/json"):
            # Optimize JSON response
            if isinstance(data, (dict, list)):
                optimized_data = self.response_optimizer.optimize_json_response(data)
                response.body = optimized_data.encode('utf-8')
        
        # Add optimization headers
        response = self.response_optimizer.add_response_headers(response)
        
        return response

class PerformanceMonitor:
    """Monitor API performance metrics"""
    
    def __init__(self):
        self.metrics = {
            "total_requests": 0,
            "total_response_time": 0,
            "average_response_time": 0,
            "slow_requests": 0,
            "error_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
        self.endpoint_metrics = {}
        self.slow_requests = []
    
    def record_request(
        self,
        endpoint: str,
        method: str,
        response_time: float,
        status_code: int,
        cache_hit: bool = False
    ):
        """Record request metrics"""
        self.metrics["total_requests"] += 1
        self.metrics["total_response_time"] += response_time
        self.metrics["average_response_time"] = (
            self.metrics["total_response_time"] / self.metrics["total_requests"]
        )
        
        if response_time > 2.0:  # Slow request threshold
            self.metrics["slow_requests"] += 1
            self.slow_requests.append({
                "endpoint": endpoint,
                "method": method,
                "response_time": response_time,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        if status_code >= 400:
            self.metrics["error_requests"] += 1
        
        if cache_hit:
            self.metrics["cache_hits"] += 1
        else:
            self.metrics["cache_misses"] += 1
        
        # Track per-endpoint metrics
        endpoint_key = f"{method}:{endpoint}"
        if endpoint_key not in self.endpoint_metrics:
            self.endpoint_metrics[endpoint_key] = {
                "requests": 0,
                "total_time": 0,
                "average_time": 0,
                "errors": 0
            }
        
        ep_metrics = self.endpoint_metrics[endpoint_key]
        ep_metrics["requests"] += 1
        ep_metrics["total_time"] += response_time
        ep_metrics["average_time"] = ep_metrics["total_time"] / ep_metrics["requests"]
        
        if status_code >= 400:
            ep_metrics["errors"] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        return {
            "global_metrics": self.metrics,
            "endpoint_metrics": self.endpoint_metrics,
            "recent_slow_requests": self.slow_requests[-10:]  # Last 10 slow requests
        }
    
    def get_endpoint_performance(self, endpoint: str, method: str) -> Dict[str, Any]:
        """Get performance metrics for specific endpoint"""
        endpoint_key = f"{method}:{endpoint}"
        return self.endpoint_metrics.get(endpoint_key, {})

# Performance monitoring decorator
def monitor_performance(monitor: PerformanceMonitor):
    """Decorator to monitor API endpoint performance"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            status_code = 200
            
            try:
                result = await func(*args, **kwargs)
                return result
            except HTTPException as e:
                status_code = e.status_code
                raise
            except Exception as e:
                status_code = 500
                raise
            finally:
                response_time = time.time() - start_time
                
                # Extract endpoint info from function
                endpoint = func.__name__
                method = "GET"  # Default, would need to extract from request
                
                monitor.record_request(endpoint, method, response_time, status_code)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            status_code = 200
            
            try:
                result = func(*args, **kwargs)
                return result
            except HTTPException as e:
                status_code = e.status_code
                raise
            except Exception as e:
                status_code = 500
                raise
            finally:
                response_time = time.time() - start_time
                
                # Extract endpoint info from function
                endpoint = func.__name__
                method = "GET"  # Default, would need to extract from request
                
                monitor.record_request(endpoint, method, response_time, status_code)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    return decorator

# Global instances
response_optimizer = ResponseOptimizer()
performance_monitor = PerformanceMonitor()
batch_processor = BatchProcessor()
