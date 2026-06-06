"""Adapter per provider proxy. Tambah provider baru di sini."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List

from app.config import settings


@dataclass(frozen=True)
class ProxyEndpoint:
    url: str  # mis. "http://user:pass@gw.bright.example.com:22225"
    label: str  # mis. "brightdata-id-residential-01"
    country: str | None = None
    sticky: bool = False


class ProxyProvider(ABC):
    @abstractmethod
    def endpoints(self) -> List[ProxyEndpoint]: ...


class BrightDataProvider(ProxyProvider):
    """Bright Data residential.
    Endpoint format: http://USERNAME-zone-ZONE-country-COUNTRY[-session-ID]:PASSWORD@brd.superproxy.io:22225
    """

    def endpoints(self) -> List[ProxyEndpoint]:
        user = settings.BRIGHT_DATA_USERNAME
        pwd = settings.BRIGHT_DATA_PASSWORD
        zone = settings.BRIGHT_DATA_ZONE or "residential"
        country = settings.BRIGHT_DATA_COUNTRY or "id"
        gateway = settings.BRIGHT_DATA_GATEWAY or "brd.superproxy.io:22225"
        pool_size = settings.BRIGHT_DATA_POOL_SIZE or 5

        if not (user and pwd):
            return []

        out = []
        for i in range(pool_size):
            uname = f"{user}-zone-{zone}-country-{country}-session-rand{i}"
            url = f"http://{uname}:{pwd}@{gateway}"
            out.append(ProxyEndpoint(url=url, label=f"brightdata-{country}-{i:02d}", country=country, sticky=True))
        return out


class OxylabsProvider(ProxyProvider):
    """Oxylabs residential.
    Endpoint: http://customer-USER-cc-COUNTRY:PASS@pr.oxylabs.io:7777
    """

    def endpoints(self) -> List[ProxyEndpoint]:
        user = settings.OXYLABS_USERNAME
        pwd = settings.OXYLABS_PASSWORD
        country = settings.OXYLABS_COUNTRY or "ID"
        pool_size = settings.OXYLABS_POOL_SIZE or 5

        if not (user and pwd):
            return []

        out = []
        for i in range(pool_size):
            uname = f"customer-{user}-cc-{country}-sessid-{i:04d}"
            url = f"http://{uname}:{pwd}@pr.oxylabs.io:7777"
            out.append(ProxyEndpoint(url=url, label=f"oxylabs-{country}-{i:02d}", country=country, sticky=True))
        return out


class IPRoyalProvider(ProxyProvider):
    """IPRoyal residential.
    Endpoint: http://USER:PASS_country-COUNTRY_session-SESSION@geo.iproyal.com:12321
    """

    def endpoints(self) -> List[ProxyEndpoint]:
        user = settings.IPROYAL_USERNAME
        pwd = settings.IPROYAL_PASSWORD
        country = settings.IPROYAL_COUNTRY or "id"
        pool_size = settings.IPROYAL_POOL_SIZE or 5

        if not (user and pwd):
            return []

        out = []
        for i in range(pool_size):
            pwd_with_opts = f"{pwd}_country-{country}_session-{i:04d}"
            url = f"http://{user}:{pwd_with_opts}@geo.iproyal.com:12321"
            out.append(ProxyEndpoint(url=url, label=f"iproyal-{country}-{i:02d}", country=country, sticky=True))
        return out


class StaticListProvider(ProxyProvider):
    """Manual list. Format env: PROXY_STATIC_LIST=http://x:y@1.2.3.4:8080,http://...
    Cocok untuk dev / testing / free proxy.
    """

    def endpoints(self) -> List[ProxyEndpoint]:
        raw = (settings.PROXY_STATIC_LIST or "").strip()
        if not raw:
            return []
        urls = [u.strip() for u in raw.split(",") if u.strip()]
        return [ProxyEndpoint(url=u, label=f"static-{i:02d}") for i, u in enumerate(urls)]


PROVIDERS: dict[str, type[ProxyProvider]] = {
    "bright_data": BrightDataProvider,
    "oxylabs": OxylabsProvider,
    "iproyal": IPRoyalProvider,
    "static_list": StaticListProvider,
}


def build_provider(name: str) -> ProxyProvider:
    cls = PROVIDERS.get(name)
    if not cls:
        raise ValueError(f"Unknown proxy provider: {name}. Available: {list(PROVIDERS)}")
    return cls()
