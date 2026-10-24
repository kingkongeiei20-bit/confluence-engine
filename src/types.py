from dataclasses import dataclass, field
from typing import Optional, Dict, List

@dataclass
class TechScore:
    score: float              # -100 to +100
    direction: str            # "bullish", "bearish", "neutral"  <-- ตัวที่ขาดไป
    regime: str               # "dead", "low", "healthy", "high", "extreme"
    volatility_percentile: float
    session: str              # "asian", "london", "ny", "overlap", "dead"
    tf_alignment: Dict[str, str] # e.g., {"H1": "up", "H4": "up"}
    key_levels: Dict[str, float]
    conflicts: List[str] = field(default_factory=list)
    component_scores: Dict[str, float] = field(default_factory=dict)

@dataclass
class EsoScore:
    score: float              
    archetype: str            
    confidence: str           
    trap_warning: bool
    valid_until: str          

@dataclass
class Signal:
    symbol: str
    timestamp: str
    grade: str                
    composite_score: float
    state: str                
    tech: TechScore
    eso: Optional[EsoScore]
    suggested_lot: float