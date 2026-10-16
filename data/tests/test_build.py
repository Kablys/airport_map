import polars as pl

from airlines import AirlineNetwork, AirportInfo
from build import merge

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
        name="Ryanair",
        airports={"STN": AirportInfo(name="London Stansted", city="London")},
        routes={"STN": {"VNO", "XXX"}, "VNO": {"STN"}},
    )
    w6 = AirlineNetwork(
        code="W6",
        name="Wizz Air",
        airports={
            "STN": AirportInfo(name="Wizz name ignored", city="London"),
            "BCN": AirportInfo(name="Barcelona", city="Barcelona"),
        },
        routes={"VNO": {"STN", "BCN"}, "MLH": {"VNO"}, "BSL": {"VNO"}},  # same airport under both codes
    )

    airports, routes, airlines = merge([fr, w6], REFERENCE)

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
    assert airlines == [{"code": "FR", "name": "Ryanair"}, {"code": "W6", "name": "Wizz Air"}]
