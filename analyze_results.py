import pandas as pd

def analyze():
    try:
        df = pd.read_csv("data/backtest_results.csv")
    except FileNotFoundError:
        print("❌ ไม่พบไฟล์ data/backtest_results.csv กรุณารัน backtest.py ก่อน")
        return

    print(f"{'='*50}")
    print(f"📊 DEEP DIVE ANALYSIS (Total: {len(df)} trades)")
    print(f"{'='*50}")

    # 1. แยกผลตามทิศทาง (Long vs Short)
    print("\n🔹 Performance by Direction:")
    for direction in ['long', 'short']:
        d_df = df[df['direction'] == direction]
        if not d_df.empty:
            win_rate = (len(d_df[d_df['r_multiple'] > 0]) / len(d_df)) * 100
            total_r = d_df['r_multiple'].sum()
            print(f"  {direction.upper():<5}: {len(d_df):>3} trades | Win: {win_rate:>5.1f}% | Total R: {total_r:>6.1f}R")

    # 2. แยกผลตามระดับคะแนน (Score)
    print("\n🔹 Performance by Score Threshold:")
    bins = [40, 45, 50, 55, 60, 100]
    labels = ['40-44', '45-49', '50-54', '55-59', '60+']
    df['score_bin'] = pd.cut(df['score'].abs(), bins=bins, labels=labels)
    
    for label in labels:
        b_df = df[df['score_bin'] == label]
        if not b_df.empty:
            win_rate = (len(b_df[b_df['r_multiple'] > 0]) / len(b_df)) * 100
            total_r = b_df['r_multiple'].sum()
            print(f"  Score {label:<5}: {len(b_df):>3} trades | Win: {win_rate:>5.1f}% | Total R: {total_r:>6.1f}R")

    # 3. สรุปสาเหตุที่จบออเดอร์ (Win/Loss/Timeout)
    print("\n🔹 Exit Reasons:")
    print(df['result'].value_counts().to_string())
    
    print(f"\n{'='*50}")

if __name__ == "__main__":
    analyze()