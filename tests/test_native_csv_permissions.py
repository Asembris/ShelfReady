import pytest

from shelfready import rehearsal_store, store


@pytest.mark.live
def test_cli_stages_private_csv_as_its_own_uid_without_shell_interpolation():
    image = 'wordpress:cli-2.12.0-php8.3@sha256:6bcc7bb91f5157c4b915e74ee131873e99c1c1ff48f602e4a6f6cd17827305cb'
    data = 'SKU,Name\n00017,$(echo unsafe); literal\n'
    script = rehearsal_store.STAGE_CSV + "; stat -c '%u:%a' /tmp/catalog.csv; cat /tmp/catalog.csv"
    result = store.command(['docker', 'run', '--rm', '-i', '--network=none',
                            '--read-only', '--user=33:33', '--memory=128m', '--pids-limit=32',
                            '--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=1m', '--entrypoint=sh',
                            image, '-c', script], input=data)
    assert result == '33:600\n' + data.strip()
