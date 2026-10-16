import math
from collections.abc import Callable

import httpx


def execute_sparql_query(query: str, user_agent: str = "Wikidata Query/1.0") -> dict:
    """Execute a SPARQL query against Wikidata and return JSON response."""
    headers = {"User-Agent": user_agent, "Accept": "application/sparql-results+json"}
    params = {"query": query, "format": "json"}

    response = httpx.get("https://query.wikidata.org/sparql", params=params, headers=headers, timeout=30.0)
    return response.raise_for_status().json()


def safe_get_value[T](binding: dict, key: str, value_type: Callable[[str], T]) -> T | None:
    """Extract an optional SPARQL binding value, converted with value_type (e.g. str, int, float)."""
    sparql_value = binding.get(key)
    return None if sparql_value is None else value_type(sparql_value["value"])


def parse_coordinates(coord_str: str | None) -> tuple[float | None, float | None]:
    """Parse Wikidata coordinate string 'Point(longitude latitude)' to lat/lon."""
    if not coord_str:
        return None, None
    coords = coord_str.replace("Point(", "").replace(")", "").split()
    return float(coords[1]), float(coords[0])  # latitude, longitude


def haversine_distance(lat1: float | None, lon1: float | None, lat2: float | None, lon2: float | None) -> float | None:
    """Calculate the great circle distance between two points on Earth in kilometers."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None

    # Convert decimal degrees to radians
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    # Radius of Earth in kilometers
    r = 6371

    return c * r
