from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from .db import init_db
from .routes import router
from .migration import check_migration_needed, migrate_legacy_data, check_consumption_calc_migration_needed, migrate_consumption_calc_values, check_meter_id_migration_needed, migrate_meter_ids_if_needed, migrate_consumption_calc_meter_ids, check_consumption_calc_meter_id_migration_needed

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
