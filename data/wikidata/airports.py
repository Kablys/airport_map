import marimo

__generated_with = "0.14.17"
app = marimo.App(width="full")


@app.cell
def _():
    import httpx
    import json
    import polars as pl
    import folium
    return folium, httpx, json, pl


@app.cell
def _(httpx):
    def execute_sparql_query(query, user_agent="Wikidata Query/1.0"):
        """Execute a SPARQL query against Wikidata and return JSON response."""
        headers = {"User-Agent": user_agent, "Accept": "application/sparql-results+json"}
        params = {"query": query, "format": "json"}

        response = httpx.get("https://query.wikidata.org/sparql", params=params, headers=headers, timeout=30.0)

        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return None

    def parse_coordinates(coord_str):
        """Parse Wikidata coordinate string 'Point(longitude latitude)' to lat/lon."""
        if not coord_str:
            return None, None
        coords = coord_str.replace("Point(", "").replace(")", "").split()
        return float(coords[1]), float(coords[0])  # latitude, longitude

    def safe_get_value(binding, key, value_type=str):
        """Safely extract value from SPARQL binding with type conversion."""
        if key in binding:
            value = binding[key]["value"]
            if value_type == int:
                return int(value)
            elif value_type == float:
                return float(value)
            return value
        return None

    return execute_sparql_query, parse_coordinates, safe_get_value


@app.cell
def _(json):
    # Load all airports from the production data
    with open("../prod/airports.json", "r") as f:
        airports_data = json.load(f)

    # Extract all IATA codes
    all_iata_codes = [airport["code"] for airport in airports_data]

    print(f"Found {len(all_iata_codes)} airports in production data")
    print(f"First 10 IATA codes: {all_iata_codes[:10]}")

    return (all_iata_codes,)


@app.cell
def _(
    all_iata_codes,
    execute_sparql_query,
    parse_coordinates,
    pl,
    safe_get_value,
):
    def wikidata_airports(iata_codes):
        """Fetch airports from Wikidata using polars."""

        # Convert IATA codes to SPARQL filter format
        iata_filter = '", "'.join(iata_codes)

        query = f"""
        SELECT ?airport ?airportLabel ?iata ?coord WHERE {{
          ?airport wdt:P31/wdt:P279* wd:Q1248784 .  # instance of airport
          ?airport wdt:P238 ?iata .                  # has IATA code
          ?airport wdt:P625 ?coord .                 # has coordinates

          # Filter for specified airports
          FILTER(?iata IN ("{iata_filter}"))

          SERVICE wikibase:label {{ 
            bd:serviceParam wikibase:language "en" . 
          }}
        }}
        """

        data = execute_sparql_query(query, "Airport Data/1.0")
        if not data:
            return pl.DataFrame()

        # Extract data for polars DataFrame
        airports_data = []
        for binding in data["results"]["bindings"]:
            latitude, longitude = parse_coordinates(safe_get_value(binding, "coord"))

            airports_data.append({
                "name": safe_get_value(binding, "airportLabel"),
                "iata": safe_get_value(binding, "iata"),
                "latitude": latitude,
                "longitude": longitude,
            })

        # Create polars DataFrame
        df = pl.DataFrame(airports_data)
        df_sorted = df.sort("iata")

        print(f"Found {len(df)} airports:")
        for row in df_sorted.iter_rows(named=True):
            print(f"  {row['iata']}: {row['name']} ({row['latitude']:.2f}, {row['longitude']:.2f})")

        return df_sorted

    # Test with first 20 airports from production data
    test_airports_df = wikidata_airports(all_iata_codes[:20])
    return (test_airports_df,)


@app.cell
def _(folium, test_airports_df):
    def create_airport_map(airports_df):
        """Create an interactive map showing airport locations."""

        if len(airports_df) == 0:
            print("No airports to display")
            return None

        # Calculate center point for the map
        center_lat = airports_df["latitude"].mean()
        center_lon = airports_df["longitude"].mean()

        # Create base map
        m = folium.Map(
            location=[center_lat, center_lon],
            zoom_start=4,
            tiles="OpenStreetMap"
        )

        # Add markers for each airport
        for row in airports_df.iter_rows(named=True):
            folium.Marker(
                location=[row["latitude"], row["longitude"]],
                popup=f"<b>{row['iata']}</b><br>{row['name']}<br>({row['latitude']:.3f}, {row['longitude']:.3f})",
                tooltip=f"{row['iata']} - {row['name']}",
                icon=folium.Icon(color="blue", icon="plane")
            ).add_to(m)

        return m

    # Create map with test airports
    airport_map = create_airport_map(test_airports_df)
    airport_map
    return


@app.cell
def _(execute_sparql_query, parse_coordinates, pl, safe_get_value):
    def wikidata_city_data(city_name):
        """Fetch city data from Wikidata."""

        query = f"""
        SELECT ?city ?cityLabel ?coord ?population ?country ?countryLabel ?area WHERE {{
          ?city rdfs:label "{city_name}"@en .
          ?city wdt:P31/wdt:P279* wd:Q515 .  # instance of city
          OPTIONAL {{ ?city wdt:P625 ?coord . }}  # coordinates
          OPTIONAL {{ ?city wdt:P1082 ?population . }}  # population
          OPTIONAL {{ ?city wdt:P17 ?country . }}  # country
          OPTIONAL {{ ?city wdt:P2046 ?area . }}  # area

          SERVICE wikibase:label {{ 
            bd:serviceParam wikibase:language "en" . 
          }}
        }}
        LIMIT 1
        """

        data = execute_sparql_query(query, "City Data/1.0")
        if not data or not data["results"]["bindings"]:
            print(f"No data found for city: {city_name}")
            return pl.DataFrame()

        binding = data["results"]["bindings"][0]
        latitude, longitude = parse_coordinates(safe_get_value(binding, "coord"))

        city_data = {
            "name": safe_get_value(binding, "cityLabel"),
            "country": safe_get_value(binding, "countryLabel") or "Unknown",
            "population": safe_get_value(binding, "population", int),
            "area_km2": safe_get_value(binding, "area", float),
            "latitude": latitude,
            "longitude": longitude,
        }

        return pl.DataFrame([city_data])

    # Test with Vilnius
    vilnius_data = wikidata_city_data("Vilnius")
    print("Vilnius city data:")
    vilnius_data
    return (vilnius_data,)


@app.cell
def _(execute_sparql_query, parse_coordinates, pl, safe_get_value):
    def wikidata_country_data(country_name):
        """Fetch country data from Wikidata."""

        query = f"""
        SELECT ?country ?countryLabel ?coord ?population ?area ?capital ?capitalLabel ?currency ?currencyLabel WHERE {{
          ?country rdfs:label "{country_name}"@en .
          ?country wdt:P31 wd:Q6256 .  # instance of country
          OPTIONAL {{ ?country wdt:P625 ?coord . }}  # coordinates (center)
          OPTIONAL {{ ?country wdt:P1082 ?population . }}  # population
          OPTIONAL {{ ?country wdt:P2046 ?area . }}  # area
          OPTIONAL {{ ?country wdt:P36 ?capital . }}  # capital
          OPTIONAL {{ ?country wdt:P38 ?currency . }}  # currency

          SERVICE wikibase:label {{ 
            bd:serviceParam wikibase:language "en" . 
          }}
        }}
        LIMIT 1
        """

        data = execute_sparql_query(query, "Country Data/1.0")
        if not data or not data["results"]["bindings"]:
            print(f"No data found for country: {country_name}")
            return pl.DataFrame()

        binding = data["results"]["bindings"][0]
        center_latitude, center_longitude = parse_coordinates(safe_get_value(binding, "coord"))

        country_data = {
            "name": safe_get_value(binding, "countryLabel"),
            "capital": safe_get_value(binding, "capitalLabel") or "Unknown",
            "currency": safe_get_value(binding, "currencyLabel") or "Unknown",
            "population": safe_get_value(binding, "population", int),
            "area_km2": safe_get_value(binding, "area", float),
            "center_latitude": center_latitude,
            "center_longitude": center_longitude,
        }

        return pl.DataFrame([country_data])

    # Test with Lithuania
    lithuania_data = wikidata_country_data("Lithuania")
    print("Lithuania country data:")
    lithuania_data
    return (lithuania_data,)


@app.cell
def _(folium, lithuania_data, vilnius_data):
    def create_location_map(city_df=None, country_df=None):
        """Create a map showing city and/or country locations."""

        # Determine map center
        if city_df is not None and len(city_df) > 0 and city_df["latitude"][0] is not None:
            center_lat = city_df["latitude"][0]
            center_lon = city_df["longitude"][0]
            zoom = 10
        elif country_df is not None and len(country_df) > 0 and country_df["center_latitude"][0] is not None:
            center_lat = country_df["center_latitude"][0]
            center_lon = country_df["center_longitude"][0]
            zoom = 6
        else:
            center_lat, center_lon, zoom = 54.9, 25.3, 6  # Default to Baltic region

        # Create map
        m = folium.Map(
            location=[center_lat, center_lon],
            zoom_start=zoom,
            tiles="OpenStreetMap"
        )

        # Add city marker
        if city_df is not None and len(city_df) > 0 and city_df["latitude"][0] is not None:
            city = city_df.row(0, named=True)
            popup_text = f"""
            <b>{city['name']}</b><br>
            Country: {city['country']}<br>
            Population: {city['population']:,} (if available)<br>
            Area: {city['area_km2']:.1f} km² (if available)<br>
            Coordinates: ({city['latitude']:.3f}, {city['longitude']:.3f})
            """.replace("None", "N/A")

            folium.Marker(
                location=[city["latitude"], city["longitude"]],
                popup=popup_text,
                tooltip=f"{city['name']} (City)",
                icon=folium.Icon(color="red", icon="home")
            ).add_to(m)

        # Add country center marker
        if country_df is not None and len(country_df) > 0 and country_df["center_latitude"][0] is not None:
            country = country_df.row(0, named=True)
            popup_text = f"""
            <b>{country['name']}</b><br>
            Capital: {country['capital']}<br>
            Currency: {country['currency']}<br>
            Population: {country['population']:,} (if available)<br>
            Area: {country['area_km2']:,.0f} km² (if available)<br>
            Center: ({country['center_latitude']:.3f}, {country['center_longitude']:.3f})
            """.replace("None", "N/A")

            folium.Marker(
                location=[country["center_latitude"], country["center_longitude"]],
                popup=popup_text,
                tooltip=f"{country['name']} (Country Center)",
                icon=folium.Icon(color="green", icon="flag")
            ).add_to(m)

        return m

    # Create map with Vilnius and Lithuania
    location_map = create_location_map(vilnius_data, lithuania_data)
    location_map
    return


@app.cell
def _(all_iata_codes):
    # Uncomment to fetch ALL airports (this will take a while!)
    # all_airports_df = wikidata_airports(all_iata_codes)
    # all_airports_map = create_airport_map(all_airports_df)
    # all_airports_map

    print(f"To fetch all {len(all_iata_codes)} airports, uncomment the lines above")
    print("This will make a large SPARQL query that may take several minutes")
    return


if __name__ == "__main__":
    app.run()
