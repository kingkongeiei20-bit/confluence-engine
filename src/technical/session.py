import pandas as pd
from datetime import datetime

def get_trading_session(dt: datetime) -> str:
    """
    ระบุ Session ของตลาดจากเวลา UTC
    - Asian: 00:00 - 07:00 UTC
    - London: 07:00 - 12:00 UTC
    - Overlap (London+NY): 12:00 - 16:00 UTC (Liquid สุดๆ)
    - NY: 16:00 - 21:00 UTC
    - Dead: 21:00 - 00:00 UTC
    """
    hour = dt.hour
    
    if 0 <= hour < 7:
        return "asian"
    elif 7 <= hour < 12:
        return "london"
    elif 12 <= hour < 16:
        return "overlap"
    elif 16 <= hour < 21:
        return "ny"
    else:
        return "dead"

def get_session_score(session: str) -> float:
    """
    ให้คะแนนตาม Spec (-100 ถึง +100)
    - Overlap: +15 (Liquid สุด, เทรดง่ายสุด)
    - London/NY: 0 (ปกติ)
    - Asian: -10 (ผันผวนต่ำ)
    - Dead: -30 (ห้ามเทรด)
    """
    if session == "overlap":
        return 15.0
    elif session in ["london", "ny"]:
        return 0.0
    elif session == "asian":
        return -10.0
    else: # dead
        return -30.0

def analyze_current_session(df: pd.DataFrame) -> dict:
    """
    รับ DataFrame ที่มีคอลัมน์ 'datetime' (UTC) แล้วคืนค่า Session ล่าสุด
    """
    if len(df) == 0 or 'datetime' not in df.columns:
        return {"session": "unknown", "score": 0.0}
        
    # แปลง string เป็น datetime (ถ้ายังเป็น string)
    last_time = pd.to_datetime(df['datetime'].iloc[-1])
    
    session = get_trading_session(last_time)
    score = get_session_score(session)
    
    return {
        "session": session,
        "score": score
    }