from datetime import datetime
import math
from typing import Dict

# ตาราง Archetype (Frozen Table) ตาม Spec
PLANETARY_DAY_SCORES = {
    0: ("Moon", 40.0),     # Monday
    1: ("Mars", 30.0),     # Tuesday
    2: ("Mercury", 0.0),   # Wednesday
    3: ("Jupiter", 50.0),  # Thursday
    4: ("Venus", 30.0),    # Friday
    5: ("Saturn", -30.0),  # Saturday
    6: ("Sun", 70.0)       # Sunday
}

def get_moon_phase_score(dt: datetime) -> Dict[str, any]:
    """
    คำนวณดิถีจันทร์ (Lunar Phase) แบบคร่าวๆ
    (ใช้ค่าเฉลี่ย Synodic Month = 29.530588853 วัน)
    """
    # จุดอ้างอิง New Moon: 2000-01-06 18:14 UTC
    ref_new_moon = datetime(2000, 1, 6, 18, 14)
    
    # ถ้า dt เป็น timezone-aware ให้แปลงเป็น naive UTC ก่อน
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
        
    diff_days = (dt - ref_new_moon).total_seconds() / 86400.0
    phase_pct = (diff_days % 29.530588853) / 29.530588853
    
    # แปลงเป็นชื่อ Phase และคะแนน
    if phase_pct < 0.03 or phase_pct > 0.97:
        return {"phase": "New Moon", "score": 40.0}
    elif phase_pct < 0.22:
        return {"phase": "Waxing Crescent", "score": 20.0}
    elif phase_pct < 0.28:
        return {"phase": "First Quarter", "score": 10.0}
    elif phase_pct < 0.47:
        return {"phase": "Waxing Gibbous", "score": 40.0}
    elif phase_pct < 0.53:
        return {"phase": "Full Moon", "score": -20.0}
    elif phase_pct < 0.72:
        return {"phase": "Waning Gibbous", "score": -10.0}
    elif phase_pct < 0.78:
        return {"phase": "Last Quarter", "score": -30.0}
    else:
        return {"phase": "Waning Crescent", "score": -40.0}

def get_planetary_day_score(dt: datetime) -> Dict[str, any]:
    """
    คำนวณวันในสัปดาห์ (Planetary Day) และให้คะแนน
    """
    weekday = dt.weekday() # 0=Monday, 6=Sunday
    planet, score = PLANETARY_DAY_SCORES.get(weekday, ("Unknown", 0.0))
    return {"planet": planet, "score": score}

def get_celestial_score(dt: datetime) -> Dict[str, any]:
    """
    รวมคะแนนจากดิถีจันทร์และวันในสัปดาห์
    """
    moon_data = get_moon_phase_score(dt)
    day_data = get_planetary_day_score(dt)
    
    # รวมคะแนน (น้ำหนัก 50/50)
    composite_score = (moon_data["score"] + day_data["score"]) / 2
    composite_score = max(-100.0, min(100.0, composite_score))
    
    return {
        "score": composite_score,
        "moon_phase": moon_data["phase"],
        "moon_score": moon_data["score"],
        "planetary_day": day_data["planet"],
        "day_score": day_data["score"]
    }