import pandas as pd
import numpy as np
from src.technical.engine import compute_tech_score
from src.technical.volatility import calculate_atr
from src.confluence.matrix import generate_signal

def run_backtest(df: pd.DataFrame, eso_mode: str = "full") -> pd.DataFrame:
    df = df.copy()
    df['datetime'] = pd.to_datetime(df['datetime'])
    df = df.sort_values('datetime').reset_index(drop=True)
    df['atr'] = calculate_atr(df)
    
    trades = []
    
    # 🌟 เปลี่ยนเป็น while loop เพื่อให้ข้ามแท่งได้จริง
    i = 200
    while i < len(df) - 1:
        window = df.iloc[:i+1]
        tech = compute_tech_score(window)
        current_dt = window['datetime'].iloc[-1]
        signal = generate_signal("XAUUSD", current_dt, tech, eso_mode)
        
        direction = None
        if signal.grade in ["A", "B"] and signal.state == "FULL_CONFLUENCE":
            if signal.composite_score > 0:
                direction = "long"
            elif signal.composite_score < 0:
                direction = "short"
            
        if direction:
            entry_bar = df.iloc[i+1]
            entry_price = entry_bar['open']
            entry_time = entry_bar['datetime']
            
            atr_val = df['atr'].iloc[i]
            if pd.isna(atr_val) or atr_val == 0:
                i += 1
                continue
                
            if direction == "long":
                sl = entry_price - (1.5 * atr_val)
                tp = entry_price + (3.0 * atr_val)
            else:
                sl = entry_price + (1.5 * atr_val)
                tp = entry_price - (3.0 * atr_val)
                
            exit_price = None
            exit_time = None
            result = None
            exit_bar_idx = i + 1
            
            for j in range(i+1, min(i+49, len(df))):
                bar = df.iloc[j]
                if direction == "long":
                    if bar['low'] <= sl:
                        exit_price, exit_time, result = sl, bar['datetime'], "loss"
                        exit_bar_idx = j
                        break
                    elif bar['high'] >= tp:
                        exit_price, exit_time, result = tp, bar['datetime'], "win"
                        exit_bar_idx = j
                        break
                else:
                    if bar['high'] >= sl:
                        exit_price, exit_time, result = sl, bar['datetime'], "loss"
                        exit_bar_idx = j
                        break
                    elif bar['low'] <= tp:
                        exit_price, exit_time, result = tp, bar['datetime'], "win"
                        exit_bar_idx = j
                        break
                        
            if exit_price is None:
                exit_bar_idx = min(i+48, len(df)-1)
                exit_price = df.iloc[exit_bar_idx]['close']
                exit_time = df.iloc[exit_bar_idx]['datetime']
                result = "timeout"
                
            if direction == "long":
                r_mult = (exit_price - entry_price) / (entry_price - sl)
            else:
                r_mult = (entry_price - exit_price) / (sl - entry_price)
                
            trades.append({
                "entry_time": entry_time,
                "exit_time": exit_time,
                "direction": direction,
                "entry": entry_price,
                "exit": exit_price,
                "sl": sl,
                "tp": tp,
                "result": result,
                "r_multiple": r_mult,
                "score": signal.composite_score,
                "grade": signal.grade
            })
            
            # 🌟 กระโดดข้ามไปที่แท่งที่ออเดอร์จบแล้ว (ห้ามเปิดซ้อน)
            i = exit_bar_idx + 1
        else:
            i += 1
            
    return pd.DataFrame(trades)

def print_summary(trades_df: pd.DataFrame):
    if trades_df.empty:
        print("❌ ไม่มีสัญญาณเทรดที่ผ่านเงื่อนไข")
        return
        
    total = len(trades_df)
    wins = len(trades_df[trades_df['r_multiple'] > 0])
    win_rate = (wins / total) * 100
    avg_r = trades_df['r_multiple'].mean()
    
    print(f"\n{'='*40}")
    print(f"📊 Confluence Backtest (Total: {total} trades)")
    print(f"{'='*40}")
    print(f"Win Rate:     {win_rate:.2f}%")
    print(f"Avg R-Mult:   {avg_r:.2f}R")
    print(f"Total R:      {trades_df['r_multiple'].sum():.2f}R")
    print(f"{'='*40}")
    
    for grade in ["A", "B"]:
        g_df = trades_df[trades_df['grade'] == grade]
        if not g_df.empty:
            g_wins = len(g_df[g_df['r_multiple'] > 0])
            g_wr = (g_wins / len(g_df)) * 100
            g_r = g_df['r_multiple'].sum()
            print(f"Grade {grade}: {len(g_df):>3} trades | Win: {g_wr:>5.1f}% | Total R: {g_r:>6.1f}R")
    print(f"{'='*40}\n")