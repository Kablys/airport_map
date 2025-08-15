from __future__ import annotations
from typing import Any
from ..utils.http import get_json

BASE = 'https://api.open-elevation.com/api/v1/lookup'


def elevation(lat: float, lon: float) -> float | None:
	data = get_json(BASE, params={'locations': f'{lat},{lon}'})
	results = data.get('results') if isinstance(data, dict) else None
	if results:
		try:
			return float(results[0]['elevation'])
		except Exception:
			return None
	return None