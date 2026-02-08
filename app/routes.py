from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from .models import (
    AppConfig, 
    ReadingInput, 
    ElectricityReadingInput,
    WaterReadingInput,
    GasReadingInput,
    ElectricityReading,
    WaterReading,
    GasReading,
    MonthlyReadings
)
from .db import (
    get_config, 
    save_config, 
    backup_and_reset_db,
    reorganize_tables,
    save_electricity_reading,
    save_water_reading,
    save_gas_reading,
    get_electricity_readings,
    get_water_readings,
    get_gas_readings,
    get_electricity_reading,
    get_water_reading,
    get_gas_reading,
    update_electricity_reading,
    update_water_reading,
    update_gas_reading,
    delete_electricity_reading,
    delete_water_reading,
    delete_gas_reading,
    get_monthly_readings
)
from .migration import migrate_legacy_data, check_migration_needed, get_migration_status

router = APIRouter()

# Configuration Endpoints
@router.get("/config", response_model=Optional[AppConfig])
def read_config():
    return get_config()

@router.post("/config/init")
def init_config(config: AppConfig):
    save_config(config)
    return {"status": "success", "message": "Configuration saved"}

@router.post("/config/reset")
def reset_app():
    backup_and_reset_db()
    return {"status": "success", "message": "Database reset and backed up"}

# Migration Endpoints
@router.get("/migration/status")
def migration_status():
    return get_migration_status()

@router.post("/migration/run")
def run_migration():
    if not check_migration_needed():
        return {"status": "skipped", "message": "Migration not needed"}
    
    try:
        migrate_legacy_data()
        return {"status": "success", "message": "Migration completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

@router.post("/readings")
def add_readings(readings: List[ReadingInput]):
    """Legacy endpoint - saves readings to appropriate tables."""
    import sys
    print(f"DEBUG: Received {len(readings)} readings", flush=True, file=sys.stderr)

    count = 0

    for reading in readings:
        print(f"DEBUG: Processing: type={reading.type}, meter={reading.meter}, channel={reading.channel}, meter_id={reading.meter_id}, value={reading.value}", flush=True, file=sys.stderr)

        if reading.type == "electricity":
            date = reading.date or f"{reading.period}-01"
            save_electricity_reading(ElectricityReadingInput(
                date=date,
                meter_name=reading.meter,
                meter_id=reading.meter_id or 'UNKNOWN',
                value=reading.value
            ))
            count += 1
        elif reading.type == "water":
            date = reading.date or f"{reading.period}-01"
            is_warm = reading.channel == "warm" or reading.channel is None

            save_water_reading(WaterReadingInput(
                date=date,
                room=reading.meter,
                meter_id=reading.meter_id or 'UNKNOWN',
                value=reading.value,
                is_warm_water=is_warm
            ))
            count += 1
            print(f"DEBUG: Saved water reading: room={reading.meter}, warm={is_warm}, meter_id={reading.meter_id}, value={reading.value}", flush=True, file=sys.stderr)
        elif reading.type == "gas":
            date = reading.date or f"{reading.period}-01"
            save_gas_reading(GasReadingInput(
                date=date,
                room=reading.meter,
                meter_id=reading.meter_id or 'UNKNOWN',
                value=reading.value
            ))
            count += 1

    return {"status": "success", "count": count}

# Monthly Readings Endpoint
@router.get("/readings/monthly/{period}", response_model=MonthlyReadings)
def get_monthly(period: str):
    """Get all readings for a specific month across all utility types."""
    readings = get_monthly_readings(period)
    
    return MonthlyReadings(
        period=period,
        electricity=[ElectricityReading(**r) for r in readings['electricity']],
        water=[WaterReading(**r) for r in readings['water']],
        gas=[GasReading(**r) for r in readings['gas']]
    )

# Electricity Endpoints
@router.get("/readings/electricity", response_model=List[ElectricityReading])
def list_electricity(
    start: Optional[str] = Query(None, alias="start"),
    end: Optional[str] = Query(None, alias="end"),
    meter: Optional[str] = Query(None, alias="meter"),
    meter_id: Optional[str] = Query(None, alias="meter_id")
):
    """List all electricity readings with optional filters."""
    readings = get_electricity_readings(
        start_period=start,
        end_period=end,
        meter_name=meter,
        meter_id=meter_id
    )
    return [ElectricityReading(**r) for r in readings]

@router.get("/readings/electricity/{reading_id}", response_model=ElectricityReading)
def get_electricity(reading_id: int):
    """Get a specific electricity reading."""
    reading = get_electricity_reading(reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Electricity reading not found")
    return ElectricityReading(**reading)

@router.post("/readings/electricity", response_model=ElectricityReading)
def create_electricity(reading: ElectricityReadingInput):
    """Create a new electricity reading."""
    reading_id = save_electricity_reading(reading)
    result = get_electricity_reading(reading_id)
    return ElectricityReading(**result)

@router.put("/readings/electricity/{reading_id}", response_model=ElectricityReading)
def update_electricity(reading_id: int, reading: ElectricityReadingInput):
    """Update an existing electricity reading."""
    # Check if reading exists
    existing = get_electricity_reading(reading_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Electricity reading not found")
    
    updated = update_electricity_reading(reading_id, reading)
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to update reading")
    
    result = get_electricity_reading(reading_id)
    return ElectricityReading(**result)

@router.delete("/readings/electricity/{reading_id}")
def delete_electricity(reading_id: int):
    """Delete an electricity reading."""
    deleted = delete_electricity_reading(reading_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Electricity reading not found")
    return {"status": "success", "message": "Reading deleted"}

# Water Endpoints
@router.get("/readings/water", response_model=List[WaterReading])
def list_water(
    start: Optional[str] = Query(None, alias="start"),
    end: Optional[str] = Query(None, alias="end"),
    room: Optional[str] = Query(None, alias="room"),
    warm: Optional[bool] = Query(None, alias="warm"),
    meter_id: Optional[str] = Query(None, alias="meter_id")
):
    """List all water readings with optional filters."""
    readings = get_water_readings(
        start_period=start,
        end_period=end,
        room=room,
        is_warm_water=warm,
        meter_id=meter_id
    )
    return [WaterReading(**r) for r in readings]

@router.get("/readings/water/{reading_id}", response_model=WaterReading)
def get_water(reading_id: int):
    """Get a specific water reading."""
    reading = get_water_reading(reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Water reading not found")
    return WaterReading(**reading)

@router.post("/readings/water", response_model=WaterReading)
def create_water(reading: WaterReadingInput):
    """Create a new water reading."""
    reading_id = save_water_reading(reading)
    result = get_water_reading(reading_id)
    return WaterReading(**result)

@router.put("/readings/water/{reading_id}", response_model=WaterReading)
def update_water(reading_id: int, reading: WaterReadingInput):
    """Update an existing water reading."""
    existing = get_water_reading(reading_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Water reading not found")
    
    updated = update_water_reading(reading_id, reading)
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to update reading")
    
    result = get_water_reading(reading_id)
    return WaterReading(**result)

@router.delete("/readings/water/{reading_id}")
def delete_water(reading_id: int):
    """Delete a water reading."""
    deleted = delete_water_reading(reading_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Water reading not found")
    return {"status": "success", "message": "Reading deleted"}

# Gas Endpoints
@router.get("/readings/gas", response_model=List[GasReading])
def list_gas(
    start: Optional[str] = Query(None, alias="start"),
    end: Optional[str] = Query(None, alias="end"),
    room: Optional[str] = Query(None, alias="room"),
    meter_id: Optional[str] = Query(None, alias="meter_id")
):
    """List all gas readings with optional filters."""
    readings = get_gas_readings(
        start_period=start,
        end_period=end,
        room=room,
        meter_id=meter_id
    )
    return [GasReading(**r) for r in readings]

@router.get("/readings/gas/{reading_id}", response_model=GasReading)
def get_gas(reading_id: int):
    """Get a specific gas reading."""
    reading = get_gas_reading(reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Gas reading not found")
    return GasReading(**reading)

@router.post("/readings/gas", response_model=GasReading)
def create_gas(reading: GasReadingInput):
    """Create a new gas reading."""
    reading_id = save_gas_reading(reading)
    result = get_gas_reading(reading_id)
    return GasReading(**result)

@router.put("/readings/gas/{reading_id}", response_model=GasReading)
def update_gas(reading_id: int, reading: GasReadingInput):
    """Update an existing gas reading."""
    existing = get_gas_reading(reading_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Gas reading not found")
    
    updated = update_gas_reading(reading_id, reading)
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to update reading")
    
    result = get_gas_reading(reading_id)
    return GasReading(**result)

@router.delete("/readings/gas/{reading_id}")
def delete_gas(reading_id: int):
    """Delete a gas reading."""
    deleted = delete_gas_reading(reading_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Gas reading not found")
    return {"status": "success", "message": "Reading deleted"}

# Maintenance Endpoints
@router.post("/maintenance/reorganize")
def reorganize_database():
    """Reorganize all tables to have newest entries first. Creates a backup before proceeding."""
    try:
        result = reorganize_tables()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reorganization failed: {str(e)}")
