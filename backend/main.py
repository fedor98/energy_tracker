from fastapi import FastAPI
from contextlib import asynccontextmanager
from db import init_db
from routes import router
from migration import check_migration_needed, migrate_legacy_data, check_consumption_calc_migration_needed, migrate_consumption_calc_values

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    
    # Check if migration from legacy table is needed
    if check_migration_needed():
        print("Legacy data detected. Running migration...")
        try:
            migrate_legacy_data()
            print("Migration completed successfully!")
        except Exception as e:
            print(f"Migration failed: {e}")
            print("Please check the database manually.")
    
    # Check if consumption_calc migration is needed
    if check_consumption_calc_migration_needed():
        print("Consumption calc migration needed. Running migration...")
        try:
            migrate_consumption_calc_values()
            print("Consumption calc migration completed successfully!")
        except Exception as e:
            print(f"Consumption calc migration failed: {e}")
            print("Please check the database manually.")
    
    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)

# API Routes
app.include_router(router, prefix="/api")
