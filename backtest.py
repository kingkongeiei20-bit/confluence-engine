import pandas as pd
import sys
from src.backtest.runner import run_backtest, print_summary

def main():
    file_path = "data/XAUUSD_H1.csv"
    print(f"📥 กำลังโหลดข้อมูลจาก: {file_path}")
    
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"❌ โหลดไฟล์ไม่สำเร็จ: {e}")
        sys.exit(1)
        
    # 🔍 เช็คชื่อคอลัมน์ (บางที yfinance จะตั้งชื่อเป็นตัวใหญ่)
    df.columns = [col.lower() for col in df.columns]
    if 'date' in df.columns and 'datetime' not in df.columns:
        df = df.rename(columns={'date': 'datetime'})
        
    print(f"✅ โหลดข้อมูลสำเร็จ: {len(df)} แท่ง")
    
    print("⏳ กำลังรัน Backtest... (อาจใช้เวลาสักครู่)")
    trades = run_backtest(df)
    
    print_summary(trades)
    
    # เซฟผลลัพธ์เป็น CSV (เผื่ออยากเอาไปดูใน Excel)
    if not trades.empty:
        trades.to_csv("data/backtest_results.csv", index=False)
        print("💾 เซฟผลลัพธ์ลง data/backtest_results.csv แล้ว")

if __name__ == "__main__":
    main()