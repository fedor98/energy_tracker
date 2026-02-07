from typing import List, Optional, Literal
from pydantic import BaseModel

# Configuration Models
class GasConfig(BaseModel):
    rooms: List[str]

class WaterConfig(BaseModel):
    room: str
    is_warm_water: bool = False  # False = cold water, True = warm water
    
class ElectricityConfig(BaseModel):
    meters: List[str]

class AppConfig(BaseModel):
    gas: GasConfig
    water: List[WaterConfig]
    electricity: ElectricityConfig
    
    # Default factory to prevent errors if empty
    @classmethod
    def empty(cls):
        return cls(
            gas=GasConfig(rooms=[]),
            water=[],
            electricity=ElectricityConfig(meters=[])
        )

# Legacy Reading Model (for compatibility during transition)
class ReadingInput(BaseModel):
    period: str  # YYYY-MM
    date: Optional[str] = None  # YYYY-MM-DD
    type: Literal["electricity", "water", "gas"]
    meter: str  # Room name or Meter name
    channel: Optional[str] = None  # "warm", "cold", or None
    value: float

class ReadingItem(ReadingInput):
    id: int

# New Separate Reading Models
class ElectricityReadingInput(BaseModel):
    date: str  # YYYY-MM-DD
    meter_name: str
    value: float
    comment: Optional[str] = None

class ElectricityReading(ElectricityReadingInput):
    id: int
    period: str  # YYYY-MM, derived from date
    consumption: Optional[float] = None
    calculation_details: Optional[str] = None

class WaterReadingInput(BaseModel):
    date: str  # YYYY-MM-DD
    room: str
    value: float
    is_warm_water: bool = False  # False = cold water, True = warm water
    comment: Optional[str] = None

class WaterReading(WaterReadingInput):
    id: int
    period: str  # YYYY-MM, derived from date
    consumption: Optional[float] = None
    calculation_details: Optional[str] = None

class GasReadingInput(BaseModel):
    date: str  # YYYY-MM-DD
    room: str
    value: float
    comment: Optional[str] = None

class GasReading(GasReadingInput):
    id: int
    period: str  # YYYY-MM, derived from date
    consumption: Optional[float] = None
    calculation_details: Optional[str] = None

class MeterSummary(BaseModel):
    type: str
    consumption: float

# New Monthly Readings Response Model
class MonthlyReadings(BaseModel):
    period: str
    electricity: List[ElectricityReading]
    water: List[WaterReading]
    gas: List[GasReading]

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
