from __future__ import annotations
from typing import Any
from ..utils.http import get_json


def overpass(query: str) -> dict[str, Any]:
	url = 'https://overpass-api.de/api/interpreter'
	return get_json(url, params={'data': query})


def city_bike_friendly(city: str, country: str) -> dict[str, Any]:
	q = f'''
	[out:json][timeout:60];
	area["name"="{city}"]["boundary"="administrative"]["admin_level"~"^8|9|10$"]->.searchArea;
	(
	  way["highway"="cycleway"](area.searchArea);
	  node["amenity"="bicycle_rental"](area.searchArea);
	);
	out count;
	'''
	return overpass(q)