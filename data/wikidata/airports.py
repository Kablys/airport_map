# pyright: reportMissingImports=false, reportUnknownVariableType=false, reportUnknownMemberType=false, reportUnknownParameterType=false, reportUnknownArgumentType=false, reportUntypedFunctionDecorator=false, reportMissingParameterType=false, reportUnusedExpression=false

import marimo

__generated_with = "0.14.17"
app = marimo.App(width="full")

with app.setup:
    # Initialization code that runs before all other cells
    import httpx  # type: ignore[import-untyped]
    import json
    import polars as pl  # type: ignore[import-untyped]
    import folium  # type: ignore[import-untyped]
    from typing import TypedDict, NotRequired
    from utils import execute_sparql_query, safe_get_value, parse_coordinates, haversine_distance, calculate_airport_city_distances


@app.cell
def _():
    # Load all airports from the production data
    with open("data/prod/airports.json", "r") as f:
        raw_data = json.load(f)  # type: ignore[misc]
        # Type assertion - we know the structure of our JSON file
        airports_data: list = raw_data  # type: ignore[misc]

    # Extract all IATA codes
    all_iata_codes: list[str] = [airport["code"] for airport in airports_data]

    print(f"Found {len(all_iata_codes)} airports in production data")
    print(f"First 10 IATA codes: {all_iata_codes[:10]}")

    return (all_iata_codes,)


@app.cell
def _(AirportData, all_iata_codes: list[str]):
    def wikidata_airports(iata_codes: list[str]) -> "pl.DataFrame":
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
        airports_data: list[AirportData] = []
        for binding in data["results"]["bindings"]:
            coord_value = safe_get_value(binding, "coord", str)
            coord_str = coord_value if isinstance(coord_value, str) else None
            latitude, longitude = parse_coordinates(coord_str)

            name_value = safe_get_value(binding, "airportLabel", str)
            iata_value = safe_get_value(binding, "iata", str)

            airport_data: AirportData = {
                "name": name_value if isinstance(name_value, str) else None,
                "iata": iata_value if isinstance(iata_value, str) else None,
                "latitude": latitude,
                "longitude": longitude,
            }
            airports_data.append(airport_data)

        # Create polars DataFrame
        df = pl.DataFrame(airports_data)
        df_sorted = df.sort("iata")

        print(f"Found {len(df)} airports:")
        for row in df_sorted.iter_rows(named=True):
            print(f"  {row['iata']}: {row['name']} ({row['latitude']:.2f}, {row['longitude']:.2f})")

        return df_sorted
    test_airports_df = wikidata_airports(all_iata_codes[:20])
    return


@app.cell
def _():
    def wikidata_city_data(city_name: str) -> "pl.DataFrame":
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
        coord_value = safe_get_value(binding, "coord", str)
        coord_str = coord_value if isinstance(coord_value, str) else None
        latitude, longitude = parse_coordinates(coord_str)

        name_value = safe_get_value(binding, "cityLabel", str)
        country_value = safe_get_value(binding, "countryLabel", str)
        population_value = safe_get_value(binding, "population", int)
        area_value = safe_get_value(binding, "area", float)

        city_data = {
            "name": name_value if isinstance(name_value, str) else None,
            "country": (country_value if isinstance(country_value, str) else None) or "Unknown",
            "population": population_value if isinstance(population_value, int) else None,
            "area_km2": area_value if isinstance(area_value, float) else None,
            "latitude": latitude,
            "longitude": longitude,
        }

        return pl.DataFrame([city_data])
    vilnius_data = wikidata_city_data("Vilnius"); vilnius_data
    return


@app.cell
def _():
    def wikidata_country_data(country_name: str) -> "pl.DataFrame":
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
        coord_value = safe_get_value(binding, "coord", str)
        coord_str = coord_value if isinstance(coord_value, str) else None
        center_latitude, center_longitude = parse_coordinates(coord_str)

        name_value = safe_get_value(binding, "countryLabel", str)
        capital_value = safe_get_value(binding, "capitalLabel", str)
        currency_value = safe_get_value(binding, "currencyLabel", str)
        population_value = safe_get_value(binding, "population", int)
        area_value = safe_get_value(binding, "area", float)

        country_data = {
            "name": name_value if isinstance(name_value, str) else None,
            "capital": (capital_value if isinstance(capital_value, str) else None) or "Unknown",
            "currency": (currency_value if isinstance(currency_value, str) else None) or "Unknown",
            "population": population_value if isinstance(population_value, int) else None,
            "area_km2": area_value if isinstance(area_value, float) else None,
            "center_latitude": center_latitude,
            "center_longitude": center_longitude,
        }

        return pl.DataFrame([country_data])
    lithuania_data = wikidata_country_data("Lithuania"); lithuania_data
    return


@app.cell
def _():
    # Calculate distance from Vilnius airport to Vilnius city center

    # Get Vilnius airport data (VNO is Vilnius airport IATA code)
    vilnius_airport_query = """
    SELECT ?airport ?airportLabel ?iata ?coord WHERE {
      ?airport wdt:P31/wdt:P279* wd:Q1248784 .  # instance of airport
      ?airport wdt:P238 "VNO" .                 # IATA code VNO
      ?airport wdt:P625 ?coord .                # has coordinates

      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "en" . 
      }
    }
    """

    airport_data = execute_sparql_query(vilnius_airport_query, "Vilnius Airport/1.0")

    if airport_data and airport_data["results"]["bindings"]:
        airport_binding = airport_data["results"]["bindings"][0]
        airport_coord = safe_get_value(airport_binding, "coord", str)
        airport_name = safe_get_value(airport_binding, "airportLabel", str)
        airport_lat, airport_lon = parse_coordinates(airport_coord)

        print(f"Vilnius Airport ({airport_name}):")
        print(f"  Coordinates: {airport_lat:.6f}, {airport_lon:.6f}")
    else:
        print("Could not find Vilnius airport data")
        airport_lat, airport_lon = None, None

    # Get Vilnius city center data
    city_query = """
    SELECT ?city ?cityLabel ?coord WHERE {
      ?city rdfs:label "Vilnius"@en .
      ?city wdt:P31/wdt:P279* wd:Q515 .  # instance of city
      ?city wdt:P625 ?coord .            # coordinates

      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "en" . 
      }
    }
    LIMIT 1
    """

    city_data = execute_sparql_query(city_query, "Vilnius City/1.0")

    if city_data and city_data["results"]["bindings"]:
        city_binding = city_data["results"]["bindings"][0]
        city_coord = safe_get_value(city_binding, "coord", str)
        city_name = safe_get_value(city_binding, "cityLabel", str)
        city_lat, city_lon = parse_coordinates(city_coord)

        print(f"\nVilnius City Center ({city_name}):")
        print(f"  Coordinates: {city_lat:.6f}, {city_lon:.6f}")
    else:
        print("Could not find Vilnius city data")
        city_lat, city_lon = None, None

    # Calculate distance
    if airport_lat and airport_lon and city_lat and city_lon:
        distance = haversine_distance(airport_lat, airport_lon, city_lat, city_lon)
        print(f"\nDistance from Vilnius Airport to Vilnius City Center:")
        print(f"  {distance:.2f} kilometers")
        print(f"  {distance * 0.621371:.2f} miles")
    else:
        print("\nCould not calculate distance - missing coordinate data")

    return


@app.cell
def _():
    from collections import defaultdict
    from functools import partial

    def get_comprehensive_city_data(city_name: str) -> dict:
        """Get comprehensive data about a city from Wikidata using modern Python features."""
        query = f"""
        SELECT DISTINCT 
          ?city ?cityLabel ?cityDescription
          ?coord ?population ?area ?elevation ?timezone
          ?country ?countryLabel 
          ?mayor ?mayorLabel
          ?founded ?foundedDate
          ?website ?postalCode
          ?demonym ?demonymLabel
          ?twinCity ?twinCityLabel
          ?university ?universityLabel
          ?airport ?airportLabel
          ?river ?riverLabel
          ?lake ?lakeLabel
          ?mountain ?mountainLabel
          ?climate ?climateLabel
          ?currency ?currencyLabel
          ?language ?languageLabel
          ?religion ?religionLabel
          ?gdp ?gdpPerCapita
          ?unemployment
        WHERE {{
          ?city rdfs:label "{city_name}"@en .
          ?city wdt:P31/wdt:P279* wd:Q515 .

          OPTIONAL {{ ?city wdt:P625 ?coord . }}
          OPTIONAL {{ ?city wdt:P1082 ?population . }}
          OPTIONAL {{ ?city wdt:P2046 ?area . }}
          OPTIONAL {{ ?city wdt:P2044 ?elevation . }}
          OPTIONAL {{ ?city wdt:P421 ?timezone . }}
          OPTIONAL {{ ?city wdt:P17 ?country . }}
          OPTIONAL {{ ?city wdt:P6 ?mayor . }}
          OPTIONAL {{ ?city wdt:P571 ?founded . }}
          OPTIONAL {{ ?city wdt:P1619 ?foundedDate . }}
          OPTIONAL {{ ?city wdt:P856 ?website . }}
          OPTIONAL {{ ?city wdt:P281 ?postalCode . }}
          OPTIONAL {{ ?city wdt:P1549 ?demonym . }}
          OPTIONAL {{ ?city wdt:P190 ?twinCity . }}
          OPTIONAL {{ ?city wdt:P131*/wdt:P150* ?university . ?university wdt:P31/wdt:P279* wd:Q3918 . }}
          OPTIONAL {{ ?city wdt:P931 ?airport . ?airport wdt:P31/wdt:P279* wd:Q1248784 . }}
          OPTIONAL {{ ?city wdt:P206 ?river . ?river wdt:P31/wdt:P279* wd:Q4022 . }}
          OPTIONAL {{ ?city wdt:P206 ?lake . ?lake wdt:P31/wdt:P279* wd:Q23397 . }}
          OPTIONAL {{ ?city wdt:P610 ?mountain . }}
          OPTIONAL {{ ?city wdt:P2564 ?climate . }}
          OPTIONAL {{ ?city wdt:P38 ?currency . }}
          OPTIONAL {{ ?city wdt:P37 ?language . }}
          OPTIONAL {{ ?city wdt:P140 ?religion . }}
          OPTIONAL {{ ?city wdt:P2131 ?gdp . }}
          OPTIONAL {{ ?city wdt:P2132 ?gdpPerCapita . }}
          OPTIONAL {{ ?city wdt:P1198 ?unemployment . }}

          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" . }}
        }}
        LIMIT 50
        """

        data = execute_sparql_query(query, f"Comprehensive {city_name} Data/1.0")
        if not data or not data["results"]["bindings"]:
            return {}

        # Field mapping: (sparql_field, target_category, target_field, value_type, is_list)
        field_mappings = [
            ("cityLabel", "basic_info", "name", str, False),
            ("cityDescription", "basic_info", "description", str, False),
            ("website", "basic_info", "website", str, False),
            ("postalCode", "basic_info", "postal_code", str, False),
            ("population", "demographics", "population", int, False),
            ("demonymLabel", "demographics", "demonym", str, False),
            ("area", "geography", "area_km2", float, False),
            ("elevation", "geography", "elevation_m", float, False),
            ("timezone", "geography", "timezone", str, False),
            ("climateLabel", "geography", "climate", str, False),
            ("riverLabel", "geography", "rivers", str, True),
            ("lakeLabel", "geography", "lakes", str, True),
            ("mountainLabel", "geography", "highest_point", str, False),
            ("countryLabel", "government", "country", str, False),
            ("mayorLabel", "government", "mayor", str, False),
            ("founded", "government", "founded", str, False),
            ("foundedDate", "government", "founded_date", str, False),
            ("currencyLabel", "economy", "currency", str, False),
            ("gdp", "economy", "gdp", float, False),
            ("gdpPerCapita", "economy", "gdp_per_capita", float, False),
            ("unemployment", "economy", "unemployment_rate", float, False),
            ("languageLabel", "culture", "languages", str, True),
            ("religionLabel", "culture", "religions", str, True),
            ("twinCityLabel", "relations", "twin_cities", str, True),
            ("universityLabel", "infrastructure", "universities", str, True),
            ("airportLabel", "infrastructure", "airports", str, True),
        ]

        # Initialize nested defaultdict structure
        city_info = defaultdict(lambda: defaultdict(lambda: None))
        list_fields = defaultdict(set)

        # Process coordinates separately due to special handling
        coord_processed = False

        # Process all bindings using field mappings
        for binding in data["results"]["bindings"]:
            # Handle coordinates specially
            if "coord" in binding and not coord_processed:
                coord_str = safe_get_value(binding, "coord", str)
                if isinstance(coord_str, str):
                    lat, lon = parse_coordinates(coord_str)
                    city_info["geography"]["latitude"] = lat
                    city_info["geography"]["longitude"] = lon
                    coord_processed = True

            # Process all other fields using mappings
            for sparql_field, category, field, value_type, is_list in field_mappings:
                if sparql_field in binding:
                    value = safe_get_value(binding, sparql_field, value_type)
                    if value is not None:
                        if is_list:
                            if field not in city_info[category] or city_info[category][field] is None:
                                city_info[category][field] = []
                            if value not in city_info[category][field]:
                                city_info[category][field].append(value)
                        else:
                            city_info[category][field] = value

        # Convert defaultdict back to regular dict and filter empty categories
        return {k: dict(v) for k, v in city_info.items() if v}

    # Test with Vilnius and display results
    vilnius_comprehensive = get_comprehensive_city_data("Vilnius")

    print("=== COMPREHENSIVE VILNIUS DATA ===\n")

    # Display function using modern Python features
    display_data = lambda category, data: (
        print(f"📍 {category.upper().replace('_', ' ')}"),
        [print(f"  {key.replace('_', ' ').title()}: {', '.join(map(str, value)) if isinstance(value, list) else value}")
         for key, value in data.items() if value is not None and (not isinstance(value, list) or value)],
        print()
    )

    [display_data(category, data) for category, data in vilnius_comprehensive.items() if data]

    return (defaultdict,)


@app.cell
def _(defaultdict):
    def get_all_entity_properties(entity_name: str, limit: int = 100) -> dict:
        """Discover all available properties for a given entity in Wikidata."""

        # First, find the entity ID
        entity_query = f"""
        SELECT ?entity WHERE {{
          ?entity rdfs:label "{entity_name}"@en .
          ?entity wdt:P31/wdt:P279* wd:Q515 .  # instance of city (adjust as needed)
        }}
        LIMIT 1
        """

        entity_data = execute_sparql_query(entity_query, f"Find {entity_name} Entity/1.0")
        if not entity_data or not entity_data["results"]["bindings"]:
            print(f"Entity '{entity_name}' not found")
            return {}

        entity_uri = entity_data["results"]["bindings"][0]["entity"]["value"]
        entity_id = entity_uri.split("/")[-1]  # Extract Q-ID from URI

        # Now get all properties for this entity
        properties_query = f"""
        SELECT DISTINCT ?property ?propertyLabel ?value ?valueLabel WHERE {{
          wd:{entity_id} ?property ?value .
          ?prop wikibase:directClaim ?property .

          SERVICE wikibase:label {{ 
            bd:serviceParam wikibase:language "en" . 
          }}
        }}
        ORDER BY ?propertyLabel
        LIMIT {limit}
        """

        data = execute_sparql_query(properties_query, f"All Properties for {entity_name}/1.0")
        if not data or not data["results"]["bindings"]:
            return {}

        # Organize properties by category and type
        properties = defaultdict(list)
        property_stats = defaultdict(int)

        for binding in data["results"]["bindings"]:
            prop_label = safe_get_value(binding, "propertyLabel", str) or "Unknown Property"
            prop_uri = safe_get_value(binding, "property", str) or ""
            value = safe_get_value(binding, "value", str) or ""
            value_label = safe_get_value(binding, "valueLabel", str) or value

            # Extract property ID (P-number) from URI
            prop_id = prop_uri.split("/")[-1] if prop_uri else "Unknown"

            # Categorize properties based on common patterns
            category = categorize_property(prop_label, prop_id)

            properties[category].append({
                "property_id": prop_id,
                "property_name": prop_label,
                "value": value_label,
                "raw_value": value
            })

            property_stats[category] += 1

        return {
            "entity_id": entity_id,
            "entity_name": entity_name,
            "total_properties": len(data["results"]["bindings"]),
            "categories": dict(properties),
            "category_stats": dict(property_stats)
        }

    def categorize_property(prop_label: str, prop_id: str) -> str:
        """Categorize properties based on their labels and common patterns."""
        label_lower = prop_label.lower()

        # Geographic properties
        if any(geo_term in label_lower for geo_term in 
               ["coordinate", "location", "elevation", "area", "timezone", "climate", "continent"]):
            return "geography"

        # Demographic properties
        if any(demo_term in label_lower for demo_term in 
               ["population", "density", "demographic", "inhabitant", "resident"]):
            return "demographics"

        # Administrative/Government
        if any(admin_term in label_lower for admin_term in 
               ["country", "state", "province", "region", "administrative", "government", "capital", "mayor", "head"]):
            return "administration"

        # Historical/Temporal
        if any(time_term in label_lower for time_term in 
               ["founded", "established", "inception", "start", "end", "date", "time", "year", "century"]):
            return "history"

        # Economic
        if any(econ_term in label_lower for econ_term in 
               ["gdp", "economy", "economic", "currency", "income", "unemployment", "budget"]):
            return "economy"

        # Cultural/Social
        if any(culture_term in label_lower for culture_term in 
               ["language", "religion", "culture", "ethnic", "festival", "tradition", "heritage"]):
            return "culture"

        # Infrastructure/Transport
        if any(infra_term in label_lower for infra_term in 
               ["airport", "station", "transport", "road", "railway", "port", "university", "hospital", "school"]):
            return "infrastructure"

        # Identifiers and codes
        if any(id_term in label_lower for id_term in 
               ["code", "identifier", "id", "iso", "postal", "phone", "website", "url"]):
            return "identifiers"

        # Relationships
        if any(rel_term in label_lower for rel_term in 
               ["twin", "sister", "partner", "member", "part", "contains", "located", "adjacent"]):
            return "relationships"

        # Default category
        return "other"

    def display_entity_properties(properties_data: dict, max_values_per_property: int = 3):
        """Display entity properties in a organized, readable format."""
        if not properties_data:
            return

        print(f"🏛️  ENTITY: {properties_data['entity_name']} ({properties_data['entity_id']})")
        print(f"📊 Total Properties: {properties_data['total_properties']}")
        print(f"📂 Categories: {len(properties_data['categories'])}")
        print("\n" + "="*60 + "\n")

        # Sort categories by number of properties (most to least)
        sorted_categories = sorted(
            properties_data['categories'].items(), 
            key=lambda x: len(x[1]), 
            reverse=True
        )

        for category, props in sorted_categories:
            count = properties_data['category_stats'][category]
            print(f"📍 {category.upper()} ({count} properties)")
            print("-" * 40)

            # Group properties by name to handle multiple values
            prop_groups = defaultdict(list)
            for prop in props:
                prop_groups[prop['property_name']].append(prop)

            for prop_name, prop_list in list(prop_groups.items())[:10]:  # Show max 10 properties per category
                prop_id = prop_list[0]['property_id']
                values = [p['value'] for p in prop_list[:max_values_per_property]]

                if len(prop_list) > max_values_per_property:
                    values.append(f"... and {len(prop_list) - max_values_per_property} more")

                values_str = " | ".join(values) if len(values) > 1 else values[0]

                # Enhanced display with prominent property names
                print(f"  🏷️  {prop_name}")
                print(f"      ID: {prop_id}")
                print(f"      Values: {values_str}")
                print()

            if len(prop_groups) > 10:
                print(f"    ... and {len(prop_groups) - 10} more properties")

            print()

    # Test the function with Vilnius
    print("🔍 DISCOVERING ALL PROPERTIES FOR VILNIUS...\n")
    vilnius_all_properties = get_all_entity_properties("Vilnius", limit=200)
    display_entity_properties(vilnius_all_properties)

    return


@app.cell
def _():
    def get_climate_data(location_name: str, location_type: str = "city") -> "pl.DataFrame":
        """
        Fetch comprehensive climate data from Wikidata for a given location.
        
        Args:
            location_name: Name of the city, airport, or location
            location_type: Type of location ("city", "airport", "country")
        """
        
        # Build query based on location type
        if location_type == "city":
            entity_filter = "?location wdt:P31/wdt:P279* wd:Q515 ."  # instance of city
        elif location_type == "airport":
            entity_filter = "?location wdt:P31/wdt:P279* wd:Q1248784 ."  # instance of airport
        elif location_type == "country":
            entity_filter = "?location wdt:P31 wd:Q6256 ."  # instance of country
        else:
            entity_filter = "?location wdt:P31/wdt:P279* wd:Q515 ."  # default to city
        
        query = f"""
        SELECT DISTINCT 
          ?location ?locationLabel ?locationDescription
          ?coord
          ?climate ?climateLabel ?climateDescription
          ?köppenClimate ?köppenClimateLabel
          ?temperature ?temperatureLabel
          ?avgTemp ?avgTempLabel
          ?maxTemp ?maxTempLabel
          ?minTemp ?minTempLabel
          ?precipitation ?precipitationLabel
          ?avgPrecipitation ?avgPrecipitationLabel
          ?annualPrecipitation ?annualPrecipitationLabel
          ?humidity ?humidityLabel
          ?windSpeed ?windSpeedLabel
          ?snowfall ?snowfallLabel
          ?sunshine ?sunshineLabel
          ?frostDays ?frostDaysLabel
          ?heatDays ?heatDaysLabel
          ?rainyDays ?rainyDaysLabel
          ?seasons ?seasonsLabel
          ?weatherStation ?weatherStationLabel
          ?elevation ?elevationLabel
          ?timezone ?timezoneLabel
          ?latitude ?longitude
        WHERE {{
          ?location rdfs:label "{location_name}"@en .
          {entity_filter}
          
          OPTIONAL {{ ?location wdt:P625 ?coord . }}
          OPTIONAL {{ ?location wdt:P2564 ?climate . }}
          OPTIONAL {{ ?location wdt:P2044 ?elevation . }}
          OPTIONAL {{ ?location wdt:P421 ?timezone . }}
          
          # Climate classification
          OPTIONAL {{ ?location wdt:P2927 ?köppenClimate . }}
          
          # Temperature data
          OPTIONAL {{ ?location wdt:P2076 ?temperature . }}
          OPTIONAL {{ ?location wdt:P2077 ?avgTemp . }}
          OPTIONAL {{ ?location wdt:P2078 ?maxTemp . }}
          OPTIONAL {{ ?location wdt:P2079 ?minTemp . }}
          
          # Precipitation data
          OPTIONAL {{ ?location wdt:P2080 ?precipitation . }}
          OPTIONAL {{ ?location wdt:P2081 ?avgPrecipitation . }}
          OPTIONAL {{ ?location wdt:P2082 ?annualPrecipitation . }}
          
          # Other weather data
          OPTIONAL {{ ?location wdt:P2083 ?humidity . }}
          OPTIONAL {{ ?location wdt:P2084 ?windSpeed . }}
          OPTIONAL {{ ?location wdt:P2085 ?snowfall . }}
          OPTIONAL {{ ?location wdt:P2086 ?sunshine . }}
          OPTIONAL {{ ?location wdt:P2087 ?frostDays . }}
          OPTIONAL {{ ?location wdt:P2088 ?heatDays . }}
          OPTIONAL {{ ?location wdt:P2089 ?rainyDays . }}
          OPTIONAL {{ ?location wdt:P2090 ?seasons . }}
          
          # Weather station
          OPTIONAL {{ ?location wdt:P2091 ?weatherStation . }}
          
          # Geographic coordinates (if not in coord)
          OPTIONAL {{ ?location wdt:P625 ?coord . }}
          
          SERVICE wikibase:label {{ 
            bd:serviceParam wikibase:language "en" . 
          }}
        }}
        LIMIT 50
        """
        
        data = execute_sparql_query(query, f"Climate Data for {location_name}/1.0")
        if not data or not data["results"]["bindings"]:
            print(f"No climate data found for {location_name}")
            return pl.DataFrame()
        
        climate_records = []
        
        for binding in data["results"]["bindings"]:
            # Parse coordinates
            coord_value = safe_get_value(binding, "coord", str)
            coord_str = coord_value if isinstance(coord_value, str) else None
            latitude, longitude = parse_coordinates(coord_str)
            
            # Extract all climate-related data
            climate_data = {
                "location_name": safe_get_value(binding, "locationLabel", str),
                "location_description": safe_get_value(binding, "locationDescription", str),
                "latitude": latitude,
                "longitude": longitude,
                "elevation_m": safe_get_value(binding, "elevation", float),
                "timezone": safe_get_value(binding, "timezoneLabel", str),
                
                # Climate classification
                "climate_type": safe_get_value(binding, "climateLabel", str),
                "climate_description": safe_get_value(binding, "climateDescription", str),
                "köppen_climate": safe_get_value(binding, "köppenClimateLabel", str),
                
                # Temperature data
                "temperature": safe_get_value(binding, "temperatureLabel", str),
                "avg_temperature": safe_get_value(binding, "avgTempLabel", str),
                "max_temperature": safe_get_value(binding, "maxTempLabel", str),
                "min_temperature": safe_get_value(binding, "minTempLabel", str),
                
                # Precipitation data
                "precipitation": safe_get_value(binding, "precipitationLabel", str),
                "avg_precipitation": safe_get_value(binding, "avgPrecipitationLabel", str),
                "annual_precipitation": safe_get_value(binding, "annualPrecipitationLabel", str),
                
                # Other weather data
                "humidity": safe_get_value(binding, "humidityLabel", str),
                "wind_speed": safe_get_value(binding, "windSpeedLabel", str),
                "snowfall": safe_get_value(binding, "snowfallLabel", str),
                "sunshine_hours": safe_get_value(binding, "sunshineLabel", str),
                "frost_days": safe_get_value(binding, "frostDaysLabel", str),
                "heat_days": safe_get_value(binding, "heatDaysLabel", str),
                "rainy_days": safe_get_value(binding, "rainyDaysLabel", str),
                "seasons": safe_get_value(binding, "seasonsLabel", str),
                "weather_station": safe_get_value(binding, "weatherStationLabel", str),
            }
            
            climate_records.append(climate_data)
        
        df = pl.DataFrame(climate_records)
        
        if not df.is_empty():
            print(f"🌤️  Climate data found for {location_name}:")
            print(f"   Records: {len(df)}")
            
            # Display key climate information
            for record in df.iter_rows(named=True):
                if record.get("climate_type"):
                    print(f"   Climate: {record['climate_type']}")
                if record.get("köppen_climate"):
                    print(f"   Köppen: {record['köppen_climate']}")
                if record.get("avg_temperature"):
                    print(f"   Avg Temp: {record['avg_temperature']}")
                if record.get("annual_precipitation"):
                    print(f"   Annual Precip: {record['annual_precipitation']}")
                if record.get("elevation_m"):
                    print(f"   Elevation: {record['elevation_m']}m")
                break  # Show first record summary
        
        return df
    
    def get_enhanced_climate_data(location_name: str) -> dict:
        """
        Get enhanced climate data including seasonal patterns and weather extremes.
        """
        
        query = f"""
        SELECT DISTINCT 
          ?location ?locationLabel
          ?coord ?elevation ?timezone
          ?climate ?climateLabel
          ?köppenClimate ?köppenClimateLabel
          ?temperature ?temperatureLabel
          ?precipitation ?precipitationLabel
          ?humidity ?humidityLabel
          ?windSpeed ?windSpeedLabel
          ?snowfall ?snowfallLabel
          ?sunshine ?sunshineLabel
          ?frostDays ?frostDaysLabel
          ?heatDays ?heatDaysLabel
          ?rainyDays ?rainyDaysLabel
          ?seasons ?seasonsLabel
          ?weatherStation ?weatherStationLabel
          ?latitude ?longitude
          ?janTemp ?janTempLabel
          ?febTemp ?febTempLabel
          ?marTemp ?marTempLabel
          ?aprTemp ?aprTempLabel
          ?mayTemp ?mayTempLabel
          ?junTemp ?junTempLabel
          ?julTemp ?julTempLabel
          ?augTemp ?augTempLabel
          ?sepTemp ?sepTempLabel
          ?octTemp ?octTempLabel
          ?novTemp ?novTempLabel
          ?decTemp ?decTempLabel
        WHERE {{
          ?location rdfs:label "{location_name}"@en .
          ?location wdt:P31/wdt:P279* wd:Q515 .
          
          OPTIONAL {{ ?location wdt:P625 ?coord . }}
          OPTIONAL {{ ?location wdt:P2044 ?elevation . }}
          OPTIONAL {{ ?location wdt:P421 ?timezone . }}
          OPTIONAL {{ ?location wdt:P2564 ?climate . }}
          OPTIONAL {{ ?location wdt:P2927 ?köppenClimate . }}
          
          # Temperature data
          OPTIONAL {{ ?location wdt:P2076 ?temperature . }}
          OPTIONAL {{ ?location wdt:P2080 ?precipitation . }}
          OPTIONAL {{ ?location wdt:P2083 ?humidity . }}
          OPTIONAL {{ ?location wdt:P2084 ?windSpeed . }}
          OPTIONAL {{ ?location wdt:P2085 ?snowfall . }}
          OPTIONAL {{ ?location wdt:P2086 ?sunshine . }}
          OPTIONAL {{ ?location wdt:P2087 ?frostDays . }}
          OPTIONAL {{ ?location wdt:P2088 ?heatDays . }}
          OPTIONAL {{ ?location wdt:P2089 ?rainyDays . }}
          OPTIONAL {{ ?location wdt:P2090 ?seasons . }}
          OPTIONAL {{ ?location wdt:P2091 ?weatherStation . }}
          
          # Monthly temperature data (if available)
          OPTIONAL {{ ?location wdt:P2092 ?janTemp . }}
          OPTIONAL {{ ?location wdt:P2093 ?febTemp . }}
          OPTIONAL {{ ?location wdt:P2094 ?marTemp . }}
          OPTIONAL {{ ?location wdt:P2095 ?aprTemp . }}
          OPTIONAL {{ ?location wdt:P2096 ?mayTemp . }}
          OPTIONAL {{ ?location wdt:P2097 ?junTemp . }}
          OPTIONAL {{ ?location wdt:P2098 ?julTemp . }}
          OPTIONAL {{ ?location wdt:P2099 ?augTemp . }}
          OPTIONAL {{ ?location wdt:P2100 ?sepTemp . }}
          OPTIONAL {{ ?location wdt:P2101 ?octTemp . }}
          OPTIONAL {{ ?location wdt:P2102 ?novTemp . }}
          OPTIONAL {{ ?location wdt:P2103 ?decTemp . }}
          
          SERVICE wikibase:label {{ 
            bd:serviceParam wikibase:language "en" . 
          }}
        }}
        LIMIT 10
        """
        
        data = execute_sparql_query(query, f"Enhanced Climate Data for {location_name}/1.0")
        if not data or not data["results"]["bindings"]:
            return {}
        
        # Process the first binding (most complete record)
        binding = data["results"]["bindings"][0]
        
        # Parse coordinates
        coord_value = safe_get_value(binding, "coord", str)
        coord_str = coord_value if isinstance(coord_value, str) else None
        latitude, longitude = parse_coordinates(coord_str)
        
        # Build comprehensive climate data structure
        climate_info = {
            "location": {
                "name": safe_get_value(binding, "locationLabel", str),
                "latitude": latitude,
                "longitude": longitude,
                "elevation_m": safe_get_value(binding, "elevation", float),
                "timezone": safe_get_value(binding, "timezoneLabel", str),
            },
            "classification": {
                "climate_type": safe_get_value(binding, "climateLabel", str),
                "köppen_climate": safe_get_value(binding, "köppenClimateLabel", str),
            },
            "temperature": {
                "general": safe_get_value(binding, "temperatureLabel", str),
                "monthly": {
                    "january": safe_get_value(binding, "janTempLabel", str),
                    "february": safe_get_value(binding, "febTempLabel", str),
                    "march": safe_get_value(binding, "marTempLabel", str),
                    "april": safe_get_value(binding, "aprTempLabel", str),
                    "may": safe_get_value(binding, "mayTempLabel", str),
                    "june": safe_get_value(binding, "junTempLabel", str),
                    "july": safe_get_value(binding, "julTempLabel", str),
                    "august": safe_get_value(binding, "augTempLabel", str),
                    "september": safe_get_value(binding, "sepTempLabel", str),
                    "october": safe_get_value(binding, "octTempLabel", str),
                    "november": safe_get_value(binding, "novTempLabel", str),
                    "december": safe_get_value(binding, "decTempLabel", str),
                }
            },
            "precipitation": {
                "general": safe_get_value(binding, "precipitationLabel", str),
                "snowfall": safe_get_value(binding, "snowfallLabel", str),
                "rainy_days": safe_get_value(binding, "rainyDaysLabel", str),
            },
            "weather_patterns": {
                "humidity": safe_get_value(binding, "humidityLabel", str),
                "wind_speed": safe_get_value(binding, "windSpeedLabel", str),
                "sunshine_hours": safe_get_value(binding, "sunshineLabel", str),
                "frost_days": safe_get_value(binding, "frostDaysLabel", str),
                "heat_days": safe_get_value(binding, "heatDaysLabel", str),
                "seasons": safe_get_value(binding, "seasonsLabel", str),
            },
            "monitoring": {
                "weather_station": safe_get_value(binding, "weatherStationLabel", str),
            }
        }
        
        return climate_info
    
    def display_climate_summary(climate_data: dict):
        """Display climate data in a formatted summary."""
        if not climate_data:
            print("No climate data available")
            return
        
        print("🌤️  CLIMATE DATA SUMMARY")
        print("=" * 50)
        
        # Location info
        location = climate_data.get("location", {})
        if location.get("name"):
            print(f"📍 Location: {location['name']}")
        if location.get("latitude") and location.get("longitude"):
            print(f"   Coordinates: {location['latitude']:.4f}, {location['longitude']:.4f}")
        if location.get("elevation_m"):
            print(f"   Elevation: {location['elevation_m']}m")
        if location.get("timezone"):
            print(f"   Timezone: {location['timezone']}")
        
        print()
        
        # Climate classification
        classification = climate_data.get("classification", {})
        if classification.get("climate_type"):
            print(f"🌡️  Climate Type: {classification['climate_type']}")
        if classification.get("köppen_climate"):
            print(f"   Köppen Classification: {classification['köppen_climate']}")
        
        print()
        
        # Temperature data
        temperature = climate_data.get("temperature", {})
        if temperature.get("general"):
            print(f"🌡️  Temperature: {temperature['general']}")
        
        # Show monthly temperatures if available
        monthly = temperature.get("monthly", {})
        available_months = [k for k, v in monthly.items() if v]
        if available_months:
            print("   Monthly averages:")
            for month in available_months[:6]:  # Show first 6 months
                if monthly[month]:
                    print(f"     {month.capitalize()}: {monthly[month]}")
            if len(available_months) > 6:
                print(f"     ... and {len(available_months) - 6} more months")
        
        print()
        
        # Precipitation data
        precipitation = climate_data.get("precipitation", {})
        if precipitation.get("general"):
            print(f"🌧️  Precipitation: {precipitation['general']}")
        if precipitation.get("snowfall"):
            print(f"   Snowfall: {precipitation['snowfall']}")
        if precipitation.get("rainy_days"):
            print(f"   Rainy Days: {precipitation['rainy_days']}")
        
        print()
        
        # Weather patterns
        patterns = climate_data.get("weather_patterns", {})
        if patterns.get("humidity"):
            print(f"💧 Humidity: {patterns['humidity']}")
        if patterns.get("wind_speed"):
            print(f"💨 Wind Speed: {patterns['wind_speed']}")
        if patterns.get("sunshine_hours"):
            print(f"☀️  Sunshine: {patterns['sunshine_hours']}")
        if patterns.get("frost_days"):
            print(f"❄️  Frost Days: {patterns['frost_days']}")
        if patterns.get("heat_days"):
            print(f"🔥 Heat Days: {patterns['heat_days']}")
        if patterns.get("seasons"):
            print(f"🍂 Seasons: {patterns['seasons']}")
        
        print()
        
        # Monitoring
        monitoring = climate_data.get("monitoring", {})
        if monitoring.get("weather_station"):
            print(f"📡 Weather Station: {monitoring['weather_station']}")
    
    # Test the climate data functions
    print("🔍 GATHERING CLIMATE DATA...\n")
    
    # Test with Vilnius
    print("=== VILNIUS CLIMATE DATA ===")
    vilnius_climate_df = get_climate_data("Vilnius", "city")
    vilnius_enhanced = get_enhanced_climate_data("Vilnius")
    display_climate_summary(vilnius_enhanced)
    
    print("\n" + "="*60 + "\n")
    
    # Test with a major airport city
    print("=== LONDON CLIMATE DATA ===")
    london_climate_df = get_climate_data("London", "city")
    london_enhanced = get_enhanced_climate_data("London")
    display_climate_summary(london_enhanced)
    
    print("\n" + "="*60 + "\n")
    
    # Test with a different climate zone
    print("=== SINGAPORE CLIMATE DATA ===")
    singapore_climate_df = get_climate_data("Singapore", "city")
    singapore_enhanced = get_enhanced_climate_data("Singapore")
    display_climate_summary(singapore_enhanced)
    
    return (get_climate_data, get_enhanced_climate_data, display_climate_summary)


if __name__ == "__main__":
    app.run()
