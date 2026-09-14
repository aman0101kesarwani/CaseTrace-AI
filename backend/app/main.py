from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.connection import Base, engine
from app import models  # noqa: F401

from app.routers import health, cases, documents, dashboard, users, auth
from app.routers.search import router as search_router
from app.routers import rag, claims, contradictions, dates, events, graph


Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.app_name,
    version="0.1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    health.router,
    prefix=settings.api_v1_prefix
)

app.include_router(
    cases.router,
    prefix=settings.api_v1_prefix
)

app.include_router(
    documents.router,
    prefix=settings.api_v1_prefix
)

app.include_router(
    dashboard.router,
    prefix=settings.api_v1_prefix
)

app.include_router(
    users.router,
    prefix=settings.api_v1_prefix
)

app.include_router(
    auth.router,
    prefix=settings.api_v1_prefix
)

app.include_router(search_router)

app.include_router(rag.router)

app.include_router(claims.router)

app.include_router(contradictions.router)

app.include_router(dates.router)

app.include_router(events.router)

app.include_router(graph.router)