from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.api.v1.router import api_router
from backend.app.api.v1.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup: Create tables if not present (declarative Base)
    Base.metadata.create_all(bind=engine)
    yield
    # Teardown logic if needed


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        description=settings.PROJECT_DESCRIPTION,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS configuration
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Root health shortcut and API v1 routes
    application.include_router(health_router, prefix="", tags=["Health Alias"])
    application.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @application.get("/", tags=["Root"])
    def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "running",
            "docs": "/docs",
            "health": f"{settings.API_V1_PREFIX}/health",
        }

    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG,
    )

