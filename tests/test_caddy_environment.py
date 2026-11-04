from deploy.validate_caddy import validate


def test_validation_preserves_literal_password_hash(tmp_path, monkeypatch):
    # Synthetic hash-shaped input, not a working demo credential.
    literal = '$2a$12$synthetic${UNSET_VARIABLE}hash'
    env = tmp_path / 'caddy.env'
    env.write_text('DEMO_DOMAIN=demo.example\nDEMO_USER=demo\nDEMO_PASSWORD_HASH='+literal+'\n')
    calls = []
    monkeypatch.setattr('deploy.validate_caddy.subprocess.run',
                        lambda *args, **kwargs: calls.append((args, kwargs)))
    validate(env)
    args, kwargs = calls[0]
    assert args[0] == ['caddy', 'validate', '--config', '/etc/caddy/Caddyfile',
                       '--adapter', 'caddyfile']
    assert kwargs['env']['DEMO_PASSWORD_HASH'] == literal
    assert kwargs['check'] is True
    assert 'shell' not in kwargs
