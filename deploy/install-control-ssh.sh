#!/bin/sh
# Run as root on CONTROL only, after verifying the runner host fingerprint
# through the Vultr console. Arguments are paths, never credential contents.
set -eu
test "$(id -u)" = 0
test "$#" = 2
getent passwd shelfready >/dev/null
test -f "$1"
test -s "$2"
# Validate a dedicated unencrypted service key without printing it.
ssh-keygen -y -P '' -f "$1" >/dev/null
install -d -o root -g shelfready -m 0750 /etc/shelfready
install -d -o root -g shelfready -m 0750 /etc/shelfready/ssh
install -o shelfready -g shelfready -m 0400 "$1" /etc/shelfready/ssh/runner_ed25519
install -o root -g shelfready -m 0640 "$2" /etc/shelfready/ssh/known_hosts
runuser -u shelfready -- test -r /etc/shelfready/ssh/runner_ed25519
runuser -u shelfready -- test -r /etc/shelfready/ssh/known_hosts
# Checks service-account key access; real SSH execution is a separate live gate.
runuser -u shelfready -- ssh-keygen -y -P '' -f /etc/shelfready/ssh/runner_ed25519 >/dev/null
