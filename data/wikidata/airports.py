import marimo

__generated_with = "0.14.17"
app = marimo.App(width="full")

with app.setup:
    # Initialization code that runs before all other cells
    import json
    from pathlib import Path

    import polars as pl
    from utils import execute_sparql_query, haversine_distance, parse_coordinates, safe_get_value


@app.cell
def _():
    with open(Path(__file__).parents[1] / "prod" / "airports.json") as f:
        airports_data: list = json.load(f)

    # Extract all IATA codes
    all_iata_codes: list[str] = [airport["code"] for airport in airports_data]

    print(f"Found {len(all_iata_codes)} airports in production data")
    print(f"First 10 IATA codes: {all_iata_codes[:10]}")

    return (all_iata_codes,)


@app.cell
def _(all_iata_codes: list[str]):
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

        # Extract data for polars DataFrame
        airports_data = []
        for binding in data["results"]["bindings"]:
            coord_value = safe_get_value(binding, "coord", str)
            coord_str = coord_value if isinstance(coord_value, str) else None
            latitude, longitude = parse_coordinates(coord_str)

            name_value = safe_get_value(binding, "airportLabel", str)
            iata_value = safe_get_value(binding, "iata", str)

            airport_data = {
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

    wikidata_airports(all_iata_codes[:20])
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
        if not data["results"]["bindings"]:
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

    vilnius_data = wikidata_city_data("Vilnius")
    vilnius_data
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
        if not data["results"]["bindings"]:
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

    lithuania_data = wikidata_country_data("Lithuania")
    lithuania_data
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

    if airport_data["results"]["bindings"]:
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

    if city_data["results"]["bindings"]:
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
    distance = haversine_distance(airport_lat, airport_lon, city_lat, city_lon)
    if distance is not None:
        print("\nDistance from Vilnius Airport to Vilnius City Center:")
        print(f"  {distance:.2f} kilometers")
        print(f"  {distance * 0.621371:.2f} miles")
    else:
        print("\nCould not calculate distance - missing coordinate data")

    return


@app.cell
def _():
    from collections import defaultdict

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
          OPTIONAL {{ ?airport wdt:P931 ?city . ?airport wdt:P31/wdt:P279* wd:Q1248784 . }}
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
        if not data["results"]["bindings"]:
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

    for category, data in vilnius_comprehensive.items():
        print(f"📍 {category.upper().replace('_', ' ')}")
        for key, value in data.items():
            if value is not None and (not isinstance(value, list) or value):
                shown = ", ".join(map(str, value)) if isinstance(value, list) else value
                print(f"  {key.replace('_', ' ').title()}: {shown}")
        print()

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
        if not entity_data["results"]["bindings"]:
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
        if not data["results"]["bindings"]:
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

            properties[category].append(
                {"property_id": prop_id, "property_name": prop_label, "value": value_label, "raw_value": value}
            )

            property_stats[category] += 1

        return {
            "entity_id": entity_id,
            "entity_name": entity_name,
            "total_properties": len(data["results"]["bindings"]),
            "categories": dict(properties),
            "category_stats": dict(property_stats),
        }

    def categorize_property(prop_label: str, prop_id: str) -> str:
        """Categorize properties based on their labels and common patterns."""
        label_lower = prop_label.lower()

        # Geographic properties
        if any(
            geo_term in label_lower
            for geo_term in ["coordinate", "location", "elevation", "area", "timezone", "climate", "continent"]
        ):
            return "geography"

        # Demographic properties
        if any(
            demo_term in label_lower for demo_term in ["population", "density", "demographic", "inhabitant", "resident"]
        ):
            return "demographics"

        # Administrative/Government
        if any(
            admin_term in label_lower
            for admin_term in [
                "country",
                "state",
                "province",
                "region",
                "administrative",
                "government",
                "capital",
                "mayor",
                "head",
            ]
        ):
            return "administration"

        # Historical/Temporal
        if any(
            time_term in label_lower
            for time_term in ["founded", "established", "inception", "start", "end", "date", "time", "year", "century"]
        ):
            return "history"

        # Economic
        if any(
            econ_term in label_lower
            for econ_term in ["gdp", "economy", "economic", "currency", "income", "unemployment", "budget"]
        ):
            return "economy"

        # Cultural/Social
        if any(
            culture_term in label_lower
            for culture_term in ["language", "religion", "culture", "ethnic", "festival", "tradition", "heritage"]
        ):
            return "culture"

        # Infrastructure/Transport
        if any(
            infra_term in label_lower
            for infra_term in [
                "airport",
                "station",
                "transport",
                "road",
                "railway",
                "port",
                "university",
                "hospital",
                "school",
            ]
        ):
            return "infrastructure"

        # Identifiers and codes
        if any(
            id_term in label_lower
            for id_term in ["code", "identifier", "id", "iso", "postal", "phone", "website", "url"]
        ):
            return "identifiers"

        # Relationships
        if any(
            rel_term in label_lower
            for rel_term in ["twin", "sister", "partner", "member", "part", "contains", "located", "adjacent"]
        ):
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
        print("\n" + "=" * 60 + "\n")

        # Sort categories by number of properties (most to least)
        sorted_categories = sorted(properties_data["categories"].items(), key=lambda x: len(x[1]), reverse=True)

        for category, props in sorted_categories:
            count = properties_data["category_stats"][category]
            print(f"📍 {category.upper()} ({count} properties)")
            print("-" * 40)

            # Group properties by name to handle multiple values
            prop_groups = defaultdict(list)
            for prop in props:
                prop_groups[prop["property_name"]].append(prop)

            for prop_name, prop_list in list(prop_groups.items())[:10]:  # Show max 10 properties per category
                prop_id = prop_list[0]["property_id"]
                values = [p["value"] for p in prop_list[:max_values_per_property]]

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


if __name__ == "__main__":
    app.run()
