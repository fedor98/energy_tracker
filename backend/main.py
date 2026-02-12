from fastapi import FastAPI
from contextlib import asynccontextmanager
from db import init_db
from routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()

    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)

# API Routes
app.include_router(router, prefix="/api")
