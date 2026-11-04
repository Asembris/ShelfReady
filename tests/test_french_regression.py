import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from shelfready import catalog, spike_evaluate, worker
from shelfready.sandbox import run


@pytest.mark.live
def test_french_list_row_contract_preserves_every_row(monkeypatch):
    frozen, _ = spike_evaluate.corpus()
    case = next(c for c in frozen['cases'] if c['id'] == 'french_supplier')
    proposal = spike_evaluate.reviewed(case)
    data = {'baseline':catalog.parse(frozen['baseline'].encode()),
            'supplier':catalog.parse(case['csv'].encode())}
    baseline = catalog.mapped(data['baseline'], {
        'sku':'SKU','price':'Regular price','stock':'Stock','name':'Name','type':'Type'}, 'baseline')
    payload = {'baseline':baseline,'raw_supplier':data['supplier'],'interpretation':proposal}
    fake = MagicMock()
    # A synthetic function isolates the row-access regression; live generation is
    # verified separately, never represented as this mocked provider response.
    fake.__enter__.return_value.chat.completions.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(finish_reason='stop', message=SimpleNamespace(content='''import json
def transform(INPUT_JSON):
    p=json.loads(INPUT_JSON); fields=p['interpretation']['fields']
    column_index={name:index for index,name in enumerate(p['raw_supplier']['headers'])}
    result=[]
    for number,row in enumerate(p['raw_supplier']['rows'],1):
        result.append({'row':number,**{f:row[column_index[c['column']]] for f,c in fields.items()}})
    return result
'''))], id='synthetic', model='synthetic', usage=None)
    monkeypatch.setattr(worker.inference,'client',lambda:fake)
    code,_ = worker.generate(payload,'')
    prompt=fake.__enter__.return_value.chat.completions.create.call_args.kwargs['messages'][0]['content']
    assert 'NEVER use raw_row[column_name]' in prompt
    assert 'Return the complete result list after the loop' in prompt
    result=run(code,data=payload)
    assert result.exit_code == 0
    catalog.validate(json.loads(result.stdout),case['rows'])
