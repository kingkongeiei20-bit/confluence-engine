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
    # 🌟 SUPER FILTER (ผลลัพธ์จาก Backtest)
    # ==========================================
    
    # กฎที่ 1: ห้ามเทรดช่วง New York (ตลาดเหวี่ยงเกินไป)
    if tech.session == "ny":
        return Signal(
            symbol=symbol, timestamp=dt.isoformat(), grade="C", 
            composite_score=0.0, state="NO_CONVICTION", 
            tech=tech, eso=eso_score, suggested_lot=0.0
        )

    # กฎที่ 2: ห้ามเทรดฝั่ง Long (จากผลทดสอบฝั่ง Long ขาดทุนหนัก)
    if tech.score >= 35.0:
        return Signal(
            symbol=symbol, timestamp=dt.isoformat(), grade="C", 
            composite_score=0.0, state="NO_CONVICTION", 
            tech=tech, eso=eso_score, suggested_lot=0.0
        )

    # กฎที่ 3: เทรดเฉพาะฝั่ง Short และต้องเป็น Grade B เท่านั้น
    elif tech.score <= -35.0:
        # เช็คเงื่อนไข Trap Warning ก่อน
        if eso_score.score > 20.0:
            state = "DIVERGENCE_WARNING"
            grade = "D"
            composite *= 0.5
            eso_score.trap_warning = True
            conflicts.append("Trap Warning: Tech bearish but Eso bullish")
        else:
            # ถ้าไม่ติด Trap ให้เป็น Grade B (ตัด Grade A ออกตามผล Backtest)
            state = "FULL_CONFLUENCE"
            grade = "B"
            
    # กฎที่ 4: ถ้าคะแนน Tech ไม่ชัดเจน ให้เป็น Neutral
    else:
        state = "NO_CONVICTION"
        grade = "C"
        composite = 0.0
        
    # ==========================================

    return Signal(
        symbol=symbol, timestamp=dt.isoformat(), grade=grade,
        composite_score=round(composite, 2), state=state,
        tech=tech, eso=eso_score, suggested_lot=0.0
    )