import hashlib
import random
from datetime import datetime

def get_deterministic_seed(dt: datetime) -> int:
    time_str = dt.strftime("%Y-%m-%d %H:%M")
    return int(hashlib.md5(time_str.encode()).hexdigest(), 16)

def coin_toss_99_rounds(dt: datetime) -> float:
    """
    โยนเหรียญ 99 รอบ (รอบละ 2 เหรียญ)
    HH = Buy (+1), TT = Sell (-1), HT/TH = Draw (0)
    """
    rng = random.Random(get_deterministic_seed(dt))
    buy_score = 0
    sell_score = 0
    
    for _ in range(99): # 🌟 เปลี่ยนเป็น 99 รอบ
        c1 = rng.choice(["H", "T"])
        c2 = rng.choice(["H", "T"])
        
        if c1 == "H" and c2 == "H":
            buy_score += 1
        elif c1 == "T" and c2 == "T":
            sell_score += 1
            
    net_score = buy_score - sell_score
    return (net_score / 99.0) * 100.0 # 🌟 หารด้วย 99 เพื่อ Normalize

def get_oracle_score(dt: datetime) -> dict:
    # เก็บไว้แค่เหรียญอย่างเดียว
    coin = coin_toss_99_rounds(dt)
    
    # คำนวณหาจำนวนหัวจริงๆ เพื่อส่งให้ UI
    rng = random.Random(get_deterministic_seed(dt))
    buy_score = 0
    for _ in range(99):
        c1 = rng.choice(["H", "T"])
        c2 = rng.choice(["H", "T"])
        if c1 == "H" and c2 == "H":
            buy_score += 1
            
    return {
        "composite_score": coin,
        "coin_score": coin,
        "heads": buy_score # 🌟 เพิ่มตัวนี้เข้าไป
    }