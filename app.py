from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
import os
import io
import csv
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
from src.esoteric.celestial import get_celestial_score
from src.esoteric.oracle import get_oracle_score

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

# --- 2. ตั้งค่า Telegram ---
TELEGRAM_BOT_TOKEN = "8955577920:AAGYKHN_pfd0U24Abn9OML02TIcvOazE7IM"
TELEGRAM_CHAT_ID = "8987261448"

def send_telegram_alert(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID: return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML"}
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        print(f"⚠️ Telegram error: {e}")

# --- 3. Static Files ---
if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

# --- 4. Helper Functions ---
def get_m1_high_low(symbol="PAXGUSDT"):
    try:
        url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1m&limit=2"
        res = requests.get(url, timeout=5).json()
        latest_bar = res[-1]
        return float(latest_bar[2]), float(latest_bar[3]), float(latest_bar[4])
    except Exception:
        return None, None, None

# --- Models ---
class DecisionEntry(BaseModel):
    trade_id: str
    symbol: str
    action: str  # 'enter', 'skip', 'modify'
    note: Optional[str] = None

class AlertEntry(BaseModel):
    symbol: str
    price: float
    grade: str

# --- 5. API ENDPOINTS ---

@app.get("/api/signal")
def get_latest_signal(symbol: str = "XAUUSD", balance: float = 50.0, risk_pct: float = 5.0):
    try:
        # 1. ดึงข้อมูล
        df = get_live_data(symbol="PAXGUSDT", interval="5m", limit=500)
        if df is None or df.empty: raise HTTPException(status_code=500, detail="No data")
            
        latest_window = df.iloc[-300:]
        current_price = float(df['close'].iloc[-1])
        tech = compute_tech_score(latest_window)
        
        # 2. สร้าง Signal จาก Confluence Matrix
        dt_now = latest_window['datetime'].iloc[-1].to_pydatetime().replace(tzinfo=timezone.utc)
        signal = generate_signal(symbol, dt_now, tech)
        
        # 3. ดึงข้อมูล Esoteric แยกส่วน
        celestial = get_celestial_score(dt_now)
        oracle = get_oracle_score(dt_now)
        
        # 4. คำนวณ ATR, SL, TP
        atr_val = latest_window['close'].diff().abs().rolling(14).mean().iloc[-1]
        if pd.isna(atr_val) or atr_val == 0: atr_val = 1.0 # fallback
        
        direction = "short" if tech.score < 0 else "long"
        if direction == "short":
            sl = current_price + (1.5 * atr_val)
            tp = current_price - (3.0 * atr_val)
        else:
            sl = current_price - (1.5 * atr_val)
            tp = current_price + (3.0 * atr_val)

        # 5. ตรวจสอบกฎ Risk (Option B)
        allowed = True
        block_reason = ""
        
        # ถ้าเป็น Signal จริง (ไม่ใช่ Neutral) ให้เช็ค Risk
        if signal.grade in ["A", "B"]:
            # คำนวณ Lot 0.01 -> มูลค่า pip = $0.1 -> Risk = ระยะ SL (USD) * 0.1 * 100 (สำหรับ XAUUSD)
            sl_distance = abs(current_price - sl)
            est_loss_usd = sl_distance * 0.01 * 100 
            max_risk_usd = balance * (risk_pct / 100)
            
            if est_loss_usd > max_risk_usd:
                block_reason = f"Risk Warning: 0.01 Lot จะเสี่ยง ${est_loss_usd:.2f} ({est_loss_usd/balance*100:.1f}%) เกินที่ตั้งไว้ {risk_pct}%"

        return {
            "symbol": symbol,
            "current_price": current_price,
            "timestamp": dt_now.isoformat(),
            "grade": signal.grade,
            "state": signal.state,
            "composite_score": signal.composite_score,
            "tech_score": tech.score,
            "eso_score": signal.eso.score,
            "archetype": signal.eso.archetype,
            "key_levels": tech.key_levels,
            "component_scores": tech.component_scores,
            # ฟิลด์ใหม่ตาม Spec
            "planetary_day": celestial['planetary_day'].lower(),
            "planetary_score": celestial['day_score'],
            "moon_score": celestial['moon_score'],
            "coin_score": oracle['coin_score'],
            "eso_components": {
                "moon": celestial['moon_score'],
                "coin": oracle['coin_score'],
                "planetary": celestial['day_score']
            },
            "atr": float(atr_val),
            "sl": float(sl),
            "tp": float(tp),
            "allowed": allowed,
            "block_reason": block_reason
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/journal")
def get_journal():
    if not db: raise HTTPException(status_code=500, detail="Firebase not connected")
    try:
        trades_ref = db.collection("trade_journal").order_by("timestamp_open", direction=firestore.Query.DESCENDING).limit(100)
        docs = trades_ref.stream()
        trades = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            trades.append(data)
        return {"data": trades}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cron_predict")
def cron_predict():
    if not db: raise HTTPException(status_code=500, detail="Firebase not connected")
    try:
        df = get_live_data(symbol="PAXGUSDT", interval="5m", limit=500)
        if df is None or df.empty: return {"status": "error", "message": "No data"}
            
        latest_window = df.iloc[-300:]
        tech = compute_tech_score(latest_window)
        dt_now = latest_window['datetime'].iloc[-1].to_pydatetime().replace(tzinfo=timezone.utc)
        signal = generate_signal("XAUUSD", dt_now, tech)
        
        current_price = float(df['close'].iloc[-1])
        atr_val = latest_window['close'].diff().abs().rolling(14).mean().iloc[-1]
        if pd.isna(atr_val) or atr_val == 0: return {"status": "skipped", "message": "ATR is zero"}

        is_shadow = False
        reject_reason = ""
        direction = "long" if tech.score > 0 else "short"

        if tech.session == "ny":
            is_shadow, reject_reason = True, "Session NY (Filtered)"
        elif direction == "long":
            is_shadow, reject_reason = True, "Long Signal (Filtered)"
        elif signal.grade == "A":
            is_shadow, reject_reason = True, "Grade A (Filtered)"
        elif signal.grade not in ["A", "B"] or signal.state != "FULL_CONFLUENCE":
            return {"status": "neutral", "message": "No valid signal", "score": tech.score}

        if direction == "long":
            sl, tp = current_price - (1.5 * atr_val), current_price + (3.0 * atr_val)
        else:
            sl, tp = current_price + (1.5 * atr_val), current_price - (3.0 * atr_val)

        trade_data = {
            "timestamp_open": dt_now.isoformat(),
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
        
        doc_ref = db.collection("trade_journal").add(trade_data)
        
        if not is_shadow:
            alert_msg = (
                f"🚨 <b>พบสัญญาณเทรดใหม่!</b>\n\n"
                f"🪙 <b>{symbol}</b> ({direction.upper()}) | เกรด {signal.grade}\n"
                f"💰 Entry: {current_price:.2f}\n"
                f"🛑 SL: {sl:.2f}\n"
                f"🎯 TP: {tp:.2f}\n"
                f"📊 Tech Score: {tech.score:.1f}"
            )
            send_telegram_alert(alert_msg)
            
        return {"status": "success", "message": "Saved", "data": trade_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cron_check_outcome")
def cron_check_outcome():
    if not db: raise HTTPException(status_code=500, detail="Firebase not connected")
    try:
        open_trades = db.collection("trade_journal").where(filter=FieldFilter("status", "==", "OPEN")).stream()
        trades_list = [{"id": doc.id, **doc.to_dict()} for doc in open_trades]
        
        if not trades_list: return {"status": "success", "message": "No open trades"}

        m1_high, m1_low, m1_close = get_m1_high_low()
        if m1_high is None: return {"status": "error", "message": "Cannot fetch M1 price"}

        closed_count = 0
        now_utc = datetime.now(timezone.utc)

        for trade in trades_list:
            t_id, direction, entry, sl, tp = trade['id'], trade['type'], trade['entry_price'], trade['sl'], trade['tp']
            open_time = datetime.fromisoformat(trade['timestamp_open'])
            result, exit_price = None, None
            
            if direction == "short":
                current_mfe = (entry - m1_low) / (sl - entry)
                current_mae = (m1_high - entry) / (sl - entry)
                if m1_high >= sl: result, exit_price = "LOSS", sl
                elif m1_low <= tp: result, exit_price = "WIN", tp
            else:
                current_mfe = (m1_high - entry) / (entry - sl)
                current_mae = (entry - m1_low) / (entry - sl)
                if m1_low <= sl: result, exit_price = "LOSS", sl
                elif m1_high >= tp: result, exit_price = "WIN", tp

            new_mfe = max(trade.get('mfe_r', 0.0), current_mfe)
            new_mae = max(trade.get('mae_r', 0.0), current_mae)

            if not result and (now_utc - open_time) > timedelta(minutes=180):
                result, exit_price = "TIMEOUT", m1_close

            if result:
                r_mult = (entry - exit_price) / (sl - entry) if direction == "short" else (exit_price - entry) / (entry - sl)
                update_data = {
                    "status": "CLOSED", "result": result, "exit_price": exit_price,
                    "timestamp_close": now_utc.isoformat(),
                    "r_multiple": round(r_mult, 2), "mfe_r": round(new_mfe, 2), "mae_r": round(new_mae, 2)
                }
                db.collection("trade_journal").document(t_id).update(update_data)
                closed_count += 1
            else:
                db.collection("trade_journal").document(t_id).update({"mfe_r": round(new_mfe, 2), "mae_r": round(new_mae, 2)})

        return {"status": "success", "checked": len(trades_list), "closed": closed_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- API ใหม่ตาม Spec ---
@app.post("/api/decision")
def save_decision(entry: DecisionEntry):
    if not db: raise HTTPException(status_code=500, detail="Firebase not configured")
    try:
        data = entry.model_dump()
        data['timestamp'] = firestore.SERVER_TIMESTAMP
        db.collection("trade_decisions").add(data)
        return {"status": "success", "message": "Decision saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/alert")
def trigger_alert(entry: AlertEntry):
    try:
        msg = f"🔔 <b>แจ้งเตือนด้วยตัวเอง</b>\n{entry.symbol} @ {entry.price} (เกรด {entry.grade})"
        send_telegram_alert(msg)
        return {"status": "success", "message": "Alert sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export_csv")
def export_journal_csv():
    if not db: raise HTTPException(status_code=500, detail="Firebase not connected")
    try:
        trades_ref = db.collection("trade_journal").order_by("timestamp_open", direction=firestore.Query.ASCENDING)
        docs = trades_ref.stream()
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Open Time", "Close Time", "Symbol", "Type", "Grade", 
            "Entry Price", "SL", "TP", "Exit Price", "Result", 
            "R-Multiple", "MFE (R)", "MAE (R)", "Is Shadow", "Reject Reason"
        ])
        
        for doc in docs:
            d = doc.to_dict()
            writer.writerow([
                d.get("timestamp_open", ""), d.get("timestamp_close", ""), d.get("symbol", ""),
                d.get("type", ""), d.get("grade", ""), d.get("entry_price", ""),
                d.get("sl", ""), d.get("tp", ""), d.get("exit_price", ""),
                d.get("result", ""), d.get("r_multiple", 0), d.get("mfe_r", 0), d.get("mae_r", 0),
                d.get("is_shadow", False), d.get("reject_reason", "")
            ])
            
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]), media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=confluence_journal.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))