from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.db import lifespan
from app.core.exceptions import add_exception_handlers
from app.core.settings import get_settings
from app.routes import api_router

settings = get_settings()

app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_exception_handlers(app)


@app.get("/")
async def root():
    return {
        "success": True,
        "message": "Stay Alaya API is running",
        "endpoints": {
            "health": "/api/health",
            "auth": "/api/auth",
            "pgs": "/api/pgs",
            "owner": "/api/owner",
            "admin": "/api/admin",
        },
    }


@app.get("/api/health")
async def health_check():
    from datetime import datetime, timezone

    return {
        "success": True,
        "status": "OK",
        "time": datetime.now(timezone.utc).isoformat(),
        "environment": settings.environment,
    }


app.include_router(api_router)
