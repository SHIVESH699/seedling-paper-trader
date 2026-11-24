"""
Market session rules for India (NSE/BSE) and US (NYSE/NASDAQ).
Includes:
- Official 2026 NSE equity trading holidays (16 weekday closures)
- Tentative 2027 NSE equity trading holidays (lunar festival dates may shift +/- 1 day
  once NSE publishes its official 2027 circular)
- Official 2026 & 2027 NYSE/NASDAQ full-day holidays AND 1:00 PM ET early-close days
"""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
US_EASTERN = ZoneInfo("America/New_York")

IN_OPEN = time(9, 15)
IN_CLOSE = time(15, 30)

US_OPEN = time(9, 30)
US_CLOSE = time(16, 0)
US_EARLY_CLOSE = time(13, 0)

IN_HOLIDAYS_2026: dict[date, str] = {
    date(2026, 1, 15): "Municipal Corporation Election (Maharashtra)",
    date(2026, 1, 26): "Republic Day",
    date(2026, 3, 3): "Holi",
    date(2026, 3, 26): "Shri Ram Navami",
    date(2026, 3, 31): "Shri Mahavir Jayanti",
    date(2026, 4, 3): "Good Friday",
    date(2026, 4, 14): "Dr. Baba Saheb Ambedkar Jayanti",
    date(2026, 5, 1): "Maharashtra Day",
    date(2026, 5, 28): "Bakri Id (Eid-ul-Adha)",
    date(2026, 6, 26): "Muharram",
    date(2026, 9, 14): "Ganesh Chaturthi",
    date(2026, 10, 2): "Mahatma Gandhi Jayanti",
    date(2026, 10, 20): "Dussehra",
    date(2026, 11, 10): "Diwali - Balipratipada",
    date(2026, 11, 24): "Prakash Gurpurb Sri Guru Nanak Dev",
    date(2026, 12, 25): "Christmas",
}

IN_HOLIDAYS_2027: dict[date, str] = {
    date(2027, 1, 26): "Republic Day",
    date(2027, 3, 10): "Id-ul-Fitr (Ramzan Eid, tentative)",
    date(2027, 3, 22): "Holi (tentative)",
    date(2027, 3, 26): "Good Friday",
    date(2027, 4, 14): "Dr. Baba Saheb Ambedkar Jayanti",
    date(2027, 4, 15): "Shri Ram Navami (tentative)",
    date(2027, 4, 19): "Shri Mahavir Jayanti (tentative)",
    date(2027, 5, 17): "Bakri Id / Eid-ul-Adha (tentative)",
    date(2027, 6, 15): "Muharram (tentative)",
    date(2027, 10, 29): "Diwali - Laxmi Pujan (tentative)",
}

IN_HOLIDAYS: dict[date, str] = {**IN_HOLIDAYS_2026, **IN_HOLIDAYS_2027}

US_HOLIDAYS_2026: dict[date, str] = {
    date(2026, 1, 1): "New Year's Day",
    date(2026, 1, 19): "Martin Luther King, Jr. Day",
    date(2026, 2, 16): "Washington's Birthday (Presidents' Day)",
    date(2026, 4, 3): "Good Friday",
    date(2026, 5, 25): "Memorial Day",
    date(2026, 6, 19): "Juneteenth National Independence Day",
    date(2026, 7, 3): "Independence Day (Observed)",
    date(2026, 9, 7): "Labor Day",
    date(2026, 11, 26): "Thanksgiving Day",
    date(2026, 12, 25): "Christmas Day",
}

US_HOLIDAYS_2027: dict[date, str] = {
    date(2027, 1, 1): "New Year's Day",
    date(2027, 1, 18): "Martin Luther King, Jr. Day",
    date(2027, 2, 15): "Washington's Birthday (Presidents' Day)",
    date(2027, 3, 26): "Good Friday",
    date(2027, 5, 31): "Memorial Day",
    date(2027, 6, 18): "Juneteenth National Independence Day (Observed)",
    date(2027, 7, 5): "Independence Day (Observed)",
    date(2027, 9, 6): "Labor Day",
    date(2027, 11, 25): "Thanksgiving Day",
    date(2027, 12, 24): "Christmas Day (Observed)",
}

US_HOLIDAYS: dict[date, str] = {**US_HOLIDAYS_2026, **US_HOLIDAYS_2027}

US_EARLY_CLOSES: dict[date, str] = {
    date(2026, 11, 27): "Day after Thanksgiving (Early Close 13:00 ET)",
    date(2026, 12, 24): "Christmas Eve (Early Close 13:00 ET)",
    date(2027, 11, 26): "Day after Thanksgiving (Early Close 13:00 ET)",
}


def infer_market(symbol: str) -> tuple[str, str]:
    upper = symbol.upper().strip()
    if upper.endswith(".NS") or upper.endswith(".BO") or upper == "^NSEI":
        return "IN", "INR"
    return "US", "USD"


def get_market_status(market: str, now_utc: datetime | None = None) -> dict:
    if now_utc is None:
        now_utc = datetime.now(ZoneInfo("UTC"))

    if market == "IN":
        local_now = now_utc.astimezone(IST)
        today = local_now.date()
        is_weekday = local_now.weekday() < 5
        holiday_name = IN_HOLIDAYS.get(today)
        in_hours = IN_OPEN <= local_now.time() <= IN_CLOSE
        is_open = is_weekday and (holiday_name is None) and in_hours

        reason = "Regular session active (09:15–15:30 IST)"
        if not is_weekday:
            reason = "Weekend — NSE/BSE closed"
        elif holiday_name:
            reason = f"NSE/BSE holiday — {holiday_name}"
        elif not in_hours:
            reason = "Outside trading hours (09:15–15:30 IST)"

        return {
            "market": "IN",
            "exchanges": "NSE / BSE",
            "is_open": is_open,
            "is_early_close": False,
            "holiday_name": holiday_name,
            "local_time": local_now.strftime("%Y-%m-%d %H:%M:%S %Z"),
            "session": "09:15–15:30 IST",
            "reason": reason,
        }

    local_now = now_utc.astimezone(US_EASTERN)
    today = local_now.date()
    is_weekday = local_now.weekday() < 5
    holiday_name = US_HOLIDAYS.get(today)
    early_close_name = US_EARLY_CLOSES.get(today)
    close_time = US_EARLY_CLOSE if early_close_name else US_CLOSE
    in_hours = US_OPEN <= local_now.time() <= close_time
    is_open = is_weekday and (holiday_name is None) and in_hours

    session_str = "09:30–13:00 ET (Early Close)" if early_close_name else "09:30–16:00 ET"
    if not is_weekday:
        reason = "Weekend — NYSE/NASDAQ closed"
    elif holiday_name:
        reason = f"US market holiday — {holiday_name}"
    elif is_open and early_close_name:
        reason = f"Early-close session active — {early_close_name}"
    elif is_open:
        reason = "Regular session active (09:30–16:00 ET)"
    elif early_close_name:
        reason = f"Closed — {early_close_name}"
    else:
        reason = "Outside trading hours (09:30–16:00 ET)"

    return {
        "market": "US",
        "exchanges": "NYSE / NASDAQ",
        "is_open": is_open,
        "is_early_close": bool(early_close_name),
        "holiday_name": holiday_name,
        "early_close_reason": early_close_name,
        "local_time": local_now.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "session": session_str,
        "reason": reason,
    }
