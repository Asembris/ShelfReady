"""Private trusted synthetic native reproduction; no inference or sandbox code."""
import json
import os
from pathlib import Path
import sys

from shelfready import catalog, rehearsal_store


def main():
    os.umask(0o077)  # Reproduce the worker's service permissions.
    directory = Path(sys.argv[1])
    directory.mkdir(parents=True, exist_ok=False)
    data = {k: catalog.parse(Path(p).read_bytes()) for k, p in
            [('baseline', 'fixtures/baseline.csv'), ('supplier', 'fixtures/update.csv')]}
    mapping = {'baseline': {'sku': 'SKU', 'price': 'Regular price', 'stock': 'Stock',
                            'name': 'Name', 'type': 'Type'},
               'supplier': {'sku': 'SKU', 'price': 'Regular price', 'stock': 'Stock'}}
    baseline, _, updates, unresolved = catalog.plan(data, mapping)
    try:
        actual = rehearsal_store.rehearse(baseline, updates, directory)
        result = {'passed': True, 'readback': actual, 'unresolved': unresolved}
    except Exception as error:
        result = {'passed': False, 'error_type': type(error).__name__,
                  'diagnostics': getattr(error, 'native_diagnostics', [])}
    (directory/'result.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
