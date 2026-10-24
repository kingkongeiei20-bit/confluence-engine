import pandas as pd
from src.backtest.runner import run_backtest

def main():
    file_path = "data/XAUUSD_H1.csv"
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"❌ โหลดไฟล์ไม่สำเร็จ: {e}")
        return
        
    df.columns = [col.lower() for col in df.columns]
    if 'date' in df.columns and 'datetime' not in df.columns:
        df = df.rename(columns={'date': 'datetime'})
        
    modes = ["full", "celestial", "oracle", "coin", "wheel"]
    results = []

    print("⏳ Starting A/B Test across Esoteric components... (อาจใช้เวลาสักครู่)")
    for mode in modes:
        print(f"  > กำลังทดสอบโหมด: {mode}...")
        trades = run_backtest(df, eso_mode=mode)
        
        if not trades.empty:
            win_rate = (len(trades[trades['r_multiple'] > 0]) / len(trades)) * 100
            total_r = trades['r_multiple'].sum()
            results.append({
                "Mode": mode.capitalize(),
                "Trades": len(trades),
                "Win Rate": f"{win_rate:.2f}%",
                "Total R": f"{total_r:.2f}R"
            })
        else:
            results.append({"Mode": mode.capitalize(), "Trades": 0, "Win Rate": "0%", "Total R": "0R"})

    res_df = pd.DataFrame(results)
    print("\n" + "="*50)
    print("📊 A/B TEST RESULTS: Which Esoteric Element Works?")
    print("="*50)
    print(res_df.to_string(index=False))
    print("="*50)

if __name__ == "__main__":
    main()