import math
import httpx
import polars as pl

def execute_sparql_query(query: str, user_agent: str = "Wikidata Query/1.0") -> dict | None:
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

def safe_get_value(binding: dict, key: str, value_type: type = str) -> str | int | float | None:
    """Safely extract value from SPARQL binding with type conversion."""
    # Get the value from the binding, handling the fact that keys are optional
    sparql_value = binding.get(key)
    if sparql_value is not None:
        value: str = sparql_value["value"]  # type: ignore[misc] # SPARQL values are always strings
        if value_type == int:
            return int(value)
        elif value_type == float:
            return float(value)
        return value
    return None

def parse_coordinates(coord_str: str | None) -> tuple[float | None, float | None]:
    """Parse Wikidata coordinate string 'Point(longitude latitude)' to lat/lon."""
    if not coord_str:
        return None, None
    coords = coord_str.replace("Point(", "").replace(")", "").split()
    return float(coords[1]), float(coords[0])  # latitude, longitude


def haversine_distance(lat1: float | None, lon1: float | None, lat2: float | None, lon2: float | None) -> float | None:
    """Calculate the great circle distance between two points on Earth in kilometers."""
    if any(coord is None for coord in [lat1, lon1, lat2, lon2]):
        return None

    # Ensure all coordinates are not None before proceeding
    assert lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None

    # Convert decimal degrees to radians
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    # Radius of Earth in kilometers
    r = 6371

    return c * r

def calculate_airport_city_distances(airports_df: "pl.DataFrame", city_df: "pl.DataFrame") -> "pl.DataFrame":
    """Calculate distances from airports to city center."""
    if len(city_df) == 0 or city_df["latitude"][0] is None:
        print("No city coordinates available for distance calculation")
        return airports_df

    city_lat = city_df["latitude"][0]
    city_lon = city_df["longitude"][0]
    city_name = city_df["name"][0]

    # Calculate distances for each airport
    distances: list[float | None] = []
    for row in airports_df.iter_rows(named=True):
        distance = haversine_distance(
            row["latitude"], row["longitude"],
            city_lat, city_lon
        )
        distances.append(distance)

    # Add distance column to airports dataframe
    column_name = f"distance_to_{city_name.lower().replace(' ', '_')}_km"
    airports_with_distance = airports_df.with_columns(
        pl.Series(column_name, distances)
    )

    return airports_with_distance.sort(column_name)
