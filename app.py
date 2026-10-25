from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import os
import pandas as pd
import requests
from datetime import datetime, timezone, timedelta
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

# Import Engine
from src.technical.engine import compute_tech_score
from src.confluence.matrix import generate_signal
from src.data_fetcher import get_live_data

app = FastAPI(title="Confluence Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. ตั้งค่า Firebase ---
try:
    cred = credentials.Certificate("firebase_credentials.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase connected")
except Exception as e:
    print(f"⚠️ Firebase not connected: {e}")
    db = None

# --- 2. Static Files ---
if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

# --- 3. Helper: ดึงราคา M1 สำหรับตรวจผล (High/Low) ---
def get_m1_high_low(symbol="PAXGUSDT"):
    try:
        url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1m&limit=2"
        res = requests.get(url, timeout=5).json()
        # ดึงแท่งล่าสุด (index -1)
        latest_bar = res[-1]
        high = float(latest_bar[2])
        low = float(latest_bar[3])
        close = float(latest_bar[4])
        return high, low, close
    except Exception as e:
        print(f"Error fetching M1 data: {e}")
        return None, None, None

# --- 4. Scanner: ระบบสแกนสัญญาณและบันทึก (รวม Shadow Signals) ---
@app.get("/api/cron_predict")
def cron_predict():
    if not db: raise HTTPException(status_code=500, detail="Firebase not configured")
    try:
        # ดึงข้อมูล M5 ล่าสุด
        df = get_live_data(symbol="PAXGUSDT", interval="5m", limit=500)
        if df is None or df.empty: return {"status": "error", "message": "No data"}
            
        latest_window = df.iloc[-300:]
        tech = compute_tech_score(latest_window)
        signal = generate_signal("XAUUSD", latest_window['datetime'].iloc[-1], tech)
        
        current_price = float(df['close'].iloc[-1])
        atr_val = latest_window['close'].diff().abs().rolling(14).mean().iloc[-1]
        
        if pd.isna(atr_val) or atr_val == 0:
             return {"status": "skipped", "message": "ATR is zero"}

        # ==========================================
        # 🌟 ระบบตรวจสอบและบันทึก Shadow Signals
        # ==========================================
        is_shadow = False
        reject_reason = ""
        direction = "long" if tech.score > 0 else "short"

        # เช็คเงื่อนไข Super Filter
        if tech.session == "ny":
            is_shadow = True
            reject_reason = "Session NY (Filtered)"
        elif direction == "long":
            is_shadow = True
            reject_reason = "Long Signal (Filtered)"
        elif signal.grade == "A":
            is_shadow = True
            reject_reason = "Grade A (Filtered)"
        elif signal.grade not in ["A", "B"] or signal.state != "FULL_CONFLUENCE":
            return {"status": "neutral", "message": "No valid signal", "score": tech.score}

        # คำนวณ SL/TP
        if direction == "long":
            sl = current_price - (1.5 * atr_val)
            tp = current_price + (3.0 * atr_val)
        else:
            sl = current_price + (1.5 * atr_val)
            tp = current_price - (3.0 * atr_val)

        # บันทึกลง Firebase
        trade_data = {
            "timestamp_open": datetime.now(timezone.utc).isoformat(),
            "symbol": "XAUUSD",
            "type": direction,
            "grade": signal.grade,
            "entry_price": current_price,
            "sl": sl,
            "tp": tp,
            "status": "OPEN",
            "result": "PENDING",
            "r_multiple": 0.0,
            "mfe_r": 0.0,
            "mae_r": 0.0,
            "is_shadow": is_shadow,
            "reject_reason": reject_reason,
            "strategy_version": "v1.0_super_filter",
            "tech_score": tech.score,
            "eso_score": signal.eso.score
        }
        
        db.collection("trade_journal").add(trade_data)
        
        if is_shadow:
            return {"status": "success", "message": f"Shadow Signal saved ({reject_reason})", "data": trade_data}
        else:
            return {"status": "success", "message": "Real Signal saved", "data": trade_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 5. Tracker: ระบบตรวจผลลัพธ์และปิดออเดอร์ ---
@app.get("/api/cron_check_outcome")
def cron_check_outcome():
    if not db: raise HTTPException(status_code=500, detail="Firebase not configured")
    try:
        # ดึงข้อมูลไม้ที่ยัง OPEN อยู่
        open_trades = db.collection("trade_journal").where(filter=FieldFilter("status", "==", "OPEN")).stream()
        trades_list = [{"id": doc.id, **doc.to_dict()} for doc in open_trades]
        
        if not trades_list:
            return {"status": "success", "message": "No open trades to check"}

        # ดึงราคา M1
        m1_high, m1_low, m1_close = get_m1_high_low()
        if m1_high is None:
            return {"status": "error", "message": "Cannot fetch M1 price"}

        closed_count = 0
        now_utc = datetime.now(timezone.utc)

        for trade in trades_list:
            t_id = trade['id']
            direction = trade['type']
            entry = trade['entry_price']
            sl = trade['sl']
            tp = trade['tp']
            open_time = datetime.fromisoformat(trade['timestamp_open'])
            
            result = None
            exit_price = None
            
            # คำนวณระยะวิ่งสูงสุด/ต่ำสุด (MFE/MAE) ณ ปัจจุบัน
            if direction == "short":
                current_mfe = (entry - m1_low) / (sl - entry)
                current_mae = (m1_high - entry) / (sl - entry)
                
                # 🌟 Conservative: เช็ค SL ก่อน TP เสมอ
                if m1_high >= sl:
                    result, exit_price = "LOSS", sl
                elif m1_low <= tp:
                    result, exit_price = "WIN", tp
            else: # Long (Shadow)
                current_mfe = (m1_high - entry) / (entry - sl)
                current_mae = (entry - m1_low) / (entry - sl)
                
                if m1_low <= sl:
                    result, exit_price = "LOSS", sl
                elif m1_high >= tp:
                    result, exit_price = "WIN", tp

            # อัปเดต MFE/MAE สูงสุดที่เคยทำได้ (ถ้ายังไม่ปิดออเดอร์)
            new_mfe = max(trade.get('mfe_r', 0.0), current_mfe)
            new_mae = max(trade.get('mae_r', 0.0), current_mae)

            # เช็ค Timeout (3 ชั่วโมง = 180 นาที)
            if not result and (now_utc - open_time) > timedelta(minutes=180):
                result, exit_price = "TIMEOUT", m1_close

            # ถ้าจบไม้ (WIN/LOSS/TIMEOUT) ใหอัปเดต Firebase
            if result:
                if direction == "short":
                    r_mult = (entry - exit_price) / (sl - entry)
                else:
                    r_mult = (exit_price - entry) / (entry - sl)

                update_data = {
                    "status": "CLOSED",
                    "result": result,
                    "exit_price": exit_price,
                    "timestamp_close": now_utc.isoformat(),
                    "r_multiple": round(r_mult, 2),
                    "mfe_r": round(new_mfe, 2),
                    "mae_r": round(new_mae, 2)
                }
                db.collection("trade_journal").document(t_id).update(update_data)
                closed_count += 1
            else:
                # ถ้ายังไม่จบ ให้อัปเดตแค่ MFE/MAE ล่าสุด
                db.collection("trade_journal").document(t_id).update({
                    "mfe_r": round(new_mfe, 2),
                    "mae_r": round(new_mae, 2)
                })

        return {"status": "success", "checked": len(trades_list), "closed": closed_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))