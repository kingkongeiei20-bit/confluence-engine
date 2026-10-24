import pandas as pd
from datetime import datetime
import pytest
from src.technical.session import get_trading_session, get_session_score, analyze_current_session

def test_trading_sessions():
    # ทดสอบเวลาแต่ละช่วง
    assert get_trading_session(datetime(2024, 1, 1, 3, 0)) == "asian"
    assert get_trading_session(datetime(2024, 1, 1, 9, 0)) == "london"
    assert get_trading_session(datetime(2024, 1, 1, 14, 0)) == "overlap"
    assert get_trading_session(datetime(2024, 1, 1, 18, 0)) == "ny"
    assert get_trading_session(datetime(2024, 1, 1, 22, 0)) == "dead"

def test_session_scores():
    assert get_session_score("overlap") == 15.0
    assert get_session_score("london") == 0.0
    assert get_session_score("ny") == 0.0
    assert get_session_score("asian") == -10.0
    assert get_session_score("dead") == -30.0

def test_analyze_current_session():
    df = pd.DataFrame({
        'datetime': ['2024-01-01 14:00:00', '2024-01-01 15:00:00']
    })
    result = analyze_current_session(df)
    assert result['session'] == "overlap"
    assert result['score'] == 15.0

def test_analyze_empty_data():
    df = pd.DataFrame()
    result = analyze_current_session(df)
    assert result['session'] == "unknown"
    assert result['score'] == 0.0