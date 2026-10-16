import pytest

from fares import _Flight, day_fares


def flight(day: str, amount: float, currency: str, times: list[str]) -> _Flight:
    return _Flight.model_validate(
        {
            "departureDate": f"{day}T00:00:00",
            "price": {"amount": amount, "currencyCode": currency},
            "departureDates": [f"{day}T{t}:00" for t in times],
        }
    )


def test_converts_to_eur_and_keeps_first_departure():
    fares = day_fares([flight("2026-11-02", 36386.15, "HUF", ["17:30", "06:00"])], {"HUF": 363.8615})
    assert fares == {"2026-11-02": (100.0, "06:00")}


def test_skips_days_without_a_published_fare():
    flights = [flight("2026-11-01", 0, "EUR", ["05:55"]), flight("2026-11-03", 20, "EUR", [])]
    assert day_fares(flights, {"EUR": 1}) == {}


def test_unknown_currency_fails():
    with pytest.raises(ValueError, match="XYZ"):
        day_fares([flight("2026-11-02", 10, "XYZ", ["06:00"])], {"EUR": 1})
