from airlines import _LhSchedule, lufthansa_schedules


def test_turns_periods_into_weekdays_per_month():
    schedules = [
        _LhSchedule.model_validate(
            {
                # Mondays and Fridays, 27 Oct - 7 Nov 2026, FRA-PMI-FRA as one flight with two legs
                "periodOfOperationLT": {"startDate": "27OCT26", "endDate": "07NOV26", "daysOfOperation": "1   5  "},
                "legs": [{"origin": "FRA", "destination": "PMI"}, {"origin": "PMI", "destination": "FRA"}],
            }
        ),
        _LhSchedule.model_validate(
            {
                "periodOfOperationLT": {"startDate": "01NOV26", "endDate": "01NOV26", "daysOfOperation": "      7"},
                "legs": [{"origin": "FRA", "destination": "PMI"}],
            }
        ),
    ]
    assert lufthansa_schedules(schedules) == {
        "FRA-PMI": {"2026-10": "5", "2026-11": "157"},  # 27 Oct is a Tuesday
        "PMI-FRA": {"2026-10": "5", "2026-11": "15"},
    }


def test_ssim_reads_scheduled_passenger_legs_of_chosen_airlines():
    from datetime import date

    from airlines import ssim_periods, weekdays_by_month

    lines = [
        "3 HV 61151901J26JUN2626JUN26    5   AMS04450445+0200  AGP07450745+0200  73H",
        "3 HV 92761501J01NOV2608NOV26      7 BRI18051805+0100  BRU20352035+0100  73H",
        "3 HV 92771501F01NOV2608NOV26      7 BRI18051805+0100  BRU20352035+0100  73H",  # F: cargo
        "3 KL 12341501J01NOV2608NOV26      7 AMS18051805+0100  CDG20352035+0100  73H",
    ]
    assert weekdays_by_month(ssim_periods(lines, {"HV", "TO"}), since=date(2026, 7, 1)) == {"BRI-BRU": {"2026-11": "7"}}
