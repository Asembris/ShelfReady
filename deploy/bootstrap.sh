#!/bin/sh
# Trusted bootstrap only. Keep cloud firewalls SSH-only until all private gates pass.
set -eu
test "$(id -u)" = 0
case "$1" in control|runner) role="$1" ;; *) exit 2 ;; esac
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg python3 python3-venv docker.io docker-compose-v2
systemctl enable --now docker
test "$(stat -fc %T /sys/fs/cgroup)" = cgroup2fs
cat > /etc/ssh/sshd_config.d/00-shelfready.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh
if test "$role" = runner; then
    useradd --create-home --shell /bin/sh dispatcher
    usermod -aG docker dispatcher
    chown root:root /home/dispatcher
    chmod 0755 /home/dispatcher
    install -d -o root -g root -m 0755 /home/dispatcher/.ssh /opt/shelfready-runner/shelfready
    docker pull python:3.12.12-slim-bookworm@sha256:593bd06efe90efa80dc4eee3948be7c0fde4134606dd40d8dd8dbcade98e669c
else
    useradd --system --create-home --home-dir /var/lib/shelfready --shell /usr/sbin/nologin shelfready
    usermod -aG docker shelfready
    install -d -o root -g root -m 0755 /opt/shelfready
    install -d -o shelfready -g shelfready -m 0700 /opt/shelfready/.runtime /opt/shelfready/artifacts
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key -o /tmp/caddy.gpg
    gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg /tmp/caddy.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list
    chmod 0644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
    # Prevent even a default HTTP site from starting before configuration.
    systemctl mask caddy.service
    apt-get update -qq
    apt-get install -y -qq caddy
    rm /tmp/caddy.gpg
fi
python3 --version
docker --version
docker compose version
docker info --format '{{.CgroupVersion}}'
