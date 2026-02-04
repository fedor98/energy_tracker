from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from .models import AppConfig, ReadingInput, ConsumptionItem
from .db import get_config, save_config, save_reading, backup_and_reset_db
from .services import calculate_consumption

router = APIRouter()

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

@router.get("/readings", response_model=List[ConsumptionItem])
def get_consumptions(
    start: Optional[str] = Query(None, alias="start"),
    end: Optional[str] = Query(None, alias="end"),
    type: Optional[str] = Query(None, alias="type")
):
    return calculate_consumption(type_filter=type, start_period=start, end_period=end)

@router.post("/readings")
def add_readings(readings: List[ReadingInput]):
    for reading in readings:
        save_reading(reading)
    return {"status": "success", "count": len(readings)}
