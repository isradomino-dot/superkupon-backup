"""Unified extractor: LLM-first dengan regex fallback.

Strategy:
  1. Coba LLM (Claude API) — coverage tinggi, biaya per call kecil
  2. Kalau LLM unavailable / empty / error → fallback regex
  3. Merge results, dedup by (code, title prefix)
"""
from __future__ import annotations

import logging
from typing import List

from app.config import settings
from app.ml.llm_extractor import LLMExtractor
from app.ml.regex_extractor import extract_regex
from app.schemas import CouponRaw

logger = logging.getLogger(__name__)

_llm = LLMExtractor()


def extract_coupons(text: str, source_target: str = "ml") -> List[CouponRaw]:
    """Extract coupons dari unstructured text."""
    if not text or len(text.strip()) < 10:
        return []

    results: List[CouponRaw] = []

    if _llm.is_configured:
        try:
            results = _llm.extract(text, source_target)
            if results:
                logger.debug(f"LLM extracted {len(results)} coupons from {len(text)}ch")
        except Exception as e:
            logger.warning(f"LLM extract crashed, falling back to regex: {e}")

    if not results and settings.LLM_FALLBACK_REGEX:
        results = extract_regex(text, source_target)
        if results:
            logger.debug(f"Regex extracted {len(results)} coupons from {len(text)}ch")

    return _dedup(results)


def _dedup(items: List[CouponRaw]) -> List[CouponRaw]:
    seen: set[tuple[str, str]] = set()
    out: List[CouponRaw] = []
    for it in items:
        key = ((it.code or "").upper(), it.title[:48].lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out
