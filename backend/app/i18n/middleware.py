"""Middleware: deteksi bahasa dari ?lang= atau Accept-Language header.
Hasil dipasang ke request.state.lang.
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.i18n.catalog import AVAILABLE_LANGS, DEFAULT_LANG, parse_accept_language


class LanguageMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        lang = request.query_params.get("lang", "").lower()
        if lang not in AVAILABLE_LANGS:
            lang = parse_accept_language(request.headers.get("accept-language"))

        request.state.lang = lang or DEFAULT_LANG

        response = await call_next(request)
        response.headers["Content-Language"] = request.state.lang
        return response


def get_lang(request: Request) -> str:
    return getattr(request.state, "lang", DEFAULT_LANG)
