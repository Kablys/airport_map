from __future__ import annotations
from typing import Any
from ..utils.http import get_json

BASE_URL = 'https://nominatim.openstreetmap.org/search'


def geocode_city(city: str, country: str | None = None) -> dict[str, Any] | None:
    params = {
        'q': f"{city}, {country}" if country else city,
        'format': 'jsonv2',
        'addressdetails': 1,
        'extratags': 1,
        'limit': 1,
    }
    data = get_json(BASE_URL, params=params)
    return data[0] if data else None
