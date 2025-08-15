import os
import json
import time
import ssl
import urllib.parse
import urllib.request
import urllib.error
from typing import Any

_DEFAULT_TIMEOUT = 30


def _headers() -> dict[str, str]:
	return {
		"User-Agent": os.environ.get("HTTP_USER_AGENT", "travel-data-toolkit/1.0 (+https://example.com)"),
		"Accept": "application/json, text/plain, */*",
	}


def _request(url: str, params: dict[str, Any] | None = None, timeout: int | None = None) -> bytes:
	query = urllib.parse.urlencode(params or {}, doseq=True)
	full = url + ("?" + query if query else "")
	retries = 4
	backoff = 0.5
	last_exc: Exception | None = None
	context: ssl.SSLContext | None = None
	used_unverified = False
	for _ in range(retries):
		try:
			req = urllib.request.Request(full, headers=_headers())
			with urllib.request.urlopen(req, timeout=timeout or _DEFAULT_TIMEOUT, context=context) as resp:
				return resp.read()
		except Exception as e:
			last_exc = e
			# On SSL cert errors, retry once with unverified context
			if not used_unverified and (
				isinstance(e, ssl.SSLCertVerificationError)
				or (isinstance(e, urllib.error.URLError) and isinstance(getattr(e, 'reason', None), ssl.SSLCertVerificationError))
			):
				context = ssl._create_unverified_context()
				used_unverified = True
				continue
			time.sleep(backoff)
			backoff *= 2
	if last_exc:
		raise last_exc
	return b""


def get_json(url: str, params: dict[str, Any] | None = None, timeout: int | None = None):
	data = _request(url, params=params, timeout=timeout)
	return json.loads(data.decode('utf-8'))


def get_text(url: str, params: dict[str, Any] | None = None, timeout: int | None = None) -> str:
	data = _request(url, params=params, timeout=timeout)
	return data.decode('utf-8', errors='replace')
