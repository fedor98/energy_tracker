from typing import List, Optional, Literal
from pydantic import BaseModel

# Configuration Models
class GasConfig(BaseModel):
    rooms: List[str]

class WaterConfig(BaseModel):
    room: str
    has_warm: bool
    has_cold: bool
    
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

class ElectricityReading(ElectricityReadingInput):
    id: int
    period: str  # YYYY-MM, derived from date
    consumption: Optional[float] = None

class WaterReadingInput(BaseModel):
    date: str  # YYYY-MM-DD
    room: str
    warm_value: Optional[float] = None
    cold_value: Optional[float] = None

class WaterReading(WaterReadingInput):
    id: int
    period: str  # YYYY-MM, derived from date
    total_value: Optional[float] = None
    warm_consumption: Optional[float] = None
    cold_consumption: Optional[float] = None
    total_consumption: Optional[float] = None

class GasReadingInput(BaseModel):
    date: str  # YYYY-MM-DD
    room: str
    value: float

class GasReading(GasReadingInput):
    id: int
    period: str  # YYYY-MM, derived from date
    consumption: Optional[float] = None

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
class ConsumptionCalcItem(BaseModel):
    id: int
    period: str
    entity_type: str
    entity_id: str
    consumption_value: Optional[float]
    calculated_at: str
