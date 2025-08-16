from __future__ import annotations
from typing import Any
from ..utils.http import get_json

BASE = 'https://date.nager.at/api/v3'


def public_holidays(country_code: str, year: int) -> list[dict[str, Any]]:
	return get_json(f"{BASE}/PublicHolidays/{year}/{country_code}")