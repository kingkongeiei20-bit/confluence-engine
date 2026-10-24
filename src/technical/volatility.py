import pandas as pd
import numpy as np

def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Calculate Average True Range (ATR) using Wilder's Smoothing.
    Requires 'high', 'low', 'close' columns.
    """
    high = df['high']
    low = df['low']
    prev_close = df['close'].shift(1)
    
    # True Range = max(H-L, |H-PrevC|, |L-PrevC|)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # Wilder's Smoothing
    atr = tr.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    return atr

def get_atr_percentile(df: pd.DataFrame, atr_period: int = 14, lookback: int = 200) -> float:
    """
    Calculate the percentile rank of the current ATR over the past `lookback` periods.
    Returns 0.0 to 100.0
    """
    atr_series = calculate_atr(df, atr_period)
    
    # 🌟 เพิ่ม 2 บรรทัดนี้: ถ้า ATR เป็น 0 หรือ nan (ตลาดแบนสนิท) ให้เป็น dead ทันที (percentile = 0)
    current_atr = atr_series.iloc[-1]
    if current_atr == 0 or pd.isna(current_atr):
        return 0.0

    if len(df) < lookback:
        return 50.0  # Neutral if not enough data
        
    # Rolling window ของ ATR ย้อนหลัง
    window = atr_series.iloc[-lookback:]
    
    # หาว่า ATR ปัจจุบันอยู่ percentile ที่เท่าไหร่
    percentile = (window < current_atr).mean() * 100
    return float(percentile)

def get_volatility_regime(percentile: float) -> str:
    """
    Classify regime based on ATR percentile.
    """
    if percentile < 20:
        return "dead"
    elif percentile < 40:
        return "low"
    elif percentile <= 70:
        return "healthy"
    elif percentile <= 90:
        return "high"
    else:
        return "extreme"

def get_volatility_score(regime: str) -> float:
    """
    Convert regime to score (-100 to +100).
    Healthy = best for trading, Dead/Extreme = avoid.
    """
    if regime == "healthy":
        return 20.0
    elif regime == "low":
        return 0.0
    elif regime == "high":
        return -20.0
    else: # dead, extreme
        return -60.0