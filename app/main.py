from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from .db import init_db
from .routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)

# API Routes
app.include_router(router, prefix="/api")

# Static Files
# Mount static folder for assets (css, js)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Serve SPA
@app.get("/")
async def read_index():
    return FileResponse('frontend/index.html')

# Catch-all for SPA routing (if strict routing is on, but we mostly use hash routing or single view)
# For now, just / serves index.
