"""One approved two-VM deployment. Never retry creation automatically."""
import base64
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import ipaddress
import json
import os
from pathlib import Path
import ssl
import subprocess
import time

import httpx
from dotenv import dotenv_values

ROOT = Path('.runtime/cloud')
APPROVED = {
    'control': ('vc2-2c-4gb', 2, 4096, 80, 3072, '0.027', '20'),
    'runner': ('vc2-1c-2gb', 1, 2048, 55, 2048, '0.014', '10'),
}


def main():
    admin = ipaddress.IPv4Network(os.environ['APPROVED_ADMIN_CIDR'])
    if admin.prefixlen != 32 or not admin.network_address.is_global:
        raise ValueError('A confirmed globally routable admin /32 is required')
    ROOT.mkdir(parents=True, exist_ok=True)
    inventory = ROOT / 'inventory.json'
    if inventory.exists():
        raise RuntimeError('Inventory exists; inspect it, never repeat creation')
    tls = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    tls.load_default_certs()
    key = dotenv_values('.env').get('VULTR_API_KEY')
    if not key:
        raise RuntimeError('Management API key missing')
    client = httpx.Client(base_url='https://api.vultr.com/v2', verify=tls,
                         trust_env=False, timeout=45,
                         headers={'Authorization': 'Bearer ' + key})

    def api(method, path, **kwargs):
        response = client.request(method, path, **kwargs)
        if not response.is_success:
            # Never print request/response bodies: they can contain credentials.
            raise RuntimeError(f'Provisioning gate failed: {method} {path} HTTP {response.status_code}')
        return response.json() if response.content else {}

    plans = {p['id']: p for p in api('GET', '/plans')['plans']}
    capacity = api('GET', '/regions/cdg/availability')['available_plans']
    for expected in APPROVED.values():
        identifier, cpu, ram, disk, bandwidth, hourly, monthly = expected
        p = plans[identifier]
        if (tuple(p[k] for k in ('vcpu_count', 'ram', 'disk', 'bandwidth')) !=
                (cpu, ram, disk, bandwidth) or
                Decimal(str(p['hourly_cost'])) != Decimal(hourly) or
                Decimal(str(p['monthly_cost'])) != Decimal(monthly) or identifier not in capacity):
            raise RuntimeError('Approved configuration/rate/capacity changed; stop')
    if not any(o['id'] == 2284 and o['name'] == 'Ubuntu 24.04 LTS x64'
               for o in api('GET', '/os')['os']):
        raise RuntimeError('Approved OS changed')
    acls = api('GET', '/account')['account']['acls']
    if 'root' not in acls and not {'provisioning', 'firewall'}.issubset(acls):
        raise RuntimeError('Missing provisioning/firewall permissions')
    existing = api('GET', '/instances', params={'per_page': 500})
    if existing.get('meta', {}).get('links', {}).get('next') or any(
            i.get('label', '').startswith('shelfready-phase5-') for i in existing['instances']):
        raise RuntimeError('Existing deployment or incomplete inventory; inspect before creation')
    print('Approved configuration, rates, Paris capacity, OS and ACL gates passed', flush=True)
    state = {'created_at': datetime.now(timezone.utc).isoformat(), 'region': 'cdg',
             'hourly_estimate_usd': '0.041', 'instances': {}, 'firewalls': {}}

    def save():
        inventory.write_text(json.dumps(state, indent=2), encoding='utf-8')

    def keygen(name):
        path = ROOT / name
        subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(path)],
                       check=True, capture_output=True)
        return path

    admin_key = keygen('admin_ed25519')
    state['sshkey_id'] = api('POST', '/ssh-keys', json={
        'name': 'shelfready-phase5-admin',
        'ssh_key': admin_key.with_suffix('.pub').read_text().strip()})['ssh_key']['id']
    save()
    for role, config in APPROVED.items():
        firewall = api('POST', '/firewalls', json={
            'description': 'shelfready-phase5-' + role})['firewall_group']['id']
        state['firewalls'][role] = firewall
        save()
        sources = [str(admin.network_address)]
        if role == 'runner':
            sources.append(state['instances']['control']['main_ip'])
        for source in sources:
            api('POST', f'/firewalls/{firewall}/rules', json={
                'ip_type': 'v4', 'protocol': 'tcp', 'port': '22',
                'subnet': source, 'subnet_size': 32, 'source': '',
                'notes': 'Restricted ShelfReady SSH'})
        rules = api('GET', f'/firewalls/{firewall}/rules')['firewall_rules']
        if (len(rules) != len(sources) or any(
                r['ip_type'] != 'v4' or r['protocol'] != 'tcp' or r['port'] != '22'
                or int(r['subnet_size']) != 32 or r['subnet'] not in sources for r in rules)):
            raise RuntimeError('Firewall rule verification failed')
        hostkey = keygen(role + '_host_ed25519')
        cloud_config = {'disable_root': False, 'ssh_pwauth': False,
                        'ssh_keys': {'ed25519_private': hostkey.read_text(),
                                     'ed25519_public': hostkey.with_suffix('.pub').read_text().strip()}}
        userdata = base64.b64encode(('#cloud-config\n' + json.dumps(cloud_config)).encode()).decode()
        instance = api('POST', '/instances', json={
            'region': 'cdg', 'plan': config[0], 'os_id': 2284,
            'label': 'shelfready-phase5-' + role, 'hostname': 'shelfready-' + role,
            'firewall_group_id': firewall, 'sshkey_id': [state['sshkey_id']],
            'user_data': userdata, 'enable_ipv6': False, 'enable_vpc': False,
            'backups': 'disabled', 'ddos_protection': False, 'activation_email': False,
            'tags': ['shelfready-phase5']})['instance']
        fields = ('id', 'main_ip', 'plan', 'region', 'date_created', 'firewall_group_id',
                  'status', 'power_status', 'server_status', 'features', 'ram', 'disk', 'vcpu_count')
        state['instances'][role] = {k: instance.get(k) for k in fields}
        created = datetime.fromisoformat(instance['date_created'])
        if role == 'control':
            state['review_deadline_utc'] = (created + timedelta(hours=72)).isoformat()
        save()
        print(role, 'created', instance['id'], flush=True)
        for _ in range(90):
            instance = api('GET', '/instances/' + instance['id'])['instance']
            state['instances'][role] = {k: instance.get(k) for k in fields}
            save()
            if instance['firewall_group_id'] != firewall or instance['plan'] != config[0]:
                raise RuntimeError('Instance firewall attachment/configuration mismatch')
            if instance.get('features'):
                raise RuntimeError('Unexpected instance features; inspect before proceeding')
            if instance['status'] == 'active' and ipaddress.ip_address(instance['main_ip']).is_global:
                break
            time.sleep(4)
        else:
            raise RuntimeError('Instance readiness gate timed out')
        with (ROOT / 'known_hosts').open('a', encoding='utf-8') as stream:
            stream.write(instance['main_ip'] + ' ' + hostkey.with_suffix('.pub').read_text().strip() + '\n')
        print(role, instance['main_ip'], 'firewall attached and verified', flush=True)
    print('Provisioned only the approved pair; web ports remain CLOSED', flush=True)
    print('Review deadline UTC:', state['review_deadline_utc'], flush=True)


if __name__ == '__main__':
    main()
