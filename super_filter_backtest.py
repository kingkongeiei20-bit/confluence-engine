import pandas as pd
import requests
from src.technical.engine import compute_tech_score
from src.technical.volatility import calculate_atr
from src.confluence.matrix import generate_signal

def fetch_binance_data(symbol="PAXGUSDT", interval="5m", total_bars=5000):
    print(f"📥 กำลังดึงข้อมูล...")
    all_data = []
    end_time = None
    while len(all_data) < total_bars:
        limit = min(1000, total_bars - len(all_data))
        url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
        if end_time: url += f"&endTime={end_time}"
        res = requests.get(url).json()
        if not res: break
        all_data = res + all_data
        end_time = res[0][0] - 1 
        
    df = pd.DataFrame(all_data, columns=['open_time', 'open', 'high', 'low', 'close', 'volume', 'close_time', 'qav', 'num_trades', 'taker_base', 'taker_quote', 'ignore'])
    df['datetime'] = pd.to_datetime(df['open_time'], unit='ms')
    for col in ['open', 'high', 'low', 'close', 'volume']: df[col] = df[col].astype(float)
    df = df[df['datetime'].dt.day_of_week < 5].copy()
    df = df.drop_duplicates(subset=['open_time']).sort_values('open_time')
    return df[['datetime', 'open', 'high', 'low', 'close', 'volume']].reset_index(drop=True)

def simulate_holding(df, sig, hold_bars):
    idx = sig['index']
    if idx + hold_bars >= len(df): return None
        
    entry_price, direction, sl, tp = sig['entry_price'], sig['direction'], sig['sl'], sig['tp']
    exit_price = None
    
    for j in range(idx + 1, idx + 1 + hold_bars):
        bar = df.iloc[j]
        if direction == "long":
            if bar['low'] <= sl: exit_price = sl; break
            elif bar['high'] >= tp: exit_price = tp; break
        else:
            if bar['high'] >= sl: exit_price = sl; break
            elif bar['low'] <= tp: exit_price = tp; break
                
    if exit_price is None: exit_price = df.iloc[idx + hold_bars]['close']
        
    r_mult = (exit_price - entry_price) / (entry_price - sl) if direction == "long" else (entry_price - exit_price) / (sl - entry_price)
    return {'r_multiple': r_mult}

def main():
    df = fetch_binance_data(interval="5m", total_bars=5000)
    df['atr'] = calculate_atr(df)
    
    print(f"🔍 กำลังสแกนหาสัญญาณ (พร้อมกรอง)...")
    signals = []
    for i in range(200, len(df) - 50):
        window = df.iloc[:i+1]
        tech = compute_tech_score(window)
        sig = generate_signal("XAUUSD", window['datetime'].iloc[-1], tech)
        
        # 🌟 THE SUPER FILTER 🌟
        # 1. เอาเฉพาะ FULL_CONFLUENCE
        if sig.grade in ["A", "B"] and sig.state == "FULL_CONFLUENCE":
            direction = "long" if sig.composite_score > 0 else "short"
            
            # 2. ห้าม Long เอาแค่ Short
            if direction == "long": continue
            
            # 3. ห้าม Grade A เอาแค่ Grade B
            if sig.grade == "A": continue
            
            # 4. ห้าม Session NY
            if tech.session == "ny": continue
            
            # ถ้าผ่านทุกเงื่อนไข ให้คำนวณ SL/TP
            entry_price = df.iloc[i+1]['open']
            atr_val = df['atr'].iloc[i]
            if pd.isna(atr_val) or atr_val == 0: continue
            
            sl = entry_price + (1.5 * atr_val) # Short: SL อยู่ข้างบน
            tp = entry_price - (3.0 * atr_val) # Short: TP อยู่ข้างล่าง
                
            signals.append({
                'index': i+1, 'direction': direction, 'entry_price': entry_price, 
                'sl': sl, 'tp': tp
            })
            i += 6 
            
    print(f"✅ พบสัญญาณที่ผ่านการกรอง: {len(signals)} ไม้\n")
    
    if not signals: 
        print("❌ ไม่มีสัญญาณที่ผ่านเงื่อนไข")
        return

    # ทดสอบที่ 3 ชั่วโมง (36 แท่ง)
    hold_bars = 36 
    trades = []
    for sig in signals:
        res = simulate_holding(df, sig, hold_bars)
        if res: trades.append(res)
        
    trades_df = pd.DataFrame(trades)
    total_r = trades_df['r_multiple'].sum()
    win_rate = (len(trades_df[trades_df['r_multiple'] > 0]) / len(trades_df)) * 100
    
    print("="*50)
    print(f"🏆 ผลลัพธ์ SUPER FILTER (3 ชั่วโมง)")
    print("="*50)
    print(f"จำนวนไม้: {len(trades_df)}")
    print(f"Win Rate: {win_rate:.1f}%")
    print(f"Total R : {total_r:.1f}R")
    print("="*50)
    print("💡 ถ้าเริ่มด้วยพอร์ต $50 (เสี่ยง 5% = $2.5/ไม้)")
    print(f"💰 กำไรที่คาดว่าจะได้: ${total_r * 2.5:.2f}")

if __name__ == "__main__":
    main()