import pandas as pd
import numpy as np
import pytest
from src.technical.momentum import calculate_rsi, get_momentum_score

@pytest.fixture
def sample_data():
    """Generate 50 bars of synthetic price data (uptrend)."""
    np.random.seed(42)
    prices = [2000 + i * 2 + np.random.normal(0, 5) for i in range(50)]
    return pd.DataFrame({'close': prices})

def test_rsi_bounds(sample_data):
    """RSI must always be between 0 and 100."""
    rsi = calculate_rsi(sample_data)
    valid_rsi = rsi.dropna()
    assert (valid_rsi >= 0).all()
    assert (valid_rsi <= 100).all()
    
def test_rsi_uptrend(sample_data):
    """In a clear uptrend, RSI should be above 50."""
    rsi = calculate_rsi(sample_data)
    assert rsi.iloc[-1] > 50

def test_momentum_score_not_enough_data():
    """If data < 30 bars, return 0.0 instead of crashing."""
    df = pd.DataFrame({'close': [2000, 2001, 2002]})
    score = get_momentum_score(df)
    assert score == 0.0

def test_momentum_score_bounds(sample_data):
    """Momentum score must always be between -100 and +100."""
    score = get_momentum_score(sample_data)
    assert -100 <= score <= 100