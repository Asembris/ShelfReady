"""Validate Caddy with its literal service environment; never source it in a shell."""
import os
from pathlib import Path
import subprocess

from dotenv import dotenv_values


def validate(environment_file=Path('/etc/shelfready/caddy.env'), *, judge=False):
    settings = dotenv_values(environment_file, interpolate=False)
    required = ('DEMO_DOMAIN',) if judge else ('DEMO_DOMAIN', 'DEMO_USER', 'DEMO_PASSWORD_HASH')
    if any(not settings.get(k) for k in required):
        raise ValueError('Caddy demo environment is incomplete')
    subprocess.run(['caddy', 'validate', '--config', '/etc/caddy/Caddyfile',
                    '--adapter', 'caddyfile'], check=True,
                   env={**os.environ, **{k: v for k, v in settings.items() if v is not None}})


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--judge', action='store_true')
    validate(judge=parser.parse_args().judge)
