"""
Database Connection Pool for Soladia
Advanced connection pooling with monitoring and optimization
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
import time
from dataclasses import dataclass
from enum import Enum
import threading
from sqlalchemy import create_engine, event, text
from sqlalchemy.pool import QueuePool, StaticPool, NullPool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
from sqlalchemy.exc import DisconnectionError, OperationalError
import psycopg2
from psycopg2 import pool
import redis
import json

logger = logging.getLogger(__name__)

class PoolStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    MAINTENANCE = "maintenance"

@dataclass
class PoolMetrics:
    """Connection pool metrics"""
    total_connections: int
    active_connections: int
    idle_connections: int
    overflow_connections: int
    checked_out_connections: int
    checked_in_connections: int
    invalid_connections: int
    wait_count: int
    wait_time: float
    last_activity: datetime
    status: PoolStatus

class AdvancedConnectionPool:
    """Advanced database connection pool with monitoring and optimization"""
    
    def __init__(
        self,
        database_url: str,
        pool_size: int = 20,
        max_overflow: int = 40,
        pool_recycle: int = 3600,
        pool_pre_ping: bool = True,
        pool_timeout: int = 30,
        redis_url: Optional[str] = None
    ):
        self.database_url = database_url
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_recycle = pool_recycle
        self.pool_pre_ping = pool_pre_ping
        self.pool_timeout = pool_timeout
        
        # Initialize Redis for caching
        self.redis_client = None
        if redis_url:
            try:
                self.redis_client = redis.from_url(redis_url)
                self.redis_client.ping()
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
                self.redis_client = None
        
        # Connection pool metrics
        self.metrics = PoolMetrics(
            total_connections=0,
            active_connections=0,
            idle_connections=0,
            overflow_connections=0,
            checked_out_connections=0,
            checked_in_connections=0,
            invalid_connections=0,
            wait_count=0,
            wait_time=0.0,
            last_activity=datetime.now(),
            status=PoolStatus.HEALTHY
        )
        
        # Performance tracking
        self.performance_data = {
            'query_times': [],
            'connection_times': [],
            'error_count': 0,
            'success_count': 0
        }
        
        # Initialize connection pool
        self._initialize_pool()
        
        # Start monitoring
        self._start_monitoring()
    
    def _initialize_pool(self):
        """Initialize the database connection pool"""
        try:
            # Configure pool based on database type
            if 'postgresql' in self.database_url:
                self._initialize_postgresql_pool()
            elif 'sqlite' in self.database_url:
                self._initialize_sqlite_pool()
            else:
                self._initialize_generic_pool()
            
            # Set up event listeners
            self._setup_event_listeners()
            
            logger.info(f"Connection pool initialized: {self.pool_size} base, {self.max_overflow} overflow")
            
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            raise
    
    def _initialize_postgresql_pool(self):
        """Initialize PostgreSQL-specific connection pool"""
        try:
            # Create engine with optimized settings for PostgreSQL
            self.engine = create_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=self.pool_size,
                max_overflow=self.max_overflow,
                pool_recycle=self.pool_recycle,
                pool_pre_ping=self.pool_pre_ping,
                pool_timeout=self.pool_timeout,
                echo=False,
                # PostgreSQL-specific optimizations
                connect_args={
                    'application_name': 'soladia_marketplace',
                    'options': '-c default_transaction_isolation=read committed'
                }
            )
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL pool: {e}")
            raise
    
    def _initialize_sqlite_pool(self):
        """Initialize SQLite-specific connection pool"""
        try:
            # SQLite uses StaticPool for better performance
            self.engine = create_engine(
                self.database_url,
                poolclass=StaticPool,
                pool_size=self.pool_size,
                max_overflow=0,  # SQLite doesn't support overflow
                pool_recycle=self.pool_recycle,
                pool_pre_ping=self.pool_pre_ping,
                echo=False,
                # SQLite-specific optimizations
                connect_args={
                    'check_same_thread': False,
                    'timeout': 30
                }
            )
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize SQLite pool: {e}")
            raise
    
    def _initialize_generic_pool(self):
        """Initialize generic connection pool"""
        try:
            self.engine = create_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=self.pool_size,
                max_overflow=self.max_overflow,
                pool_recycle=self.pool_recycle,
                pool_pre_ping=self.pool_pre_ping,
                pool_timeout=self.pool_timeout,
                echo=False
            )
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize generic pool: {e}")
            raise
    
    def _setup_event_listeners(self):
        """Set up database event listeners for monitoring"""
        try:
            # Connection checkout event
            @event.listens_for(self.engine, "checkout")
            def receive_checkout(dbapi_connection, connection_record, connection_proxy):
                self.metrics.checked_out_connections += 1
                self.metrics.last_activity = datetime.now()
                self._track_connection_time()
            
            # Connection checkin event
            @event.listens_for(self.engine, "checkin")
            def receive_checkin(dbapi_connection, connection_record):
                self.metrics.checked_in_connections += 1
                self.metrics.last_activity = datetime.now()
            
            # Connection invalidated event
            @event.listens_for(self.engine, "invalidate")
            def receive_invalidate(dbapi_connection, connection_record, exception):
                self.metrics.invalid_connections += 1
                logger.warning(f"Connection invalidated: {exception}")
            
            # Connection pool overflow event
            @event.listens_for(self.engine, "overflow")
            def receive_overflow(dbapi_connection, connection_record, connection_proxy):
                self.metrics.overflow_connections += 1
                logger.warning("Connection pool overflow detected")
            
            logger.info("Database event listeners configured")
            
        except Exception as e:
            logger.error(f"Failed to setup event listeners: {e}")
    
    def _track_connection_time(self):
        """Track connection acquisition time"""
        start_time = time.time()
        
        def track_time():
            end_time = time.time()
            connection_time = end_time - start_time
            self.performance_data['connection_times'].append(connection_time)
            
            # Keep only last 1000 measurements
            if len(self.performance_data['connection_times']) > 1000:
                self.performance_data['connection_times'] = self.performance_data['connection_times'][-1000:]
        
        # Schedule tracking
        threading.Timer(0, track_time).start()
    
    def _start_monitoring(self):
        """Start connection pool monitoring"""
        try:
            # Start background monitoring task
            asyncio.create_task(self._monitor_pool_health())
            asyncio.create_task(self._optimize_pool_performance())
            asyncio.create_task(self._cleanup_old_connections())
            
            logger.info("Connection pool monitoring started")
            
        except Exception as e:
            logger.error(f"Failed to start monitoring: {e}")
    
    async def _monitor_pool_health(self):
        """Monitor connection pool health"""
        while True:
            try:
                # Update metrics
                await self._update_pool_metrics()
                
                # Check pool health
                health_status = await self._check_pool_health()
                self.metrics.status = health_status
                
                # Log health status
                if health_status != PoolStatus.HEALTHY:
                    logger.warning(f"Pool health status: {health_status}")
                
                # Store metrics in Redis
                if self.redis_client:
                    await self._store_metrics_in_redis()
                
                # Wait before next check
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"Pool health monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def _update_pool_metrics(self):
        """Update connection pool metrics"""
        try:
            pool = self.engine.pool
            
            # Get current pool statistics
            self.metrics.total_connections = pool.size()
            self.metrics.active_connections = pool.checkedout()
            self.metrics.idle_connections = pool.checkedin()
            self.metrics.overflow_connections = pool.overflow()
            
            # Calculate utilization
            utilization = self.metrics.active_connections / (self.metrics.total_connections + self.metrics.overflow_connections)
            
            # Update status based on utilization
            if utilization > 0.9:
                self.metrics.status = PoolStatus.UNHEALTHY
            elif utilization > 0.7:
                self.metrics.status = PoolStatus.DEGRADED
            else:
                self.metrics.status = PoolStatus.HEALTHY
                
        except Exception as e:
            logger.error(f"Failed to update pool metrics: {e}")
    
    async def _check_pool_health(self) -> PoolStatus:
        """Check connection pool health"""
        try:
            # Test connection
            with self.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            
            # Check metrics
            if self.metrics.invalid_connections > 10:
                return PoolStatus.DEGRADED
            
            if self.metrics.overflow_connections > self.max_overflow * 0.8:
                return PoolStatus.UNHEALTHY
            
            return PoolStatus.HEALTHY
            
        except Exception as e:
            logger.error(f"Pool health check failed: {e}")
            return PoolStatus.UNHEALTHY
    
    async def _optimize_pool_performance(self):
        """Optimize connection pool performance"""
        while True:
            try:
                # Analyze performance data
                await self._analyze_performance()
                
                # Adjust pool size if needed
                await self._adjust_pool_size()
                
                # Clean up old connections
                await self._cleanup_old_connections()
                
                # Wait before next optimization
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                logger.error(f"Pool optimization error: {e}")
                await asyncio.sleep(300)
    
    async def _analyze_performance(self):
        """Analyze connection pool performance"""
        try:
            # Calculate average connection time
            if self.performance_data['connection_times']:
                avg_connection_time = sum(self.performance_data['connection_times']) / len(self.performance_data['connection_times'])
                
                # Log performance metrics
                logger.info(f"Average connection time: {avg_connection_time:.3f}s")
                
                # Check for performance issues
                if avg_connection_time > 1.0:  # More than 1 second
                    logger.warning("High connection acquisition time detected")
                
                # Calculate success rate
                total_operations = self.performance_data['success_count'] + self.performance_data['error_count']
                if total_operations > 0:
                    success_rate = self.performance_data['success_count'] / total_operations
                    logger.info(f"Connection success rate: {success_rate:.2%}")
                    
                    if success_rate < 0.95:  # Less than 95% success rate
                        logger.warning("Low connection success rate detected")
                
        except Exception as e:
            logger.error(f"Performance analysis failed: {e}")
    
    async def _adjust_pool_size(self):
        """Dynamically adjust pool size based on usage"""
        try:
            # Get current utilization
            utilization = self.metrics.active_connections / (self.metrics.total_connections + self.metrics.overflow_connections)
            
            # Adjust pool size based on utilization
            if utilization > 0.8 and self.pool_size < 50:
                # Increase pool size
                new_pool_size = min(self.pool_size + 5, 50)
                logger.info(f"Increasing pool size from {self.pool_size} to {new_pool_size}")
                self.pool_size = new_pool_size
                
            elif utilization < 0.3 and self.pool_size > 10:
                # Decrease pool size
                new_pool_size = max(self.pool_size - 5, 10)
                logger.info(f"Decreasing pool size from {self.pool_size} to {new_pool_size}")
                self.pool_size = new_pool_size
                
        except Exception as e:
            logger.error(f"Pool size adjustment failed: {e}")
    
    async def _cleanup_old_connections(self):
        """Clean up old and idle connections"""
        try:
            # Force pool to recycle old connections
            self.engine.pool.recreate()
            logger.info("Connection pool recreated")
            
        except Exception as e:
            logger.error(f"Connection cleanup failed: {e}")
    
    async def _store_metrics_in_redis(self):
        """Store pool metrics in Redis for monitoring"""
        try:
            if not self.redis_client:
                return
            
            metrics_data = {
                'total_connections': self.metrics.total_connections,
                'active_connections': self.metrics.active_connections,
                'idle_connections': self.metrics.idle_connections,
                'overflow_connections': self.metrics.overflow_connections,
                'status': self.metrics.status.value,
                'last_activity': self.metrics.last_activity.isoformat(),
                'timestamp': datetime.now().isoformat()
            }
            
            # Store in Redis with TTL
            self.redis_client.setex(
                'pool_metrics',
                300,  # 5 minutes TTL
                json.dumps(metrics_data)
            )
            
        except Exception as e:
            logger.error(f"Failed to store metrics in Redis: {e}")
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a database connection from the pool"""
        connection = None
        start_time = time.time()
        
        try:
            # Get connection from pool
            connection = self.engine.connect()
            self.performance_data['success_count'] += 1
            
            yield connection
            
        except Exception as e:
            self.performance_data['error_count'] += 1
            logger.error(f"Database connection error: {e}")
            raise
            
        finally:
            if connection:
                connection.close()
            
            # Track connection time
            connection_time = time.time() - start_time
            self.performance_data['connection_times'].append(connection_time)
    
    def get_session(self) -> Session:
        """Get a database session from the pool"""
        return self.SessionLocal()
    
    @asynccontextmanager
    async def get_session_context(self):
        """Get a database session with automatic cleanup"""
        session = None
        
        try:
            session = self.get_session()
            yield session
            
        except Exception as e:
            if session:
                session.rollback()
            logger.error(f"Database session error: {e}")
            raise
            
        finally:
            if session:
                session.close()
    
    async def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None):
        """Execute a database query with connection pooling"""
        async with self.get_connection() as connection:
            try:
                if params:
                    result = connection.execute(text(query), params)
                else:
                    result = connection.execute(text(query))
                
                return result.fetchall()
                
            except Exception as e:
                logger.error(f"Query execution failed: {e}")
                raise
    
    def get_pool_metrics(self) -> PoolMetrics:
        """Get current pool metrics"""
        return self.metrics
    
    def get_performance_data(self) -> Dict[str, Any]:
        """Get performance data"""
        return self.performance_data.copy()
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform a comprehensive health check"""
        try:
            # Test basic connectivity
            async with self.get_connection() as connection:
                connection.execute(text("SELECT 1"))
            
            # Get current metrics
            await self._update_pool_metrics()
            
            return {
                'status': 'healthy',
                'metrics': self.metrics,
                'performance': self.performance_data,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def close(self):
        """Close the connection pool"""
        try:
            if hasattr(self, 'engine'):
                self.engine.dispose()
            logger.info("Connection pool closed")
            
        except Exception as e:
            logger.error(f"Failed to close connection pool: {e}")

# Global connection pool instance
_connection_pool: Optional[AdvancedConnectionPool] = None

def get_connection_pool() -> AdvancedConnectionPool:
    """Get the global connection pool instance"""
    global _connection_pool
    if _connection_pool is None:
        raise RuntimeError("Connection pool not initialized")
    return _connection_pool

def initialize_connection_pool(
    database_url: str,
    pool_size: int = 20,
    max_overflow: int = 40,
    pool_recycle: int = 3600,
    pool_pre_ping: bool = True,
    pool_timeout: int = 30,
    redis_url: Optional[str] = None
) -> AdvancedConnectionPool:
    """Initialize the global connection pool"""
    global _connection_pool
    _connection_pool = AdvancedConnectionPool(
        database_url=database_url,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_recycle=pool_recycle,
        pool_pre_ping=pool_pre_ping,
        pool_timeout=pool_timeout,
        redis_url=redis_url
    )
    return _connection_pool
