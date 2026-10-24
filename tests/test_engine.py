import pandas as pd
import numpy as np
import pytest
from src.technical.engine import compute_tech_score

@pytest.fixture
def bullish_data():
    """สร้างข้อมูลขาขึ้นที่สมบูรณ์แบบ (Trend up, Volatility healthy)"""
    np.random.seed(42)
    # เริ่มที่ 2000 ไต่ขึ้นไป 2100 แบบช้าๆ (ไม่มีสไปค์)
    close = np.linspace(2000, 2100, 50)
    high = close + 2
    low = close - 2
    # สร้าง datetime ช่วง London (เทรดดี)
    dt = pd.date_range("2024-01-01 08:00:00", periods=50, freq="h")
    
    return pd.DataFrame({
        'datetime': dt,
        'open': close - 1,
        'high': high,
        'low': low,
        'close': close,
        'volume': [100] * 50
    })

def test_engine_basic_run(bullish_data):
    result = compute_tech_score(bullish_data)
    
    # ตรวจสอบว่าคืนค่าครบตาม Data Class
    assert isinstance(result.score, float)
    assert result.direction in ["bullish", "bearish", "neutral"]
    assert result.regime in ["dead", "low", "healthy", "high", "extreme"]
    assert "structure" in result.component_scores

def test_engine_not_enough_data():
    # ข้อมูล 10 แท่ง
    df = pd.DataFrame({'close': range(10), 'high': range(10), 'low': range(10)})
    result = compute_tech_score(df)
    assert result.score == 0.0
    assert "Not enough data" in result.conflicts

def test_engine_dead_regime_veto(bullish_data):
    # บังคับให้ ATR เป็น 0 (ตลาดนิ่งสนิท) เพื่อให้ได้ Regime = dead
    df = bullish_data.copy()
    df['high'] = 2000.0
    df['low'] = 2000.0
    df['close'] = 2000.0
    
    result = compute_tech_score(df)
    assert result.score == 0.0
    assert "No-Trade Zone" in result.conflicts[0]