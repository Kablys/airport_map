import pycountry
from rapidfuzz import process


def to_alpha2(country_name_or_code: str) -> str | None:
	if not country_name_or_code:
		return None
	text = country_name_or_code.strip()
	if len(text) == 2 and text.isalpha():
		return text.upper()
	return None
