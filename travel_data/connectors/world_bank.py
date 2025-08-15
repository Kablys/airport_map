from __future__ import annotations
from typing import Any
from ..utils.http import get_json

WB = 'https://api.worldbank.org/v2'

INDICATORS = {
	'gdp_per_capita_current_usd': 'NY.GDP.PCAP.CD',
	'unemployment_rate_percent': 'SL.UEM.TOTL.ZS',
}


def latest_indicator(country_iso2: str, code: str) -> dict[str, Any] | None:
	url = f"{WB}/country/{country_iso2}/indicator/{code}"
	data = get_json(url, params={'format': 'json', 'per_page': 120})
	if not data or len(data) < 2 or not isinstance(data[1], list):
		return None
	series = [row for row in data[1] if row.get('value') is not None]
	return series[0] if series else None


def economic_snapshot(country_iso2: str) -> dict[str, Any]:
	res: dict[str, Any] = {}
	for key, ind in INDICATORS.items():
		row = latest_indicator(country_iso2, ind)
		if row:
			res[key] = row['value']
			res[key + '_year'] = row['date']
	return res