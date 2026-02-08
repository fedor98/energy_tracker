from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from .db import init_db
from .routes import router
# from .migration import 

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

# Catch-all for SPA routing
@app.get("/{full_path:path}")
async def read_index_catchall(full_path: str):
    return FileResponse('frontend/index.html')
