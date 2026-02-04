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

# Reading Models
class ReadingInput(BaseModel):
    period: str  # YYYY-MM
    date: Optional[str] = None # YYYY-MM-DD
    type: Literal["electricity", "water", "gas"]
    meter: str # Room name or Meter name
    channel: Optional[str] = None # "warm", "cold", or None
    value: float

class ReadingItem(ReadingInput):
    id: int
    
class ConsumptionItem(BaseModel):
    period: str
    date: Optional[str]
    type: str
    meter: str
    channel: Optional[str]
    value: float # The counter reading
    consumption: Optional[float] # The calculated consumption (diff)

class MeterSummary(BaseModel):
    type: str
    consumption: float
