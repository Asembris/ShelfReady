#!/bin/sh
# Align the host firewall with the approved provider firewall; never disable UFW.
set -eu
test "$(id -u)" = 0
test "$#" = 3
case "$1" in control|runner) role="$1" ;; *) exit 2 ;; esac
python3 - "$2" "$3" <<'PY'
import ipaddress,sys
for value in sys.argv[1:]:
    network=ipaddress.IPv4Network(value)
    if network.prefixlen!=32 or not network.network_address.is_global:
        raise ValueError('Only approved public IPv4 /32 SSH sources are allowed')
PY
ufw status | head -n 1 | grep -qx 'Status: active'
# Install narrow rules first so management access remains available.
ufw insert 1 allow proto tcp from "$2" to any port 22
if test "$role" = runner; then
    ufw insert 1 allow proto tcp from "$3" to any port 22
fi
# Remove the vendor default unrestricted IPv4/IPv6 SSH allowance.
ufw --force delete allow 22/tcp
if test "$role" = control; then
    ufw allow proto tcp from 0.0.0.0/0 to any port 80
    ufw allow proto tcp from 0.0.0.0/0 to any port 443
fi
ufw status numbered
