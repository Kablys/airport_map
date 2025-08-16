from __future__ import annotations
from typing import Any
from ..utils.http import get_json

ENDPOINT = 'https://query.wikidata.org/sparql'

PREFIXES = '''
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
'''


def _run(q: str) -> list[dict[str, Any]]:
	params = {'query': PREFIXES + q, 'format': 'json'}
	data = get_json(ENDPOINT, params=params)
	return data.get('results', {}).get('bindings', [])


def _around_filter(lat: float, lon: float, radius_km: float) -> str:
	return f'''SERVICE wikibase:around {{ ?item wdt:P625 ?location . bd:serviceParam wikibase:center "Point({lon} {lat})"^^geo:wktLiteral ; wikibase:radius "{radius_km}" . }}'''


def _map_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
	def lit(r, k):
		return r.get(k, {}).get('value') if r.get(k) else None
	return [
		{
			'id': lit(r, 'item').split('/')[-1] if lit(r,'item') else None,
			'label': lit(r, 'itemLabel'),
			'description': lit(r, 'itemDescription'),
			'coord': lit(r, 'location'),
		}
		for r in rows
	]


def unesco_near(lat: float, lon: float, radius_km: float = 120) -> list[dict[str, Any]]:
	q = f'''
	SELECT ?item ?itemLabel ?itemDescription ?location WHERE {{
	  ?item wdt:P1435 wd:Q9259.
	  {_around_filter(lat, lon, radius_km)}
	  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }}
	}}
	LIMIT 100
	'''
	return _map_rows(_run(q))


def tourist_attractions_near(lat: float, lon: float, radius_km: float = 40) -> list[dict[str, Any]]:
	q = f'''
	SELECT ?item ?itemLabel ?itemDescription ?location WHERE {{
	  ?item wdt:P31/wdt:P279* wd:Q570116.
	  {_around_filter(lat, lon, radius_km)}
	  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }}
	}}
	LIMIT 200
	'''
	return _map_rows(_run(q))


def national_parks_near(lat: float, lon: float, radius_km: float = 200) -> list[dict[str, Any]]:
	q = f'''
	SELECT ?item ?itemLabel ?itemDescription ?location WHERE {{
	  ?item wdt:P31 wd:Q46169.
	  {_around_filter(lat, lon, radius_km)}
	  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }}
	}}
	LIMIT 200
	'''
	return _map_rows(_run(q))


def museums_near(lat: float, lon: float, radius_km: float = 30) -> list[dict[str, Any]]:
	q = f'''
	SELECT ?item ?itemLabel ?itemDescription ?location WHERE {{
	  ?item wdt:P31/wdt:P279* wd:Q33506.
	  {_around_filter(lat, lon, radius_km)}
	  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }}
	}}
	LIMIT 200
	'''
	return _map_rows(_run(q))