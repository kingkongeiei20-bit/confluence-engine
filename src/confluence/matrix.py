import pandas as pd
from datetime import datetime
from src.types import TechScore, EsoScore, Signal
from src.esoteric.celestial import get_celestial_score
from src.esoteric.oracle import get_oracle_score

def generate_signal(symbol: str, dt: datetime, tech: TechScore, eso_mode: str = "full") -> Signal:
    # 1. ดึงคะแนน
    celestial_data = get_celestial_score(dt)
    oracle_data = get_oracle_score(dt)
    
    c_score = celestial_data['score']
    coin = oracle_data['coin_score']

    # 2. รวมคะแนน (โหราศาสตร์ 50% + เหรียญ 50%)
    final_eso_score = (c_score * 0.5) + (coin * 0.5)
    
    eso_score = EsoScore(
        score=final_eso_score,
        archetype=f"{celestial_data['moon_phase']} + Coin:{coin:.0f}",
        confidence="medium",
        trap_warning=False,
        valid_until=dt.isoformat()
    )
    
    # 3. รวมคะแนน (Tech 60% : Eso 40%)
    composite = (tech.score * 0.6) + (eso_score.score * 0.4)
    
    state = "NEUTRAL"
    grade = "C"
    conflicts = list(tech.conflicts)

    # ==========================================
    # 🌟 SUPER FILTER v2.0 (ผ่อนปรนเงื่อนไขให้เทรดง่ายขึ้น)
    # - ลด Threshold จาก 35 เหลือ 25
    # - เปิดให้เทรดได้ทั้ง Long และ Short
    # - ไม่ห้าม Session NY
    # ==========================================
    
    if tech.score >= 25.0: # ฝั่ง Long
        if eso_score.score < -20.0: # ถ้าฤกษ์แย่มาก ให้เป็น Trap
            state = "DIVERGENCE_WARNING"
            grade = "D"
            composite *= 0.5
            eso_score.trap_warning = True
            conflicts.append("Trap Warning: Tech bullish but Eso bearish")
        else:
            state = "FULL_CONFLUENCE"
            grade = "A" if abs(composite) >= 20 else "B"
            
    elif tech.score <= -25.0: # ฝั่ง Short
        if eso_score.score > 20.0: # ถ้าฤกษ์ดีมาก ให้เป็น Trap
            state = "DIVERGENCE_WARNING"
            grade = "D"
            composite *= 0.5
            eso_score.trap_warning = True
            conflicts.append("Trap Warning: Tech bearish but Eso bullish")
        else:
            state = "FULL_CONFLUENCE"
            grade = "A" if abs(composite) >= 20 else "B"
            
    else:
        state = "NO_CONVICTION"
        grade = "C"
        composite = 0.0

    return Signal(
        symbol=symbol, timestamp=dt.isoformat(), grade=grade,
        composite_score=round(composite, 2), state=state,
        tech=tech, eso=eso_score, suggested_lot=0.0
    )