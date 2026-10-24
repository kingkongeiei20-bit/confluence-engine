import pandas as pd
import numpy as np
import pytest
from src.technical.levels import get_round_numbers, get_levels_score

def test_round_numbers():
    rounds = get_round_numbers(2045.0, step=50.0)
    assert 2000.0 in rounds
    assert 2050.0 in rounds
    assert 2100.0 in rounds

@pytest.fixture
def data_near_resistance():
    """ข้อมูล 15 แท่ง วิ่งเข้าหาแนวต้านที่ 2100"""
    high = [2050, 2060, 2070, 2080, 2090, 2100, 2090, 2080, 2070, 2080, 2090, 2095, 2098, 2099, 2098]
    low  = [2040, 2050, 2060, 2070, 2080, 2085, 2080, 2070, 2060, 2070, 2080, 2085, 2090, 2092, 2095]
    close = [2045, 2055, 2065, 2075, 2085, 2092, 2085, 2075, 2065, 2075, 2085, 2090, 2094, 2095, 2096]
    return pd.DataFrame({'high': high, 'low': low, 'close': close})

@pytest.fixture
def data_near_support():
    """ข้อมูล 15 แท่ง ลงมาแตะแนวรับที่ 1900 และดีดตัวขึ้นมา"""
    high = [1950, 1940, 1930, 1920, 1910, 1905, 1910, 1915, 1920, 1915, 1910, 1905, 1902, 1901, 1902]
    low  = [1940, 1930, 1920, 1910, 1900, 1895, 1900, 1905, 1910, 1905, 1890, 1895, 1900, 1901, 1901]
    close = [1945, 1935, 1925, 1915, 1905, 1900, 1905, 1910, 1915, 1910, 1895, 1900, 1901, 1902, 1902]
    return pd.DataFrame({'high': high, 'low': low, 'close': close})

def test_score_near_resistance(data_near_resistance):
    # ราคาใกล้ต้าน -> คะแนนต้องติดลบ (ห้าม Buy)
    score = get_levels_score(data_near_resistance, window=1)
    assert score < 0

def test_score_near_support(data_near_support):
    # ราคาใกล้รับ -> คะแนนต้องเป็นบวก (ห้าม Sell)
    score = get_levels_score(data_near_support, window=1)
    assert score > 0

def test_not_enough_data():
    df = pd.DataFrame({'high': [10, 11], 'low': [9, 10], 'close': [9.5, 10.5]})
    score = get_levels_score(df)
    assert score == 0.0