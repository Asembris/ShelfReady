"""Bounded trusted-command diagnostics; never retain raw argv or credentials."""
from contextlib import contextmanager
from contextvars import ContextVar
import json
import os
import re

from dotenv import dotenv_values

ACTIVE = ContextVar('native_diagnostics', default=None)


def identity(args):
    if 'cli' in args and 'umask 077; cat > /tmp/catalog.csv' in args:
        return 'cli.stage-csv'
    if args[:2] == ['docker', 'cp']:
        return 'copy.' + str(args[-1]).split('/')[-1]
    if 'wp' in args:
        i = args.index('wp')
        operation = '.'.join(args[i+1:i+3])
        # Only known trusted operations; never arbitrary argument values.
        allowed = ('core.version', 'core.install', 'plugin.install', 'plugin.get',
                   'option.update', 'eval-file./tmp/import.php')
        if operation not in allowed:
            operation = 'other'
        phase = 'update' if 'IMPORT_UPDATE=1' in args else 'baseline'
        return 'wp.' + operation + '.' + phase
    for op in ('up', 'down', 'ps'):
        if op in args:
            return 'compose.' + op
    return 'docker.sql' if 'db' in args else 'docker.readiness-or-cleanup'


def record(args, exit_code, timed_out, stderr):
    state = ACTIVE.get()
    if state is None:
        return
    secrets = [v for k, v in os.environ.items() if any(s in k.upper() for s in
               ('KEY', 'PASSWORD', 'TOKEN', 'SECRET')) and len(v) >= 8]
    secrets += [a.split('=', 1)[1] for a in args if a.startswith('--admin_password=')]
    secrets += [v for v in dotenv_values('.runtime/store.env').values() if v]
    text = stderr.decode(errors='replace') if isinstance(stderr, bytes) else (stderr or '')
    for value in sorted(secrets, key=len, reverse=True):
        text = text.replace(value, '[REDACTED]')
    text = re.sub(r'(?i)(password|token|authorization|api[_-]?key)(\s*[:=]\s*)\S+',
                  r'\1\2[REDACTED]', text)
    event = {'stage': identity(args), 'command_identity': identity(args),
             'exit_code': exit_code, 'timed_out': timed_out, 'stderr': text[-2048:]}
    state['events'].append(event)
    state['events'][:] = state['events'][-12:]
    (state['directory'] / 'native-diagnostics.json').write_text(
        json.dumps(state['events']), encoding='utf-8')


@contextmanager
def scope(directory):
    state = {'directory': directory, 'events': []}
    token = ACTIVE.set(state)
    try:
        yield
    except Exception as error:
        error.native_diagnostics = state['events']
        raise
    finally:
        ACTIVE.reset(token)
