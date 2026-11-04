from pathlib import Path

from fastapi.testclient import TestClient

from shelfready import api, jobs


def test_public_demo_rejects_non_synthetic_data_and_bounds_requests(tmp_path, monkeypatch):
    monkeypatch.setattr(jobs, 'ROOT', tmp_path)
    monkeypatch.setattr(api, 'PUBLIC_ORIGIN', 'https://demo.example')
    monkeypatch.setattr(api, '_window', [0, 0])
    client = TestClient(api.app)
    payload = {'baseline':Path('fixtures/baseline.csv').read_text(),
               'supplier':Path('fixtures/update.csv').read_text()}
    headers = {'Origin':'https://demo.example'}
    assert client.post('/api/jobs', json=payload, headers=headers).status_code == 200
    payload['supplier'] = payload['supplier'].replace('13.55','14.00')
    assert client.post('/api/jobs', json=payload, headers=headers).status_code == 422
    assert client.post('/api/jobs', json=payload, headers={'Origin':'https://evil.example'}).status_code == 403
    api._window[1] = 120
    assert client.get('/api/jobs/missing').status_code == 429
