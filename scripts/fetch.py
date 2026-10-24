from datetime import datetime, timedelta
import os
import pandas as pd
import yfinance as yf

# สร้างโฟลเดอร์ data ถ้ายังไม่มี
os.makedirs("data", exist_ok=True)

# Yahoo Finance จำกัดข้อมูล 1h ย้อนหลังได้ไม่เกิน 730 วัน
# คำนวณช่วงเวลาให้อยู่ใน 700 วันย้อนหลังเพื่อความปลอดภัย
start_date = (datetime.now() - timedelta(days=700)).strftime("%Y-%m-%d")
end_date = datetime.now().strftime("%Y-%m-%d")

print(f"กำลังดึงข้อมูลทองคำ (GC=F) ตั้งแต่วันที่ {start_date} ถึง {end_date}...")
df = yf.download(
    "GC=F", start=start_date, end=end_date, interval="1h", progress=False
)

if not df.empty:
  # จัดการโครงสร้างคอลัมน์ (เผื่อกรณี yfinance ส่ง MultiIndex มา)
  if isinstance(df.columns, pd.MultiIndex):
    df.columns = df.columns.get_level_values(0)

  # จัดการ Timezone เป็นเวลาไทย
  if df.index.tz is None:
    df.index = df.index.tz_localize("UTC").tz_convert("Asia/Bangkok")
  else:
    df.index = df.index.tz_convert("Asia/Bangkok")

  # บันทึกไฟล์ลงใน data/XAUUSD_H1.csv
  output_file = "data/XAUUSD_H1.csv"
  df.to_csv(output_file)
  print(f"บันทึกสำเร็จเรียบร้อยที่: {output_file} (จำนวน {len(df)} แถว)")
else:
  print("ไม่พบข้อมูล กรุณาตรวจสอบการเชื่อมต่อ")