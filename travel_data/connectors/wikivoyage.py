from __future__ import annotations
from typing import Any
import re
from ..utils.http import get_text

BASE = 'https://en.wikivoyage.org/wiki/'


def page_title(city: str) -> str:
	return city.replace(' ', '_')


def extract_sections(city: str) -> dict[str, Any]:
	url = BASE + page_title(city)
	html = get_text(url)
	result: dict[str, Any] = {}
	# Find spans with class mw-headline and capture their id/name
	for m in re.finditer(r'<span[^>]*class="[^"]*mw-headline[^"]*"[^>]*>(.*?)</span>', html, flags=re.I|re.S):
		name = re.sub('<[^<]+?>', '', m.group(1)).strip()
		# Capture paragraphs until next headline or h tag
		post = html[m.end():]
		paragraphs = []
		for p in re.finditer(r'<p>(.*?)</p>', post, flags=re.I|re.S):
			# Stop if a new headline appears before this paragraph
			head_idx = re.search(r'<h[1-6][^>]*>', post[:p.start()], flags=re.I)
			if head_idx:
				break
			text = re.sub('<[^<]+?>', '', p.group(1))
			text = re.sub(r'\s+', ' ', text).strip()
			if text:
				paragraphs.append(text)
		if paragraphs:
			result[name] = '\n'.join(paragraphs)
	return result