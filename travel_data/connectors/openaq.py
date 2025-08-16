from __future__ import annotations
from typing import Any
from ..utils.http import get_json

BASE = 'https://api.openaq.org/v2'


def nearest_station(lat: float, lon: float) -> dict[str, Any] | None:
	data = get_json(f"{BASE}/locations", params={'coordinates': f'{lat},{lon}', 'radius': 50000, 'order_by': 'distance', 'limit': 1})
	if data.get('results'):
		return data['results'][0]
	return None


def latest_air_quality(lat: float, lon: float) -> dict[str, Any] | None:
	st = nearest_station(lat, lon)
	if not st:
		return None
	mid = st['id']
	meas = get_json(f"{BASE}/measurements", params={'location_id': mid, 'limit': 100, 'order_by': 'datetime', 'sort': 'desc'})
	return {'station': st, 'measurements': meas.get('results', [])}