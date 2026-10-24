from datetime import datetime
import pytest
from src.esoteric.celestial import get_celestial_score, get_moon_phase_score, get_planetary_day_score

def test_moon_phase():
    # 2024-01-11 เป็นช่วง New Moon
    dt = datetime(2024, 1, 11, 12, 0)
    result = get_moon_phase_score(dt)
    assert result["phase"] == "New Moon"
    assert result["score"] == 40.0

def test_planetary_day():
    # 2024-01-14 เป็นวันอาทิตย์ (Sun)
    dt = datetime(2024, 1, 14, 12, 0)
    result = get_planetary_day_score(dt)
    assert result["planet"] == "Sun"
    assert result["score"] == 70.0

def test_celestial_composite():
    dt = datetime(2024, 1, 14, 12, 0) # Sun day + New Moon (Close enough)
    result = get_celestial_score(dt)
    assert "score" in result
    assert -100 <= result["score"] <= 100