from typing import List, Optional, Literal, Any
from pydantic import BaseModel, model_validator
import uuid

def generate_meter_uuid():
    """Generate a 6-character UUID-like identifier for meters."""
    return str(uuid.uuid4())[:8].upper()

class MeterConfig(BaseModel):
    name: str
    meter_id: Optional[str] = None

class GasMeterConfig(BaseModel):
    room: str
    meter_id: str

class GasConfig(BaseModel):
    meters: List[GasMeterConfig]

class WaterMeterConfig(BaseModel):
    room: str
    is_warm_water: bool = False
    meter_id: str

class WaterConfig(BaseModel):
    meters: List[WaterMeterConfig]
    
class ElectricityConfig(BaseModel):
    meters: List[MeterConfig]

class AppConfig(BaseModel):
    gas: GasConfig
    water: WaterConfig
    electricity: ElectricityConfig

    @classmethod
    def empty(cls):
        return cls(
            gas=GasConfig(meters=[]),
            water=WaterConfig(meters=[]),
            electricity=ElectricityConfig(meters=[])
        )

# Reading Models
class ElectricityReadingInput(BaseModel):
    date: str  # YYYY-MM-DD
    meter_name: str
    meter_id: str
    value: float
    comment: Optional[str] = None

class ElectricityReading(ElectricityReadingInput):
    id: int
    period: str  # YYYY-MM, derived from date
    consumption: Optional[float] = None
    calculation_details: Optional[str] = None
    is_reset: bool = False

class WaterReadingInput(BaseModel):
    date: str  # YYYY-MM-DD
    room: str
    meter_id: str
    value: float
    is_warm_water: bool = False  # False = cold water, True = warm water
    comment: Optional[str] = None

class WaterReading(WaterReadingInput):
    id: int
    period: str  # YYYY-MM, derived from date
    calculation_details: Optional[str] = None
    total_water_consumption: Optional[float] = None
    warm_water_consumption: Optional[float] = None
    cold_water_consumption: Optional[float] = None
    is_reset: bool = False

class GasReadingInput(BaseModel):
    date: str  # YYYY-MM-DD
    room: str
    meter_id: str
    value: float
    comment: Optional[str] = None

class GasReading(GasReadingInput):
    id: int
    period: str  # YYYY-MM, derived from date
    consumption: Optional[float] = None
    calculation_details: Optional[str] = None
    is_reset: bool = False

class MeterSummary(BaseModel):
    type: str
    consumption: float

# Consumption Calculation Models
class SegmentItem(BaseModel):
    date: str
    value: float
    comment: Optional[str] = None

class CalculationDetails(BaseModel):
    segments: List[SegmentItem]
    total_consumption: float
    segment_count: int
    first_reading_date: str
    last_reading_date: str

class ConsumptionCalcItem(BaseModel):
    id: int
    period: str
    entity_type: str
    entity_id: str
    consumption_value: Optional[float]
    calculation_details: Optional[CalculationDetails] = None
    calculated_at: str


# Reset Models
class ElectricityResetInput(BaseModel):
    meter_id: str
    meter_name: str
    last_reading: float
    reset_value: float = 0.0


class WaterResetInput(BaseModel):
    meter_id: str
    room: str
    is_warm_water: bool = False
    last_reading: float
    reset_value: float = 0.0


class GasResetInput(BaseModel):
    meter_id: str
    room: str
    last_reading: float
    reset_value: float = 0.0


class MeterResetsInput(BaseModel):
    date: str  # YYYY-MM-DD
    electricity: List[ElectricityResetInput] = []
    water: List[WaterResetInput] = []
    gas: List[GasResetInput] = []


class ResetResult(BaseModel):
    status: str
    message: str
    created_readings: int
