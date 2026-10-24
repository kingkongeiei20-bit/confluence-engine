import pandas as pd
import numpy as np

def calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Calculate RSI using Wilder's Smoothing.
    """
    delta = df['close'].diff()
    gain = delta.clip(lower=0)
    loss = -1 * delta.clip(upper=0)
    
    # Wilder's smoothing (EMA with alpha=1/period)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    # 🌟 เพิ่มบรรทัดนี้: ถ้าเป็น nan (ตลาดแบนสนิท) ให้ถือว่าเป็นกลาง (50)
    rsi = rsi.fillna(50.0)
    
    return rsi

def calculate_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    """
    Calculate MACD line, Signal line, and Histogram.
    """
    ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
    
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    
    return pd.DataFrame({
        'macd': macd_line,
        'macd_signal': signal_line,
        'macd_hist': histogram
    }, index=df.index)

def get_momentum_score(df: pd.DataFrame) -> float:
    """
    Combine RSI and MACD into a normalized score (-100 to +100).
    """
    if len(df) < 30:
        return 0.0  # Not enough data
        
    rsi = calculate_rsi(df).iloc[-1]
    macd_data = calculate_macd(df)
    macd_hist = macd_data['macd_hist'].iloc[-1]
    macd_hist_prev = macd_data['macd_hist'].iloc[-2]
    
    # RSI Score: Center at 50. (+50 to -50)
    rsi_score = (rsi - 50) * 2  # Scale to -100 to +100
    
    # MACD Score: Based on histogram value (soft cap)
    macd_score = np.clip(macd_hist * 10, -100, 100)
    
    # Combine: RSI (40%) + MACD (60%)
    final_score = (rsi_score * 0.4) + (macd_score * 0.6)
    
    return float(np.clip(final_score, -100, 100))