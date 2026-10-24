import pandas as pd
from typing import Dict
from src.types import TechScore
from src.technical.structure import get_market_structure_score
from src.technical.momentum import get_momentum_score
from src.technical.levels import get_levels_score, get_nearest_levels
from src.technical.volatility import get_atr_percentile, get_volatility_regime, get_volatility_score
from src.technical.session import analyze_current_session

def compute_tech_score(df: pd.DataFrame) -> TechScore:
    """
    คำนวณ TechScore รวมจากทุก Indicator ย่อย
    """
    if len(df) < 30:
        # ข้อมูลไม่พอ ให้เป็นกลาง
        return TechScore(
            score=0.0, direction="neutral", regime="unknown", 
            volatility_percentile=50.0, session="unknown", 
            tf_alignment={}, key_levels={}, conflicts=["Not enough data"]
        )
        
    # 1. ดึงคะแนนจากแต่ละส่วน
    struct_score, trend = get_market_structure_score(df)
    mom_score = get_momentum_score(df)
    lvl_score = get_levels_score(df)
    
    atr_pct = get_atr_percentile(df)
    regime = get_volatility_regime(atr_pct)
    vol_score = get_volatility_score(regime)
    
    session_data = analyze_current_session(df)
    sess_score = session_data['score']
    session_name = session_data['session']
    
    # 2. รวมคะแนนตามน้ำหนัก (Weight) 
    # น้ำหนักจาก Spec (รวม 5 ตัวที่ทำได้ = 80% แล้ว Normalize ให้เต็ม 100)
    weights = {
        "structure": 25 / 80,
        "momentum": 20 / 80,
        "levels": 15 / 80,
        "volatility": 15 / 80,
        "session": 5 / 80
    }
    
    composite = (
        (struct_score * weights["structure"]) +
        (mom_score * weights["momentum"]) +
        (lvl_score * weights["levels"]) +
        (vol_score * weights["volatility"]) +
        (sess_score * weights["session"])
    )

    if pd.isna(composite):
        composite = 0.0
    
    # 3. กฎเหล็ก (Veto Rules)
    conflicts = []
    
    # ถ้าตลาด Dead หรือ Extreme ผันผวนเกินไป -> ห้ามเทรด
    if regime in ["dead", "extreme"]:
        composite = 0.0
        conflicts.append(f"Regime {regime} detected: No-Trade Zone")
        
    # ถ้า Session เป็น Dead -> ลดคะแนนลง 50% (ไม่ห้ามเทรดแต่ให้ระวัง)
    if session_name == "dead":
        composite *= 0.5
        conflicts.append("Dead session: Low liquidity")
        
    # 4. สรุปทิศทาง
    if composite > 20:
        direction = "bullish"
    elif composite < -20:
        direction = "bearish"
    else:
        direction = "neutral"
        
    # 5. ดึงข้อมูล Levels และ TF Alignment
    key_levels = get_nearest_levels(df)
    
    # จำลอง TF Alignment (ของจริงต้องเช็ค D1/H4/H1)
    tf_alignment = {"H1": trend} 
    
    return TechScore(
        score=round(float(composite), 2),
        direction=direction,
        regime=regime,
        volatility_percentile=atr_pct,
        session=session_name,
        tf_alignment=tf_alignment,
        key_levels=key_levels,
        conflicts=conflicts,
        component_scores={
            "structure": struct_score,
            "momentum": mom_score,
            "levels": lvl_score,
            "volatility": vol_score,
            "session": sess_score
        }
    )