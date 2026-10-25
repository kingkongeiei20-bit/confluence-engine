import pandas as pd
import numpy as np
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
    
    return {
        'r_multiple': r_mult,
        'direction': direction,
        'grade': sig['grade'],
        'session': sig['session'],
        'hour': df.iloc[idx]['datetime'].hour
    }

def main():
    df = fetch_binance_data(interval="5m", total_bars=5000)
    df['atr'] = calculate_atr(df)
    
    print(f"🔍 กำลังสแกนหาสัญญาณ...")
    signals = []
    for i in range(200, len(df) - 50):
        window = df.iloc[:i+1]
        tech = compute_tech_score(window)
        sig = generate_signal("XAUUSD", window['datetime'].iloc[-1], tech)
        
        if sig.grade in ["A", "B"] and sig.state == "FULL_CONFLUENCE":
            entry_price = df.iloc[i+1]['open']
            atr_val = df['atr'].iloc[i]
            if pd.isna(atr_val) or atr_val == 0: continue
            
            direction = "long" if sig.composite_score > 0 else "short"
            sl = entry_price - (1.5 * atr_val) if direction == "long" else entry_price + (1.5 * atr_val)
            tp = entry_price + (3.0 * atr_val) if direction == "long" else entry_price - (3.0 * atr_val)
                
            signals.append({
                'index': i+1, 'direction': direction, 'entry_price': entry_price, 
                'sl': sl, 'tp': tp, 'grade': sig.grade, 'session': tech.session
            })
            i += 6 
            
    print(f"✅ พบสัญญาณ {len(signals)} ไม้\n")
    
    # ทดสอบที่ 3 ชั่วโมง (36 แท่ง) ซึ่งเป็นจุดที่ทำกำไรดีที่สุด
    hold_bars = 36 
    trades = []
    for sig in signals:
        res = simulate_holding(df, sig, hold_bars)
        if res: trades.append(res)
        
    trades_df = pd.DataFrame(trades)
    
    print("="*60)
    print(f"📊 เจาะลึก 3 ชั่วโมง (Total Trades: {len(trades_df)})")
    print("="*60)
    
    # 1. แยก Long vs Short
    print("\n🔹 Performance by Direction:")
    for d in ['long', 'short']:
        d_df = trades_df[trades_df['direction'] == d]
        if not d_df.empty:
            wr = (len(d_df[d_df['r_multiple'] > 0]) / len(d_df)) * 100
            print(f"  {d.upper():<5}: {len(d_df):>3} trades | Win: {wr:>5.1f}% | Total R: {d_df['r_multiple'].sum():>6.1f}R")

    # 2. แยก Grade A vs B
    print("\n🔹 Performance by Grade:")
    for g in ['A', 'B']:
        g_df = trades_df[trades_df['grade'] == g]
        if not g_df.empty:
            wr = (len(g_df[g_df['r_multiple'] > 0]) / len(g_df)) * 100
            print(f"  Grade {g}: {len(g_df):>3} trades | Win: {wr:>5.1f}% | Total R: {g_df['r_multiple'].sum():>6.1f}R")
            
    # 3. แยกตาม Session
    print("\n🔹 Performance by Session:")
    for s in trades_df['session'].unique():
        s_df = trades_df[trades_df['session'] == s]
        if not s_df.empty:
            wr = (len(s_df[s_df['r_multiple'] > 0]) / len(s_df)) * 100
            print(f"  {s.capitalize():<8}: {len(s_df):>3} trades | Win: {wr:>5.1f}% | Total R: {s_df['r_multiple'].sum():>6.1f}R")

if __name__ == "__main__":
    main()