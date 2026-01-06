from sqlalchemy.orm import Session
from app.models import Instance
from app.database import SessionLocal
import httpx
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

class HealthCheckService:
    @staticmethod
    async def check_instance_health(instance: Instance, client: httpx.AsyncClient):
        """Check health for a single instance"""
        if not instance.url:
            return None
        
        try:
            # First try HEAD request
            response = await client.head(instance.url, timeout=5.0)
            if response.status_code < 400:
                return "healthy"
            
            # If HEAD fails (some servers block it), try GET
            response = await client.get(instance.url, timeout=5.0)
            if response.status_code < 400:
                return "healthy"
            else:
                return "unhealthy"
        except Exception as e:
            # logger.warning(f"Health check failed for {instance.name} ({instance.url}): {e}")
            return "unhealthy"

    @staticmethod
    async def check_all_instances():
        """Check health for all instances"""
        try:
            db = SessionLocal()
            instances = db.query(Instance).filter(Instance.url.isnot(None)).all()
            
            if not instances:
                db.close()
                return

            # Use asynchronous context manager for httpx client
            async with httpx.AsyncClient(verify=False) as client:
                tasks = []
                for instance in instances:
                    # We wrap the check and update in a task
                    tasks.append(HealthCheckService._check_and_update(instance, client, db))
                
                # Run all checks concurrently
                if tasks:
                    await asyncio.gather(*tasks)
            
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Error in health check job: {e}")
            if 'db' in locals():
                db.close()

    @staticmethod
    async def _check_and_update(instance: Instance, client: httpx.AsyncClient, db: Session):
        """Helper to check and update a single instance in the same session"""
        status = await HealthCheckService.check_instance_health(instance, client)
        if status:
            instance.health_status = status
            instance.last_health_check = datetime.utcnow()
            # print(f"Instance {instance.name} status: {status}")
