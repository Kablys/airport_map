# Travel Data Toolkit

Commands

- Install deps (recommended via pipx or venv):

```bash
pipx install typer
```

Or create a venv with python3-venv and install requirements:

```bash
sudo apt-get update && sudo apt-get install -y python3-venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r travel_data/requirements.txt
```

Run

```bash
python -m travel_data.cli fetch "Berlin" "Germany" --out output
```

Data sources used (no keys required):
- Nominatim (OSM) for geocoding
- Wikidata SPARQL for population, area, timezone, legal basics (currency, languages, emergency number, plug type, voltage, driving side)
- Open-Meteo for current weather + climate normals
- World Bank for GDP per capita and unemployment
- OurAirports CSV for airports near the city
- CityBikes API for nearest bikeshare network
- OpenAQ API for nearest air quality station and latest measurements
- Nager.Date for public holidays
- exchangerate.host for FX rates
- Wikivoyage (scraped) for culture sections

Optional sources you can add with API keys in `.env`:
- Numbeo (cost of living & safety)
- Eventbrite (events)
- Transitland (GTFS coverage)