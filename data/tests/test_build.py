import polars as pl

import pytest

from airlines import AirlineNetwork, AirportInfo
from build import AirlineConfig, load_config, merge

CONFIG = {
    "FR": AirlineConfig(name="Ryanair", primary="#073590", secondary="#F1C933"),
    "W6": AirlineConfig(name="Wizz Air", primary="#D3007F", secondary="#312782"),
}

REFERENCE = pl.DataFrame(
    {
        "code": ["STN", "VNO", "BCN", "BSL"],
        "lat": [51.885, 54.6341, 41.2971, 47.59],
        "lng": [0.235, 25.2858, 2.0785, 7.5291],
        "country": ["United Kingdom", "Lithuania", "Spain", "France"],
        "iso_country": ["GB", "LT", "ES", "FR"],
    }
)


def test_merge_combines_airlines_and_drops_unknown_airports():
    fr = AirlineNetwork(
        code="FR",
        airports={"STN": AirportInfo(name="London Stansted", city="London")},
        routes={"STN": {"VNO", "XXX"}, "VNO": {"STN"}},
    )
    w6 = AirlineNetwork(
        code="W6",
        airports={
            "STN": AirportInfo(name="Wizz name ignored", city="London"),
            "BCN": AirportInfo(name="Barcelona", city="Barcelona"),
        },
        routes={"VNO": {"STN", "BCN"}, "MLH": {"VNO"}, "BSL": {"VNO"}},  # same airport under both codes
    )

    airports, routes, airlines = merge([fr, w6], REFERENCE, CONFIG)

    assert routes == {
        "BSL": {"VNO": ["W6"]},  # MLH is an alias of BSL
        "STN": {"VNO": ["FR"]},
        "VNO": {"BCN": ["W6"], "STN": ["FR", "W6"]},
    }
    assert [a["code"] for a in airports] == ["BCN", "BSL", "STN", "VNO"]
    stn = next(a for a in airports if a["code"] == "STN")
    assert stn == {
        "name": "London Stansted",
        "code": "STN",
        "city": "London",
        "country": "United Kingdom",
        "lat": 51.885,
        "lng": 0.235,
        "flag": "🇬🇧",
    }
    vno = next(a for a in airports if a["code"] == "VNO")
    assert vno["name"] == "VNO"  # no airline named it: falls back to the code
    assert airlines == [
        {"code": "FR", "name": "Ryanair", "colors": {"primary": "#073590", "secondary": "#F1C933"}},
        {"code": "W6", "name": "Wizz Air", "colors": {"primary": "#D3007F", "secondary": "#312782"}},
    ]


def test_merge_requires_config_for_every_airline():
    with pytest.raises(ValueError, match="VY"):
        merge([AirlineNetwork(code="VY", airports={}, routes={})], REFERENCE, CONFIG)


def test_config_file_is_valid():
    config = load_config()
    assert {"FR", "W6", "VY", "V7"} <= config.keys()
