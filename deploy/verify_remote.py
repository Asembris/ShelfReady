"""Run bounded probes through SSH only; never execute probe code on control."""
import dataclasses
import json
import os
import time

from shelfready import runner


def main():
    if os.getenv('SHELFREADY_LOCAL_RUNNER') or not os.getenv('RUNNER_HOST'):
        raise RuntimeError('Remote SSH runner is required for cloud verification')
    probes = {
        'containment': '''import os,json,socket,errno
if os.getuid()!=65534:raise RuntimeError('Wrong sandbox UID')
if set(os.environ)!={'PATH'}:raise RuntimeError('Unexpected sandbox environment')
try:
 open('/shelfready-denied-write','w').write('synthetic')
except OSError as e:
 if e.errno!=errno.EROFS:raise
else:raise RuntimeError('Root filesystem was writable')
s=socket.socket();s.settimeout(1)
try:s.connect(('1.1.1.1',443))
except OSError:pass
else:raise RuntimeError('Outbound network succeeded')
finally:s.close()
print(json.dumps({'uid':os.getuid(),'readonly_denied':True,'network_denied':True,'credentials_absent':True}))''',
        'timeout': 'while True: pass',
        'memory': 'x=bytearray(256*1024*1024); print("unexpected-memory-success")',
    }
    results = {}
    for name, code in probes.items():
        started = time.monotonic()
        result = runner.execute(code, {})
        results[name] = {**dataclasses.asdict(result),
                         'elapsed_seconds': round(time.monotonic()-started, 3)}
        if name == 'containment' and (result.status != 'finished' or result.exit_code != 0):
            raise RuntimeError('Remote containment probe failed')
        if name == 'timeout' and result.status != 'timeout':
            raise RuntimeError('Remote timeout was not enforced')
        if name == 'memory' and (result.status != 'finished' or result.exit_code != 137):
            raise RuntimeError('Remote memory limit was not enforced')
    runner.reap()
    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
