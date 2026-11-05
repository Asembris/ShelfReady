import pytest

from deploy.update_existing import archive, release_paths, validate_stopped


def test_release_selects_application_without_private_state():
    paths=['shelfready/api.py','config/inference.json','fixtures/baseline.csv',
           'infra/compose.yaml','deploy/Caddyfile','pyproject.toml','uv.lock',
           '.env','architecture.md','.runtime/credentials.json','artifacts/evidence.json',
           '.github/workflows/ci.yml','docs/verification.md']
    assert release_paths(paths)==paths[:7]


def test_release_rejects_non_regular_entries(tmp_path):
    with pytest.raises(ValueError, match='regular files'):
        archive([(tmp_path,'directory')])


@pytest.mark.parametrize('state', ['active', 'activating', 'deactivating', 'unexpected'])
def test_release_refuses_live_or_unrecognized_service_state(state):
    services=dict.fromkeys(['caddy','shelfready-api','shelfready-worker'],'inactive')
    services['shelfready-worker']=state
    with pytest.raises(RuntimeError, match='stopped services'):
        validate_stopped({'services':services,'containers':[]})


def test_release_requires_complete_idle_snapshot():
    services=dict.fromkeys(['caddy','shelfready-api','shelfready-worker'],'inactive')
    validate_stopped({'services':services,'containers':[]})
    with pytest.raises(RuntimeError, match='stopped services'):
        validate_stopped({'services':services,'containers':['existing-container']})
    services.pop('caddy')
    with pytest.raises(RuntimeError, match='stopped services'):
        validate_stopped({'services':services,'containers':[]})
