from __future__ import annotations
from typing import Any
from urllib.parse import urlencode
from ..utils.http import get_json

ENDPOINT = 'https://query.wikidata.org/sparql'


def query(q: str) -> list[dict[str, Any]]:
	params = {"query": q, "format": "json"}
	data = get_json(ENDPOINT, params=params)
	return data.get('results', {}).get('bindings', [])


def city_core(city: str, country: str) -> dict[str, Any]:
	q = f'''
	SELECT ?city ?cityLabel ?population ?area ?elevation ?timezoneLabel ?countryLabel WHERE {{
	  ?city rdfs:label "{city}"@en.
	  ?city wdt:P17 ?countryEntity.
	  ?countryEntity rdfs:label "{country}"@en.
	  OPTIONAL {{ ?city wdt:P1082 ?population. }}
	  OPTIONAL {{ ?city wdt:P2046 ?area. }}
	  OPTIONAL {{ ?city wdt:P2044 ?elevation. }}
	  OPTIONAL {{ ?city wdt:P421 ?timezone. ?timezone rdfs:label ?timezoneLabel FILTER(LANG(?timezoneLabel)='en'). }}
	  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }}
	}}
	LIMIT 1
	'''
	rows = query(q)
	def lit(row, key):
		return row.get(key, {}).get('value') if row.get(key) else None
	return rows and {
		'qid': lit(rows[0],'city').split('/')[-1],
		'name': lit(rows[0],'cityLabel'),
		'population': lit(rows[0],'population'),
		'area_km2': lit(rows[0],'area'),
		'elevation_m': lit(rows[0],'elevation'),
		'timezone': lit(rows[0],'timezoneLabel'),
		'country': lit(rows[0],'countryLabel'),
	} or {}


def country_legal(country: str) -> dict[str, Any]:
	q = f'''
	SELECT ?country ?countryLabel ?currencyLabel ?languageLabel ?emergency ?drinkingAge ?plugLabel ?voltage ?drivingSideLabel WHERE {{
	  ?country rdfs:label "{country}"@en.
	  OPTIONAL {{ ?country wdt:P38 ?currency. }}
	  OPTIONAL {{ ?country wdt:P37 ?language. }}
	  OPTIONAL {{ ?country wdt:P2852 ?emergency. }}
	  OPTIONAL {{ ?country wdt:P8413 ?drinkingAge. }}
	  OPTIONAL {{ ?country wdt:P2853 ?plug. ?plug rdfs:label ?plugLabel FILTER(LANG(?plugLabel)='en'). }}
	  OPTIONAL {{ ?country wdt:P3348 ?voltage. }}
	  OPTIONAL {{ ?country wdt:P1622 ?drivingSide. }}
	  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }}
	}}
	'''
	rows = query(q)
	def lit(row, key):
		return row.get(key, {}).get('value') if row.get(key) else None
	if not rows:
		return {}
	row = rows[0]
	return {
		'currency': lit(row,'currencyLabel'),
		'languages': sorted({r['languageLabel']['value'] for r in rows if r.get('languageLabel')}),
		'emergency_number': lit(row,'emergency'),
		'legal_drinking_age': lit(row,'drinkingAge'),
		'plug_type': lit(row,'plugLabel'),
		'voltage': lit(row,'voltage'),
		'driving_side': lit(row,'drivingSideLabel'),
	}