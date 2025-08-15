from __future__ import annotations
import argparse
from datetime import datetime
from travel_data.connectors.nominatim import geocode_city
from travel_data.connectors.open_meteo import current_weather, climate_normals
from travel_data.connectors.world_bank import economic_snapshot
from travel_data.connectors.wikidata import city_core, country_legal
from travel_data.connectors.ourairports import airports_near
from travel_data.connectors.citybikes import nearest_network
from travel_data.connectors.openaq import latest_air_quality
from travel_data.connectors.nagerdate import public_holidays
from travel_data.connectors.exchangerate import latest as fx_latest
from travel_data.connectors.wikivoyage import extract_sections
from travel_data.connectors.open_elevation import elevation as elevation_lookup
from travel_data.connectors.overpass_metrics import walk_bike_counts, coworking_count, rental_and_carshare_counts
from travel_data.storage.json_store import save_json

try:
	from travel_data.connectors.wd_tourism import (
		unesco_near, tourist_attractions_near, national_parks_near, museums_near
	)
	tourism_available = True
except Exception:
	tourism_available = False


def fetch(city: str, country: str, out: str = 'output') -> str:
	result: dict = {'city': city, 'country': country}
	geo = geocode_city(city, country)
	if not geo:
		raise SystemExit('Failed to geocode city')
	lat = float(geo['lat']); lon = float(geo['lon'])
	result['geography'] = {
		'coordinates': {'lat': lat, 'lon': lon},
		'boundingbox': geo.get('boundingbox'),
		'elevation_tag': (geo.get('extratags') or {}).get('ele'),
		'timezone_tag': (geo.get('extratags') or {}).get('timezone'),
	}
	if not result['geography'].get('elevation_tag'):
		try:
			result['geography']['elevation_m'] = elevation_lookup(lat, lon)
		except Exception:
			pass

	try:
		wd_city = city_core(city, country)
		result['geography'].update({k: v for k, v in wd_city.items() if k in ('population','area_km2','elevation_m','timezone')})
	except Exception:
		pass

	result['weather'] = {
		'current_and_daily': current_weather(lat, lon),
		'climate_normals': climate_normals(lat, lon),
	}

	cc = (geo.get('address') or {}).get('country_code','').upper()
	result['economy'] = economic_snapshot(cc) if cc else {}

	try:
		result['international_legal'] = country_legal(country)
	except Exception:
		result['international_legal'] = {}

	result['airports_nearby'] = airports_near(lat, lon)
	result['mobility'] = {
		'nearest_bike_share': nearest_network(lat, lon),
		'walk_bike_counts': walk_bike_counts(city, country),
		'coworking_spaces_count': coworking_count(city),
		'rental_and_carshare_counts': rental_and_carshare_counts(city),
	}

	try:
		aq = latest_air_quality(lat, lon)
		if aq:
			result['air_quality'] = aq
	except Exception:
		pass

	if cc:
		year = datetime.utcnow().year
		result['events_holidays'] = {'public_holidays': public_holidays(cc, year)}

	fx = fx_latest('USD')
	result['fx_rates'] = fx
	result['culture_wikivoyage'] = extract_sections(city)

	if tourism_available:
		try:
			result['tourism'] = {
				'unesco_near': unesco_near(lat, lon),
				'tourist_attractions_near': tourist_attractions_near(lat, lon),
				'national_parks_near': national_parks_near(lat, lon),
				'museums_near': museums_near(lat, lon),
			}
		except Exception:
			result['tourism'] = {}

	path = save_json(result, out, city, country)
	return path


def main():
	parser = argparse.ArgumentParser(description='Travel data fetch CLI')
	parser.add_argument('city', type=str)
	parser.add_argument('country', type=str)
	parser.add_argument('--out', type=str, default='output')
	args = parser.parse_args()
	path = fetch(args.city, args.country, args.out)
	print(path)


if __name__ == '__main__':
	main()