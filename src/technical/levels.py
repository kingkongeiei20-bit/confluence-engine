import pandas as pd
import numpy as np
from src.technical.structure import find_swing_points
from src.technical.volatility import calculate_atr

def get_round_numbers(current_price: float, step: float = 50.0) -> list:
    """
    หาเลขกลม (Round Numbers) ที่ใกล้ราคาปัจจุบัน
    สำหรับ XAUUSD ใช้ step=50 (เช่น 2000, 2050, 2100)
    """
    base = int(current_price / step) * step
    return [base - step, base, base + step, base + 2*step]

def get_nearest_levels(df: pd.DataFrame, window: int = 5) -> dict:
    """
    หาแนวรับและแนวต้านที่ใกล้ที่สุด
    """
    current_close = df['close'].iloc[-1]
    
    # 1. หา Swing Points
    swings = find_swing_points(df, window)
    swing_highs = df.loc[swings['is_swing_high'], 'high'].values
    swing_lows = df.loc[swings['is_swing_low'], 'low'].values
    
    # 2. หา Round Numbers
    round_nums = get_round_numbers(current_close)
    
    # รวม Level ทั้งหมด
    all_levels = np.concatenate([swing_highs, swing_lows, round_nums])
    
    # แยกเป็นแนวต้าน (เหนือราคา) และแนวรับ (ใต้ราคา)
    resistances = [lvl for lvl in all_levels if lvl > current_close]
    supports = [lvl for lvl in all_levels if lvl < current_close]
    
    # หาตัวที่ใกล้ที่สุด (ถ้าไม่มีให้ใช้ค่า default)
    nearest_res = min(resistances) if resistances else current_close * 1.01
    nearest_sup = max(supports) if supports else current_close * 0.99
    
    return {
        "resistance": float(nearest_res),
        "support": float(nearest_sup),
        "current": float(current_close)
    }

def get_levels_score(df: pd.DataFrame, window: int = 5) -> float:
    """
    คำนวณคะแนนจากระยะห่างของราคากับแนวรับ/แนวต้าน (-100 ถึง +100)
    """
    if len(df) < 15:
        return 0.0
        
    levels = get_nearest_levels(df, window)
    atr = calculate_atr(df).iloc[-1]
    
    # 🌟 เพิ่มบรรทัดนี้ เพื่อป้องกันการหารด้วยศูนย์ (ตลาดแบนสนิท)
    if atr == 0 or pd.isna(atr):
        return 0.0
        
    current = levels['current']
    res = levels['resistance']
    sup = levels['support']
    
    dist_to_res = (res - current) / atr
    dist_to_sup = (current - sup) / atr
    
    score = 0.0
    
    if dist_to_res < 0.5:
        score -= 50.0
    elif dist_to_res < 1.0:
        score -= 20.0
        
    if dist_to_sup < 0.5:
        score += 50.0
    elif dist_to_sup < 1.0:
        score += 20.0
        
    return float(np.clip(score, -100, 100))