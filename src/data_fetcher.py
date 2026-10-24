import requests
import pandas as pd
import time
from datetime import datetime

# ตัวแปรสำหรับ Cache
_cached_data = None
_last_fetch_time = 0
CACHE_TTL = 60  # วินาที (1 นาที)

def get_live_data(symbol="PAXGUSDT", interval="1h", limit=500):
    """
    ดึงข้อมูลจาก Binance และคัดกรองวันเสาร์-อาทิตย์ออก
    """
    global _cached_data, _last_fetch_time
    
    # 1. เช็ค Cache ก่อน (ถ้าดึงไม่เกิน 1 นาที ให้ใช้ของเดิม)
    if _cached_data is not None and (time.time() - _last_fetch_time) < CACHE_TTL:
        return _cached_data

    # 2. ยิง API ไปที่ Binance
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        raw_data = response.json()
    except Exception as e:
        print(f"⚠️ ดึงข้อมูล Binance ไม่สำเร็จ: {e}")
        # ถ้าดึงไม่ได้ให้ใช้ Cache เก่าไปก่อน (ถ้ามี)
        return _cached_data 

    # 3. แปลงข้อมูลเป็น DataFrame
    df = pd.DataFrame(raw_data, columns=[
        'open_time', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'qav', 'num_trades', 'taker_base', 'taker_quote', 'ignore'
    ])
    
    # 4. Clean Data
    df['datetime'] = pd.to_datetime(df['open_time'], unit='ms')
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)
        
    # 🌟 คัดกรองวันเสาร์ (5) และอาทิตย์ (6) ออก
    df = df[df['datetime'].dt.dayofweek < 5].copy()
    
    # เก็บเฉพาะคอลัมน์ที่ต้องใช้
    df = df[['datetime', 'open', 'high', 'low', 'close', 'volume']]
    
    # 5. อัปเดต Cache
    _cached_data = df
    _last_fetch_time = time.time()
    
    return df