"""One paired local run of the frozen rescue, not a human usability study."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import uuid

from shelfready import catalog, rescue

DIGEST = '5f600d4257a71fb015cb7c2ddc726decc03c7269490d39ac5f04996bea46df71'


def main():
    os.environ['SHELFREADY_LOCAL_RUNNER'] = '1'
    path = Path('evaluation/rescue/case.json')
    if hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n')).hexdigest() != DIGEST:
        raise ValueError('Frozen case changed')
    case = json.loads(path.read_text())
    data = rescue.tables(case)
    root = Path('artifacts/rescue')/(time.strftime('%Y%m%d-%H%M%S')+'-'+uuid.uuid4().hex[:8])
    root.mkdir(parents=True)
    results = {'case_sha256': DIGEST, 'source': subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], text=True).strip(), 'arms': {}}
    for arm in ('baseline', 'agent'):
        directory = root/arm
        directory.mkdir()
        start = time.monotonic()
        entry = {}
        results['arms'][arm] = entry
        try:
            if arm == 'agent':
                proposal, evidence = rescue.agent_review(data, case['intent'])
            else:
                proposal = rescue.baseline_review(data, case['intent'])
                evidence = {}
            entry.update(review_seconds=time.monotonic()-start, advice=proposal, inference=evidence)
            (directory/'review.json').write_text(json.dumps(entry, indent=2))
            risk_rows = {r['row'] for r in proposal['risks']}
            gold = set(case['gold']['risk_rows'])
            entry['risk_corrections'] = len(risk_rows ^ gold)
            entry['mapping_corrections'] = sum(v is not None and v != case['gold']['mapping'][f]
                                               for f, v in proposal['mapping'].items())
            entry['mapping_answers'] = sum(v is None for v in proposal['mapping'].values())
            entry['mandatory_mapping_review'] = 1
            entry['risk_acknowledgements'] = len(case['decisions']['acknowledge'])
            # Frozen scripted oracle corrects extra warnings identically; never real-human evidence.
            reviewed = {**proposal, 'risks': [r for r in proposal['risks'] if r['row'] in gold]}
            entry['trusted_floor_rows'] = [r['row'] for r in rescue.floor(data, case['decisions']['mapping'])]
            report = rescue.execute(data, reviewed, case['decisions'], arm, directory)
            catalog.validate(report['updates'], case['gold']['updates'])
            if [r['row'] for r in report['unresolved']] != case['gold']['unresolved_rows']:
                raise RuntimeError('Frozen unresolved oracle mismatch')
            entry.update(verified_rows=report['resolved_rows'], unresolved=len(report['unresolved']),
                         incorrect_accepted=0, attempts=report['attempts'])
        except Exception as error:
            entry.update(failed=True, error_type=type(error).__name__, verified_rows=0)
            if hasattr(error, 'raw_response'):
                entry['raw_response'] = error.raw_response
        entry['total_seconds'] = time.monotonic()-start
        (root/'results.json').write_text(json.dumps(results, indent=2))
    a, b = results['arms']['agent'], results['arms']['baseline']
    parity = a['verified_rows'] == b['verified_rows'] == 2 and all(
        e.get('incorrect_accepted') == 0 and e.get('unresolved') == 6 for e in (a, b))
    gain = (b.get('risk_corrections', 0)+b.get('mapping_corrections', 0)
            -a.get('risk_corrections', 0)-a.get('mapping_corrections', 0))
    results.update(completion_parity=parity, correction_gain=gain,
                   verdict='GO' if parity and gain >= 2 else 'NO-GO for incremental agent value')
    (root/'results.json').write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))
    print('Evidence:', root)


if __name__ == '__main__':
    main()
