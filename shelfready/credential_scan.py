"""Scan tracked bytes without printing known secrets or matching source lines."""
from pathlib import Path
import re
import subprocess

from dotenv import dotenv_values


def main():
    secrets = [v.encode() for k, v in dotenv_values('.env').items()
               if v and len(v) >= 12 and re.search('KEY|PASSWORD|TOKEN|SECRET', k)]
    failures = []
    for raw in subprocess.check_output(['git', 'ls-files', '-z']).split(b'\0'):
        if not raw:
            continue
        path = Path(raw.decode())
        text = path.read_bytes()
        if any(value in text for value in secrets) or re.search(
                rb'-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----', text):
            failures.append(str(path))
    if failures:
        raise SystemExit('Potential credentials in tracked files: '+', '.join(failures))
    print('Tracked-file known-secret/private-key scan passed (not an exhaustive security audit)')


if __name__ == '__main__':
    main()
