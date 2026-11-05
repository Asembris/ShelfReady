import pytest

from deploy.update_existing import archive, release_paths


def test_release_selects_application_without_private_state():
    paths=['shelfready/api.py','config/inference.json','fixtures/baseline.csv',
           'infra/compose.yaml','deploy/Caddyfile','pyproject.toml','uv.lock',
           '.env','architecture.md','.runtime/credentials.json','artifacts/evidence.json',
           '.github/workflows/ci.yml','docs/verification.md']
    assert release_paths(paths)==paths[:7]


def test_release_rejects_non_regular_entries(tmp_path):
    with pytest.raises(ValueError, match='regular files'):
        archive([(tmp_path,'directory')])
