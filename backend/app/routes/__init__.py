from fastapi import APIRouter

from app.routes.admin_routes import router as admin_router
from app.routes.auth_routes import router as auth_router
from app.routes.chat_routes import router as chat_router
from app.routes.notification_routes import router as notification_router
from app.routes.owner_routes import router as owner_router
from app.routes.pg_routes import router as pg_router
from app.routes.report_routes import router as report_router
from app.routes.review_routes import router as review_router
from app.routes.user_routes import router as user_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(pg_router)
api_router.include_router(owner_router)
api_router.include_router(admin_router)
api_router.include_router(user_router)
api_router.include_router(review_router)
api_router.include_router(notification_router)
api_router.include_router(report_router)
