from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from models import (
    AppConfig, 
    ReadingInput, 
    ElectricityReadingInput,
    WaterReadingInput,
    GasReadingInput,
    ElectricityReading,
    WaterReading,
    GasReading,
    MonthlyReadings,
    MeterResetsInput,
    ResetResult
)
from db import (
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
    get_monthly_readings,
    get_calculation_details_by_type,
    save_meter_resets,
    get_readings_by_date,
    count_readings_by_date,
    get_meters_for_date,
    update_readings_by_date,
    delete_readings_by_date
)
from migration import migrate_legacy_data, check_migration_needed, get_migration_status

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

# Calculation Details Endpoints
@router.get("/calculations/electricity")
def get_electricity_calculations():
    """Get electricity consumption calculations grouped by period."""
    return get_calculation_details_by_type('electricity')

@router.get("/calculations/water")
def get_water_calculations():
    """Get water consumption calculations grouped by period."""
    warm_data = get_calculation_details_by_type('water_warm')
    cold_data = get_calculation_details_by_type('water_cold')
    total_data = get_calculation_details_by_type('water_total')
    
    # Combine all water types
    all_periods = set()
    for p in warm_data['periods']:
        all_periods.add(p['period'])
    for p in cold_data['periods']:
        all_periods.add(p['period'])
    for p in total_data['periods']:
        all_periods.add(p['period'])
    
    # Build result with all meters per period
    result_periods = []
    for period in sorted(all_periods, reverse=True):
        meters = []
        
        # Add warm water meters
        for p in warm_data['periods']:
            if p['period'] == period:
                for m in p['meters']:
                    meters.append({
                        'entity_id': f"{m['entity_id']} (Warm)",
                        'consumption': m['consumption'],
                        'segments': m['segments']
                    })
        
        # Add cold water meters
        for p in cold_data['periods']:
            if p['period'] == period:
                for m in p['meters']:
                    meters.append({
                        'entity_id': f"{m['entity_id']} (Cold)",
                        'consumption': m['consumption'],
                        'segments': m['segments']
                    })
        
        # Add total consumption (as separate info)
        for p in total_data['periods']:
            if p['period'] == period:
                for m in p['meters']:
                    meters.append({
                        'entity_id': f"{m['entity_id']} (Total)",
                        'consumption': m['consumption'],
                        'segments': m['segments']
                    })
        
        result_periods.append({
            'period': period,
            'meters': meters
        })
    
    return {'periods': result_periods}

@router.get("/calculations/gas")
def get_gas_calculations():
    """Get gas consumption calculations grouped by period."""
    return get_calculation_details_by_type('gas')

# Reset Endpoints
@router.post("/readings/reset", response_model=ResetResult)
def create_meter_resets(resets: MeterResetsInput):
    """
    Create meter reset entries.
    
    For each reset provided, creates two entries:
    1. The last reading before the meter replacement
    2. The reset value (starting value of the new meter)
    
    Only meters explicitly included in the request are processed.
    Others remain unchanged.
    """
    try:
        result = save_meter_resets(resets)
        return ResetResult(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save resets: {str(e)}")


# Date-based Reading Operations Endpoints

@router.get("/readings/by-date/{date}")
def get_readings_for_date(date: str, is_reset: Optional[bool] = Query(None)):
    """
    Get all readings for a specific date.
    
    Args:
        date: Date in YYYY-MM-DD format
        is_reset: Filter by reset status (optional)
    
    Returns readings grouped by type (electricity, water, gas).
    """
    try:
        readings = get_readings_by_date(date, is_reset)
        return {
            "date": date,
            "electricity": [ElectricityReading(**r) for r in readings['electricity']],
            "water": [WaterReading(**r) for r in readings['water']],
            "gas": [GasReading(**r) for r in readings['gas']]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch readings: {str(e)}")


@router.get("/readings/by-date/{date}/count")
def count_readings_for_date(date: str, is_reset: Optional[bool] = Query(None)):
    """
    Count readings for a specific date by type.
    
    Returns counts for electricity, water, gas, and total.
    """
    try:
        counts = count_readings_by_date(date, is_reset)
        return counts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to count readings: {str(e)}")


@router.get("/readings/by-date/{date}/meters")
def get_meters_for_date_endpoint(date: str):
    """
    Get list of meters/rooms that have readings on a specific date.
    
    Returns lists for electricity (meter names), water (rooms), and gas (rooms).
    """
    try:
        meters = get_meters_for_date(date)
        return meters
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch meters: {str(e)}")


class ReadingUpdateItem(BaseModel):
    id: int
    value: float
    comment: Optional[str] = None


class UpdateReadingsByDateRequest(BaseModel):
    new_date: Optional[str] = None
    electricity: List[ReadingUpdateItem] = []
    water: List[ReadingUpdateItem] = []
    gas: List[ReadingUpdateItem] = []


@router.put("/readings/by-date/{date}")
def update_readings_for_date(date: str, request: UpdateReadingsByDateRequest):
    """
    Update readings for a specific date.
    
    Can update values and optionally change the date.
    All readings for the date will be updated to the new date if specified.
    """
    try:
        result = update_readings_by_date(
            date=date,
            new_date=request.new_date,
            electricity=[r.model_dump() for r in request.electricity],
            water=[r.model_dump() for r in request.water],
            gas=[r.model_dump() for r in request.gas]
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update readings: {str(e)}")


@router.delete("/readings/by-date/{date}")
def delete_readings_for_date(date: str, is_reset: Optional[bool] = Query(None)):
    """
    Delete all readings for a specific date.
    
    Args:
        date: Date in YYYY-MM-DD format
        is_reset: If True, only delete reset readings. If False, exclude reset readings.
    
    Returns counts of deleted readings by type.
    """
    try:
        result = delete_readings_by_date(date, is_reset)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete readings: {str(e)}")
