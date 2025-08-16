from __future__ import annotations
from typing import Any
from ..utils.http import get_json

OVERPASS = 'https://overpass-api.de/api/interpreter'


def _run(q: str) -> dict[str, Any]:
	return get_json(OVERPASS, params={'data': q})


def walk_bike_counts(city: str, country: str | None = None) -> dict[str, int | None]:
	area = f'area["name"="{city}"]["boundary"="administrative"]["admin_level"~"^8|9|10$"]->.a;'
	q_walk = f"""
	[out:json][timeout:60];
	{area}
	(
	  way["highway"~"footway|pedestrian|living_street"](area.a);
	);
	out count;
	"""
	q_bike = f"""
	[out:json][timeout:60];
	{area}
	(
	  way["highway"="cycleway"](area.a);
	);
	out count;
	"""
	walk = _run(q_walk)
	bike = _run(q_bike)
	def total(d: dict[str, Any]) -> int | None:
		try:
			return int(d.get('elements', [{}])[0].get('tags', {}).get('total'))
		except Exception:
			return None
	return {'walk_ways': total(walk), 'bike_ways': total(bike)}


def coworking_count(city: str) -> int | None:
	q = f"""
	[out:json][timeout:60];
	area["name"="{city}"]["boundary"="administrative"]["admin_level"~"^8|9|10$"]->.a;
	(
	  node["amenity"="coworking_space"](area.a);
	  way["amenity"="coworking_space"](area.a);
	  relation["amenity"="coworking_space"](area.a);
	);
	out count;
	"""
	d = _run(q)
	try:
		return int(d.get('elements', [{}])[0].get('tags', {}).get('total'))
	except Exception:
		return None


def rental_and_carshare_counts(city: str) -> dict[str, int | None]:
	q = f"""
	[out:json][timeout:60];
	area["name"="{city}"]["boundary"="administrative"]["admin_level"~"^8|9|10$"]->.a;
	(
	  node["amenity"="bicycle_rental"](area.a);
	  node["amenity"="car_sharing"](area.a);
	);
	out count;
	"""
	d = _run(q)
	try:
		total = int(d.get('elements', [{}])[0].get('tags', {}).get('total'))
	except Exception:
		total = None
	# Overpass out count merged both; we can run separate to split
	q1 = q.replace('node["amenity"="car_sharing"](area.a);','')
	q2 = q.replace('node["amenity"="bicycle_rental"](area.a);','')
	d1 = _run(q1)
	d2 = _run(q2)
	def tot(x):
		try:
			return int(x.get('elements', [{}])[0].get('tags', {}).get('total'))
		except Exception:
			return None
	return {'bicycle_rental': tot(d1), 'car_sharing': tot(d2), 'total': total}