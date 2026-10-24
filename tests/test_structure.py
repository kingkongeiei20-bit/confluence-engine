import pandas as pd
import numpy as np
import pytest
from src.technical.structure import find_swing_points, get_market_structure_score

@pytest.fixture
def uptrend_data():
    """
    สร้างกราฟขาขึ้นแบบมีลูกคลื่นชัดเจน (HH, HL)
    High: ขึ้น-ลง-ขึ้น-ลง (แต่ยอดใหม่สูงกว่าเดิม)
    Low:  ขึ้น-ลง-ขึ้น-ลง (แต่ก้นใหม่สูงกว่าเดิม)
    """
    high = [10, 15, 12, 20, 18, 25, 22, 30, 28, 35]
    low =  [ 8, 12, 10, 15, 14, 20, 18, 25, 23, 30]
    close = [(h+l)/2 for h,l in zip(high, low)]
    return pd.DataFrame({'high': high, 'low': low, 'close': close})

@pytest.fixture
def downtrend_data():
    """
    สร้างกราฟขาลงแบบมีลูกคลื่นชัดเจน (LH, LL)
    """
    high = [35, 30, 32, 25, 28, 20, 22, 15, 18, 10]
    low =  [30, 25, 27, 20, 23, 15, 17, 10, 13,  5]
    close = [(h+l)/2 for h,l in zip(high, low)]
    return pd.DataFrame({'high': high, 'low': low, 'close': close})

def test_swing_points_detection(uptrend_data):
    swings = find_swing_points(uptrend_data, window=1)
    # ต้องเจอ Swing High และ Swing Low อย่างน้อยอย่างละ 1 จุด
    assert swings['is_swing_high'].any()
    assert swings['is_swing_low'].any()

def test_uptrend_structure(uptrend_data):
    score, label = get_market_structure_score(uptrend_data, window=1)
    assert score == 100.0
    assert label == "bullish"

def test_downtrend_structure(downtrend_data):
    score, label = get_market_structure_score(downtrend_data, window=1)
    assert score == -100.0
    assert label == "bearish"

def test_not_enough_data():
    df = pd.DataFrame({'high': [10, 11], 'low': [9, 10], 'close': [9.5, 10.5]})
    score, label = get_market_structure_score(df, window=5)
    assert score == 0.0
    assert label == "neutral"