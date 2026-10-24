import pandas as pd
import numpy as np
from typing import Tuple

def find_swing_points(df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    """
    Identify confirmed Swing Highs and Swing Lows.
    A point is confirmed if it's the highest/lowest in a rolling window 
    AFTER the window has passed (no look-ahead bias).
    """
    # สร้าง rolling window เพื่อหาจุดสูงสุด/ต่ำสุด
    rolling_max = df['high'].rolling(window=window*2+1, center=True).max()
    rolling_min = df['low'].rolling(window=window*2+1, center=True).min()
    
    # Swing High: จุดที่ High เท่ากับ rolling max
    is_swing_high = (df['high'] == rolling_max)
    # Swing Low: จุดที่ Low เท่ากับ rolling min
    is_swing_low = (df['low'] == rolling_min)
    
    # ล้างค่า True ที่อยู่ใกล้ขอบขวาสุดออก (เพราะยังไม่ยืนยัน)
    is_swing_high.iloc[-window:] = False
    is_swing_low.iloc[-window:] = False
    
    return pd.DataFrame({
        'is_swing_high': is_swing_high,
        'is_swing_low': is_swing_low
    }, index=df.index)

def get_market_structure_score(df: pd.DataFrame, window: int = 5) -> Tuple[float, str]:
    """
    Analyze the last few swing points to determine trend.
    Returns: (score -100 to +100, trend_label)
    """
    if len(df) < (window * 4):
        return 0.0, "neutral"  # ข้อมูลไม่พอ
        
    swings = find_swing_points(df, window)
    
    # ดึงราคาของ Swing High และ Swing Low ล่าสุด (เอา 3 จุดหลังสุด)
    last_highs = df.loc[swings['is_swing_high'], 'high'].tail(3).values
    last_lows = df.loc[swings['is_swing_low'], 'low'].tail(3).values
    
    # ถ้าหาจุดไม่ได้พอ ให้เป็นกลางไว้ก่อน
    if len(last_highs) < 2 or len(last_lows) < 2:
        return 0.0, "neutral"
        
    # ตรวจสอบรูปแบบ (Pattern Matching)
    # 1. Higher High (HH) & Higher Low (HL) -> Uptrend
    is_hh = last_highs[-1] > last_highs[-2]
    is_hl = last_lows[-1] > last_lows[-2]
    
    # 2. Lower High (LH) & Lower Low (LL) -> Downtrend
    is_lh = last_highs[-1] < last_highs[-2]
    is_ll = last_lows[-1] < last_lows[-2]
    
    if is_hh and is_hl:
        return 100.0, "bullish"
    elif is_lh and is_ll:
        return -100.0, "bearish"
    else:
        return 0.0, "neutral" # สับสน, Sideway, หรือ Double Top/Bottom