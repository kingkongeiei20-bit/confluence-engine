import pandas as pd
import numpy as np
import pytest
from src.technical.volatility import (
    calculate_atr, 
    get_atr_percentile, 
    get_volatility_regime, 
    get_volatility_score
)

@pytest.fixture
def sample_ohlc_data():
    """Generate 250 bars of synthetic OHLC data."""
    np.random.seed(42)
    close = [2000 + i * 0.5 + np.random.normal(0, 2) for i in range(250)]
    high = [c + abs(np.random.normal(1, 0.5)) for c in close]
    low = [c - abs(np.random.normal(1, 0.5)) for c in close]
    return pd.DataFrame({'high': high, 'low': low, 'close': close})

def test_atr_basic(sample_ohlc_data):
    atr = calculate_atr(sample_ohlc_data)
    valid_atr = atr.dropna()
    assert len(valid_atr) > 0
    assert (valid_atr > 0).all()

def test_atr_percentile_bounds(sample_ohlc_data):
    percentile = get_atr_percentile(sample_ohlc_data)
    assert 0.0 <= percentile <= 100.0

def test_volatility_regime():
    assert get_volatility_regime(10.0) == "dead"
    assert get_volatility_regime(30.0) == "low"
    assert get_volatility_regime(50.0) == "healthy"
    assert get_volatility_regime(80.0) == "high"
    assert get_volatility_regime(95.0) == "extreme"

def test_volatility_score():
    assert get_volatility_score("healthy") == 20.0
    assert get_volatility_score("low") == 0.0
    assert get_volatility_score("high") == -20.0
    assert get_volatility_score("dead") == -60.0
    assert get_volatility_score("extreme") == -60.0