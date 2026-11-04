"""Explicit offline boundary; normal/manual live runs keep their existing behavior."""
import socket
import sys

import pytest


def pytest_addoption(parser):
    parser.addoption("--offline", action="store_true", help="Reject network access and live tests")


@pytest.hookimpl(trylast=True)
def pytest_collection_modifyitems(config, items):
    if config.getoption("--offline") and any(item.get_closest_marker("live") for item in items):
        raise pytest.UsageError('Offline runs must select -m "not live"; live gates are separate')


def block_network(monkeypatch):
    if getattr(socket.socket.connect, "_shelfready_offline", False):
        return
    original = socket.socket.connect
    socketpair_code = getattr(getattr(socket, "_fallback_socketpair", None), "__code__", None)

    def connect(sock, address):
        if sock.family in (socket.AF_INET, socket.AF_INET6):
            # Windows asyncio implements its self-pipe through this exact stdlib
            # socketpair function. Ordinary loopback connections remain forbidden.
            if sys._getframe(1).f_code is socketpair_code and address[0] in ("127.0.0.1", "::1"):
                return original(sock, address)
            raise RuntimeError("Network access forbidden in offline tests")
        return original(sock, address)

    def deny(*args, **kwargs):
        raise RuntimeError("Network access forbidden in offline tests")

    connect._shelfready_offline = True
    monkeypatch.setattr(socket.socket, "connect", connect)
    monkeypatch.setattr(socket.socket, "connect_ex", deny)
    monkeypatch.setattr(socket.socket, "sendto", deny)
    monkeypatch.setattr(socket, "getaddrinfo", deny)


@pytest.fixture(autouse=True)
def offline_boundary(request, monkeypatch):
    if request.config.getoption("--offline"):
        block_network(monkeypatch)
