from schedules import _LowestFares, flying_days, weekdays


def test_keeps_bookable_days_and_groups_weekdays_by_month():
    calendar = _LowestFares.model_validate(
        {
            "months": [
                {
                    "year": 2026,
                    "month": 11,
                    "days": [
                        {"day": 2, "lowestFare": 42.99, "flightStatus": 2},  # Monday
                        {"day": 3, "lowestFare": None, "flightStatus": 0},
                        {"day": 6, "lowestFare": 30.0, "flightStatus": 2},  # Friday
                    ],
                },
                {"year": 2026, "month": 12, "days": [{"day": 6, "lowestFare": 25.5, "flightStatus": 2}]},  # Sunday
            ]
        }
    )
    days = flying_days(calendar)
    assert days == {"2026-11-02": 42.99, "2026-11-06": 30.0, "2026-12-06": 25.5}
    assert weekdays(days) == {"2026-11": "15", "2026-12": "7"}
