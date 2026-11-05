"""Install a locked release on the two existing, stopped hosts without provisioning.

Run from a clean repository after building web/dist and exporting runtime requirements
to .runtime/live-deployment/requirements.txt. Credentials, jobs and quotas are retained.
"""
import argparse
import io
import json
from pathlib import Path
import subprocess
import tarfile

from dotenv import dotenv_values

from deploy.inspect_existing import validate_inventory


def release_paths(tracked):
    return [p for p in tracked if p.startswith(('shelfready/', 'config/', 'fixtures/',
                                               'infra/', 'deploy/')) or
            p in ('pyproject.toml', 'uv.lock')]


def archive(entries):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w') as bundle:
        for source, destination in entries:
            source = Path(source)
            if source.is_symlink() or not source.is_file():
                raise ValueError('Release entries must be regular files')
            bundle.add(source, arcname=destination, recursive=False)
    return buffer.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', required=True)
    args = parser.parse_args()
    evidence = Path(args.evidence).resolve()
    if not evidence.is_relative_to(Path('artifacts/live-deployment').resolve()) or evidence.exists():
        raise ValueError('Choose a new evidence path under artifacts/live-deployment')
    subprocess.run(['git', 'diff', '--exit-code', 'HEAD', '--'], check=True, capture_output=True)
    state = json.loads(Path('.runtime/cloud/inventory.json').read_text())
    validate_inventory(state)
    root = Path('.runtime/cloud').resolve()
    base = ['ssh', '-T', '-oBatchMode=yes', '-oStrictHostKeyChecking=yes',
            '-oIdentitiesOnly=yes', '-oConnectTimeout=10',
            '-oUserKnownHostsFile='+str(root/'known_hosts'), '-i', str(root/'admin_ed25519')]
    secrets = [v for k, v in dotenv_values('.env').items() if v and len(v) >= 8 and
               any(part in k for part in ('KEY', 'TOKEN', 'PASSWORD', 'SECRET'))]
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.touch(exist_ok=False)
    stage = 0

    def remote(role, command, data=None, timeout=180):
        nonlocal stage
        stage += 1
        result = subprocess.run(base+['root@'+state['instances'][role]['main_ip'], command],
                                input=data, capture_output=True, timeout=timeout)
        output = (result.stdout+result.stderr).decode(errors='replace')[-32768:]
        for secret in secrets:
            output = output.replace(secret, '[REDACTED]')
        with evidence.open('a', encoding='utf-8') as stream:
            stream.write(f'\n{role} release stage {stage}: exit={result.returncode}\n'+output)
        # Do not expose raw command output on failure; installer output stays private.
        if result.returncode:
            raise RuntimeError(f'{role} release stage failed, exit {result.returncode}')
        return result.stdout.decode()

    stopped = 'set -eu; ! systemctl is-active --quiet caddy; ! systemctl is-active --quiet shelfready-api; ! systemctl is-active --quiet shelfready-worker; test -z "$(docker ps -aq)"'
    for role in ('control', 'runner'):
        remote(role, stopped)
    remote('control', "cd /opt/shelfready; .venv/bin/python - <<'PY'\n" + '''
import hashlib,json,pathlib,sqlite3
from dotenv import dotenv_values
env=dotenv_values('/etc/shelfready/control.env',interpolate=False)
if env.get('SHELFREADY_LOCAL_RUNNER'):raise RuntimeError('Remote runner required')
dbpath=pathlib.Path(env['SHELFREADY_DATA_DIR'])/'jobs.sqlite'
with sqlite3.connect(dbpath) as db:
    if db.execute("SELECT 1 FROM jobs WHERE state IN ('queued','running')").fetchone():
        raise RuntimeError('Active jobs must not be interrupted')
    usage=db.execute('SELECT total FROM usage').fetchone()[0]
    backup=pathlib.Path('.runtime/phase8-jobs-backup.sqlite')
    if backup.exists():raise RuntimeError('Preserve previous backup; inspect before retry')
    with sqlite3.connect(backup) as target:db.backup(target)
    backup.chmod(0o600)
paths=['/etc/shelfready/control.env','/etc/shelfready/caddy.env','.runtime/store.env']
snapshot={'usage':usage,'hashes':{p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in paths}}
out=pathlib.Path('.runtime/phase8-preserved.json');out.write_text(json.dumps(snapshot));out.chmod(0o600)
''' + '\nPY')
    tracked = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
    entries = [(p, p) for p in release_paths(tracked)]
    entries += [(p, p.as_posix()) for p in Path('web/dist').rglob('*') if p.is_file()]
    entries += [('.runtime/live-deployment/requirements.txt', 'requirements.txt'),
                ('.runtime/woocommerce.10.3.5.zip', '.runtime/woocommerce.10.3.5.zip')]
    remote('control', 'tar -xf - -C /opt/shelfready', archive(entries))
    remote('runner', 'tar -xf - -C /opt/shelfready-runner', archive([
        ('shelfready/'+name, 'shelfready/'+name) for name in ('__init__.py','runner.py','sandbox.py')]))
    remote('control', 'sh -s', b'''set -eu
cd /opt/shelfready
.venv/bin/pip install --require-hashes -r requirements.txt
.venv/bin/pip check
install -m 0644 deploy/shelfready-api.service deploy/shelfready-worker.service /etc/systemd/system/
install -m 0644 deploy/Caddyfile /etc/caddy/Caddyfile
systemctl daemon-reload
.venv/bin/python -m deploy.validate_caddy
''', timeout=600)
    remote('runner', 'chown -R root:root /opt/shelfready-runner; chmod -R go-w /opt/shelfready-runner')
    verification = remote('control', "cd /opt/shelfready; .venv/bin/python - <<'PY'\n" + '''
import hashlib,json,pathlib,sqlite3,importlib.metadata as m
from dotenv import dotenv_values
saved=json.loads(pathlib.Path('.runtime/phase8-preserved.json').read_text())
for p,digest in saved['hashes'].items():
    if hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()!=digest:raise RuntimeError('Credentials changed')
env=dotenv_values('/etc/shelfready/control.env',interpolate=False)
with sqlite3.connect(pathlib.Path(env['SHELFREADY_DATA_DIR'])/'jobs.sqlite') as db:
    usage=db.execute('SELECT total FROM usage').fetchone()[0]
if usage!=saved['usage']:raise RuntimeError('Persistent quota changed')
print(json.dumps({'credentials_preserved':True,'upload_usage':usage,'versions':{n:m.version(n) for n in ['fastapi','starlette','python-dotenv']}}))
''' + '\nPY')
    print(verification)


if __name__ == '__main__':
    main()
