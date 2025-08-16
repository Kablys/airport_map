from __future__ import annotations
from typing import Any
from ..utils.http import get_json


def current_weather(lat: float, lon: float) -> dict[str, Any]:
    url = 'https://api.open-meteo.com/v1/forecast'
    params = {
        'latitude': lat,
        'longitude': lon,
        'current': 'temperature_2m,precipitation,apparent_temperature,weather_code,wind_speed_10m,uv_index',
        'hourly': 'relative_humidity_2m',
        'daily': 'sunrise,sunset,uv_index_max,precipitation_sum,temperature_2m_max,temperature_2m_min',
        'timezone': 'auto',
    }
    return get_json(url, params)


def climate_normals(lat: float, lon: float) -> dict[str, Any]:
    url = 'https://climate-api.open-meteo.com/v1/climate'
    params = {
        'latitude': lat,
        'longitude': lon,
        'monthly': 'temperature_2m_mean,temperature_2m_min,temperature_2m_max,precipitation_sum',
    }
    return get_json(url, params)
