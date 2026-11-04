import socket

import pytest

from conftest import block_network


def test_offline_guard_preserves_stdlib_socketpair(monkeypatch):
    block_network(monkeypatch)
    a, b = socket.socketpair()
    try:
        a.send(b"x")
        assert b.recv(1) == b"x"
    finally:
        a.close()
        b.close()


def test_offline_guard_rejects_ip_dns_and_datagrams(monkeypatch):
    block_network(monkeypatch)
    with socket.socket() as sock:
        with pytest.raises(RuntimeError, match="Network access forbidden"):
            sock.connect(("127.0.0.1", 9))
        with pytest.raises(RuntimeError, match="Network access forbidden"):
            sock.connect_ex(("127.0.0.1", 9))
    with pytest.raises(RuntimeError, match="Network access forbidden"):
        socket.getaddrinfo("example.invalid", 443)
    with socket.socket(type=socket.SOCK_DGRAM) as sock:
        with pytest.raises(RuntimeError, match="Network access forbidden"):
            sock.sendto(b"synthetic", ("127.0.0.1", 9))
