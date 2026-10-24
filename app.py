from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import os
import pandas as pd

# 1. Import Engine
from src.technical.engine import compute_tech_score
from src.confluence.matrix import generate_signal
from src.data_fetcher import get_live_data

# 2. Import Firebase
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI(title="Confluence Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. ตั้งค่า Firebase
try:
    # โหลดไฟล์ JSON ที่คุณเพิ่งเปลี่ยนชื่อ
    cred = credentials.Certificate("firebase_credentials.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase connected") # 🌟 ถ้าขึ้นบรรทัดนี้ใน Terminal แปลว่าสำเร็จ
except Exception as e:
    print(f"⚠️ Firebase not connected: {e}")
    db = None

# 4. Static Files (หน้าบ้าน)
if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

# 5. โมเดลสำหรับรับข้อมูลจากหน้าบ้าน
class JournalEntry(BaseModel):
    symbol: str
    grade: str
    action: str
    price: float
    note: Optional[str] = None

# 6. API Endpoints
@app.get("/api/signal")
def get_latest_signal(symbol: str = "XAUUSD"):
    try:
        df = get_live_data(symbol="PAXGUSDT", interval="1h", limit=500)
        if df is None or df.empty:
            raise HTTPException(status_code=500, detail="ไม่สามารถดึงข้อมูลราคาได้")

        latest_window = df.iloc[-300:]
        tech = compute_tech_score(latest_window)
        signal = generate_signal(symbol, latest_window['datetime'].iloc[-1], tech)
        
        return {
            "symbol": symbol,
            "current_price": float(df['close'].iloc[-1]),
            "timestamp": latest_window['datetime'].iloc[-1].strftime("%Y-%m-%d %H:%M"),
            "grade": signal.grade,
            "state": signal.state,
            "composite_score": signal.composite_score,
            "tech_score": tech.score,
            "eso_score": signal.eso.score,
            "archetype": signal.eso.archetype,
            "key_levels": tech.key_levels,
            "component_scores": tech.component_scores
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/journal")
def save_journal(entry: JournalEntry):
    if not db:
        raise HTTPException(status_code=500, detail="Firebase not configured")
    try:
        data = entry.model_dump()
        data['timestamp'] = firestore.SERVER_TIMESTAMP
        db.collection("trade_journal").add(data)
        return {"status": "success", "message": "บันทึกเรียบร้อย"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))