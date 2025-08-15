from __future__ import annotations
import csv
import io
from typing import Any
from ..utils.http import get_text

URL = 'https://ourairports.com/data/airports.csv'


def airports_near(lat: float, lon: float, radius_km: float = 150) -> list[dict[str, Any]]:
	csv_text = get_text(URL)
	buf = io.StringIO(csv_text)
	r = csv.DictReader(buf)
	res: list[dict[str, Any]] = []
	from math import radians, cos, sin, asin, sqrt
	def haversine(lat1, lon1, lat2, lon2):
		lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
		dlon = lon2 - lon1
		dlat = lat2 - lat1
		a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
		c = 2 * asin(sqrt(a))
		return 6371 * c
	for row in r:
		try:
			alat = float(row['latitude_deg']); alon = float(row['longitude_deg'])
		except Exception:
			continue
		d = haversine(lat, lon, alat, alon)
		if d <= radius_km:
			res.append({'name': row['name'], 'iata': row.get('iata_code'), 'type': row.get('type'), 'distance_km': round(d,1)})
	return sorted(res, key=lambda x: x['distance_km'])[:20]