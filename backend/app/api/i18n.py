"""i18n API — expose catalog ke frontend (dapat dipanggil sekali saat boot)."""
from fastapi import APIRouter, Request

from app.i18n.catalog import CATALOG, available_languages, DEFAULT_LANG
from app.i18n.middleware import get_lang

router = APIRouter(prefix="/i18n", tags=["i18n"])


@router.get("/languages")
def list_languages():
    return {
        "default": DEFAULT_LANG,
        "available": available_languages(),
    }


@router.get("/catalog/{lang}")
def get_catalog(lang: str):
    """Return semua string untuk lang. Frontend cache lokal."""
    if lang not in CATALOG:
        lang = DEFAULT_LANG
    return {
        "lang": lang,
        "strings": CATALOG[lang],
    }


@router.get("/current")
def current_language(request: Request):
    return {"lang": get_lang(request)}
