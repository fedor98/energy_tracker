from fastapi import FastAPI
from contextlib import asynccontextmanager
from db import init_db
from routes import router
from migration import check_migration_needed, migrate_legacy_data, check_consumption_calc_migration_needed, migrate_consumption_calc_values

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()

    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)

# API Routes
app.include_router(router, prefix="/api")
