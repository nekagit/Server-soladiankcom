"""
Background task processing system for Soladia
Handles heavy operations like image processing, email sending, analytics, etc.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
import json
import redis
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor
import traceback

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4

@dataclass
class Task:
    id: str
    name: str
    payload: Dict[str, Any]
    status: TaskStatus
    priority: TaskPriority
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    retry_count: int = 0
    max_retries: int = 3
    timeout: int = 300  # 5 minutes default

class TaskQueue:
    """Redis-based task queue with priority support"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.task_key = "tasks:queue"
        self.task_data_key = "tasks:data"
        self.workers: List[TaskWorker] = []
        self.running = False
        
    async def add_task(
        self,
        name: str,
        payload: Dict[str, Any],
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
        timeout: int = 300
    ) -> str:
        """Add a new task to the queue"""
        task_id = f"{name}_{datetime.now().timestamp()}"
        task = Task(
            id=task_id,
            name=name,
            payload=payload,
            status=TaskStatus.PENDING,
            priority=priority,
            created_at=datetime.now(),
            max_retries=max_retries,
            timeout=timeout
        )
        
        try:
            # Store task data
            self.redis_client.hset(
                self.task_data_key,
                task_id,
                json.dumps(asdict(task), default=str)
            )
            
            # Add to priority queue
            self.redis_client.zadd(
                self.task_key,
                {task_id: priority.value}
            )
            
            logger.info(f"Added task {task_id} with priority {priority.name}")
            return task_id
            
        except Exception as e:
            logger.error(f"Failed to add task {task_id}: {e}")
            raise

    async def get_next_task(self) -> Optional[Task]:
        """Get the next highest priority task"""
        try:
            # Get highest priority task
            result = self.redis_client.zpopmax(self.task_key, count=1)
            if not result:
                return None
            
            task_id = result[0][0]
            
            # Get task data
            task_data = self.redis_client.hget(self.task_data_key, task_id)
            if not task_data:
                return None
            
            task_dict = json.loads(task_data)
            task_dict['status'] = TaskStatus(task_dict['status'])
            task_dict['priority'] = TaskPriority(task_dict['priority'])
            task_dict['created_at'] = datetime.fromisoformat(task_dict['created_at'])
            
            if task_dict['started_at']:
                task_dict['started_at'] = datetime.fromisoformat(task_dict['started_at'])
            if task_dict['completed_at']:
                task_dict['completed_at'] = datetime.fromisoformat(task_dict['completed_at'])
            
            return Task(**task_dict)
            
        except Exception as e:
            logger.error(f"Failed to get next task: {e}")
            return None

    async def update_task_status(
        self,
        task_id: str,
        status: TaskStatus,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        """Update task status and data"""
        try:
            task_data = self.redis_client.hget(self.task_data_key, task_id)
            if not task_data:
                return
            
            task_dict = json.loads(task_data)
            task_dict['status'] = status.value
            
            if status == TaskStatus.RUNNING:
                task_dict['started_at'] = datetime.now().isoformat()
            elif status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                task_dict['completed_at'] = datetime.now().isoformat()
            
            if result:
                task_dict['result'] = result
            if error:
                task_dict['error'] = error
            
            self.redis_client.hset(
                self.task_data_key,
                task_id,
                json.dumps(task_dict, default=str)
            )
            
        except Exception as e:
            logger.error(f"Failed to update task {task_id}: {e}")

    async def get_task_status(self, task_id: str) -> Optional[Task]:
        """Get task status by ID"""
        try:
            task_data = self.redis_client.hget(self.task_data_key, task_id)
            if not task_data:
                return None
            
            task_dict = json.loads(task_data)
            task_dict['status'] = TaskStatus(task_dict['status'])
            task_dict['priority'] = TaskPriority(task_dict['priority'])
            task_dict['created_at'] = datetime.fromisoformat(task_dict['created_at'])
            
            if task_dict['started_at']:
                task_dict['started_at'] = datetime.fromisoformat(task_dict['started_at'])
            if task_dict['completed_at']:
                task_dict['completed_at'] = datetime.fromisoformat(task_dict['completed_at'])
            
            return Task(**task_dict)
            
        except Exception as e:
            logger.error(f"Failed to get task status for {task_id}: {e}")
            return None

class TaskWorker:
    """Worker that processes tasks from the queue"""
    
    def __init__(self, worker_id: str, task_handlers: Dict[str, Callable]):
        self.worker_id = worker_id
        self.task_handlers = task_handlers
        self.running = False
        self.current_task: Optional[Task] = None
        
    async def start(self, task_queue: TaskQueue):
        """Start the worker"""
        self.running = True
        logger.info(f"Worker {self.worker_id} started")
        
        while self.running:
            try:
                task = await task_queue.get_next_task()
                if not task:
                    await asyncio.sleep(1)
                    continue
                
                await self.process_task(task, task_queue)
                
            except Exception as e:
                logger.error(f"Worker {self.worker_id} error: {e}")
                await asyncio.sleep(5)
    
    async def process_task(self, task: Task, task_queue: TaskQueue):
        """Process a single task"""
        self.current_task = task
        
        try:
            # Update task status to running
            await task_queue.update_task_status(task.id, TaskStatus.RUNNING)
            
            # Get task handler
            handler = self.task_handlers.get(task.name)
            if not handler:
                raise ValueError(f"No handler found for task {task.name}")
            
            # Execute task with timeout
            result = await asyncio.wait_for(
                handler(task.payload),
                timeout=task.timeout
            )
            
            # Update task status to completed
            await task_queue.update_task_status(
                task.id,
                TaskStatus.COMPLETED,
                result=result
            )
            
            logger.info(f"Task {task.id} completed successfully")
            
        except asyncio.TimeoutError:
            await task_queue.update_task_status(
                task.id,
                TaskStatus.FAILED,
                error="Task timed out"
            )
            logger.error(f"Task {task.id} timed out")
            
        except Exception as e:
            error_msg = f"Task failed: {str(e)}"
            await task_queue.update_task_status(
                task.id,
                TaskStatus.FAILED,
                error=error_msg
            )
            logger.error(f"Task {task.id} failed: {e}")
            
        finally:
            self.current_task = None

class BackgroundTaskManager:
    """Main background task manager"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.task_queue = TaskQueue(redis_url)
        self.workers: List[TaskWorker] = []
        self.task_handlers: Dict[str, Callable] = {}
        self.running = False
        
    def register_handler(self, task_name: str, handler: Callable):
        """Register a task handler"""
        self.task_handlers[task_name] = handler
        logger.info(f"Registered handler for task: {task_name}")
    
    async def start_workers(self, num_workers: int = 4):
        """Start background workers"""
        self.running = True
        
        for i in range(num_workers):
            worker = TaskWorker(f"worker-{i}", self.task_handlers)
            self.workers.append(worker)
            
            # Start worker in background
            asyncio.create_task(worker.start(self.task_queue))
        
        logger.info(f"Started {num_workers} background workers")
    
    async def stop_workers(self):
        """Stop all workers"""
        self.running = False
        for worker in self.workers:
            worker.running = False
        logger.info("Stopped all background workers")
    
    async def submit_task(
        self,
        name: str,
        payload: Dict[str, Any],
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
        timeout: int = 300
    ) -> str:
        """Submit a new task"""
        return await self.task_queue.add_task(
            name, payload, priority, max_retries, timeout
        )
    
    async def get_task_status(self, task_id: str) -> Optional[Task]:
        """Get task status"""
        return await self.task_queue.get_task_status(task_id)

# Global task manager instance
task_manager = BackgroundTaskManager()

# Task handlers
async def process_image_task(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process image upload task"""
    image_url = payload.get("image_url")
    operations = payload.get("operations", [])
    
    # Simulate image processing
    await asyncio.sleep(2)
    
    return {
        "processed_url": f"processed_{image_url}",
        "operations": operations,
        "status": "completed"
    }

async def send_email_task(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Send email task"""
    to_email = payload.get("to_email")
    subject = payload.get("subject")
    template = payload.get("template")
    
    # Simulate email sending
    await asyncio.sleep(1)
    
    return {
        "email_sent": True,
        "to": to_email,
        "subject": subject,
        "message_id": f"msg_{datetime.now().timestamp()}"
    }

async def generate_analytics_task(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Generate analytics report task"""
    report_type = payload.get("report_type")
    date_range = payload.get("date_range")
    
    # Simulate analytics generation
    await asyncio.sleep(5)
    
    return {
        "report_id": f"report_{datetime.now().timestamp()}",
        "type": report_type,
        "date_range": date_range,
        "status": "generated"
    }

async def solana_transaction_task(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process Solana transaction task"""
    transaction_id = payload.get("transaction_id")
    operation = payload.get("operation")
    
    # Simulate Solana transaction processing
    await asyncio.sleep(3)
    
    return {
        "transaction_id": transaction_id,
        "operation": operation,
        "status": "processed",
        "block_height": 12345
    }

# Register task handlers
task_manager.register_handler("process_image", process_image_task)
task_manager.register_handler("send_email", send_email_task)
task_manager.register_handler("generate_analytics", generate_analytics_task)
task_manager.register_handler("solana_transaction", solana_transaction_task)
