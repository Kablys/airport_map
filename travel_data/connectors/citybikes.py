from __future__ import annotations
from typing import Any
from ..utils.http import get_json

BASE = 'https://api.citybik.es/v2/networks'


def networks() -> list[dict[str, Any]]:
	return get_json(BASE).get('networks', [])


def nearest_network(lat: float, lon: float) -> dict[str, Any] | None:
	nets = networks()
	if not nets:
		return None
	from math import radians, cos, sin, asin, sqrt
	def haversine(lat1, lon1, lat2, lon2):
		lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
		dlon = lon2 - lon1
		dlat = lat2 - lat1
		a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
		c = 2 * asin(sqrt(a))
		return 6371 * c
	best = None
	for n in nets:
		loc = n.get('location') or {}
		if 'latitude' not in loc:
			continue
		d = haversine(lat, lon, loc['latitude'], loc['longitude'])
		item = {'id': n['id'], 'name': n['name'], 'distance_km': round(d,1), 'city': loc.get('city'), 'country': loc.get('country')}
		best = item if best is None or item['distance_km'] < best['distance_km'] else best
	return best