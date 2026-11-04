import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
type Table = {headers:string[],rows:string[][]};
type Intent = {currency:string,price_format:string,stock_unit:string,allow_sku_trim:boolean,request:string};
type Choice = {column:string|null,rule:string,evidence:{row:number,value:string}[],explanation:string};
type Interpretation = {proposal:{fields:Record<string,Choice>,uncertainties:string[]},intent:Intent};
type Upload = {id:string,tables:Record<string,Table>,candidates:Record<string,Record<string,string[]>>};
type Values = {price:string,stock:string};
type Report = {input_rows?:number,resolved_rows?:number,reason?:string,
 unresolved?:{row:number,sku:string,reason:string}[],
 changes?:{sku:string,before:Values,after:Values}[]};
type Status = {state:string,report:Report|null};
async function request(path:string, data?:unknown) {
  const response=await fetch('/api'+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result=await response.json();
  if(!response.ok) throw Error(typeof result.detail==='string'?result.detail:JSON.stringify(result.detail));
  return result;
}
function App(){
 const [files,setFiles]=useState<Record<string,File>>({});
 const [upload,setUpload]=useState<Upload|null>(null);
 const [mapping,setMapping]=useState<Record<string,Record<string,string>>>({});
 const [consent,setConsent]=useState(false);
 const [interpretation,setInterpretation]=useState<Interpretation|null>(null);
 const [rules,setRules]=useState<Record<string,string>>({sku:'identity',price:'identity',stock:'identity'});
 const [intent,setIntent]=useState<Intent>({currency:'unknown',price_format:'unknown',stock_unit:'unknown',allow_sku_trim:false,request:''});
 const [status,setStatus]=useState<Status|null>(null);
 const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!upload||!status||!['queued','running'].includes(status.state))return;
   const timer=setInterval(()=>request('/jobs/'+upload.id).then(setStatus).catch(e=>setError(String(e))),1000);
   return ()=>clearInterval(timer);
 },[upload,status?.state]);
 async function submit(){setBusy(true);setError('');try{
   for(const kind of ['baseline','supplier']) if(!files[kind]||files[kind].size>16384) throw Error('Choose both CSVs, at most 16 KiB each.');
   const result:Upload=await request('/jobs',{baseline:await files.baseline.text(),supplier:await files.supplier.text()});
   setUpload(result);setStatus(null);setConsent(false);setInterpretation(null);
   setMapping(Object.fromEntries(Object.entries(result.candidates).map(([kind,fields])=>[kind,Object.fromEntries(Object.entries(fields).map(([field,options])=>[field,options.length===1?options[0]:'']))])));
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 async function interpret(){setBusy(true);setError('');setConsent(false);try{
   const result:Interpretation=await request('/jobs/'+upload!.id+'/interpret',intent);
   setInterpretation(result);setMapping({...mapping,supplier:Object.fromEntries(Object.entries(result.proposal.fields).map(([f,c])=>[f,c.column||'']))});
   setRules(Object.fromEntries(Object.entries(result.proposal.fields).map(([f,c])=>[f,c.rule])));
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 async function confirm(){setBusy(true);setError('');try{
   const reviewed=interpretation?{intent,proposal:{fields:Object.fromEntries(Object.entries(mapping.supplier).map(([f,column])=>[f,{column:column||null,rule:rules[f],evidence:column?[{row:1,value:upload!.tables.supplier.rows[0][upload!.tables.supplier.headers.indexOf(column)]}]:[],explanation:'Explicitly reviewed source column and normalization'}])),uncertainties:interpretation.proposal.uncertainties}}:undefined;
   await request('/jobs/'+upload!.id+'/confirm',{...mapping,replace_price_and_stock_same_currency:consent,...(reviewed?{interpretation:reviewed}:{})});setStatus({state:'queued',report:null});
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 return <main className="max-w-4xl mx-auto p-8 space-y-6">
  <h1 className="text-3xl font-bold">ShelfReady</h1>
  <p>Rehearse price and stock replacements in a disposable WooCommerce store. Local preview; no production access.</p>
  <p>UTF-8 CSVs · 16 KiB and 100 rows per file · existing simple products · decimal prices up to six places · whole nonnegative stock.</p>
  {!status&&<section className="space-y-4">{['baseline','supplier'].map(kind=><label className="block" key={kind}>{kind==='baseline'?'Baseline WooCommerce CSV':'Supplier CSV'}<input className="block" type="file" accept=".csv,text/csv" onChange={e=>{setFiles({...files,[kind]:e.target.files![0]});setUpload(null)}}/></label>)}<button disabled={busy} onClick={submit}>Upload and review mappings</button></section>}
  {upload&&!status&&<section className="space-y-5">
   {Object.entries(upload.tables).map(([kind,table])=><fieldset key={kind}><legend className="font-bold">{kind} mappings</legend>
    {Object.keys(upload.candidates[kind]).map(field=><label className="inline-block mr-4" key={field}>{kind} {field}<select value={mapping[kind]?.[field]||''} onChange={e=>{setConsent(false);setMapping({...mapping,[kind]:{...mapping[kind],[field]:e.target.value}})}}><option value="">Choose column</option>{table.headers.map(h=><option key={h}>{h}</option>)}</select></label>)}
    <details><summary>Preview first five rows</summary><pre>{JSON.stringify(table.rows.slice(0,5),null,2)}</pre></details>
   </fieldset>)}
   <fieldset><legend className="font-bold">Optional supplier interpretation spike</legend>
    <p>Only the first five supplier rows, headers and baseline SKUs are sent to Vultr. Source evidence is not proof of business meaning: review every choice.</p>
    <label>Declared currency<select value={intent.currency} onChange={e=>{setConsent(false);setIntent({...intent,currency:e.target.value})}}><option value="unknown">Unspecified — abstain</option>{['EUR','USD','GBP'].map(c=><option key={c}>{c}</option>)}</select></label>
    <label>Declared price format<select value={intent.price_format} onChange={e=>{setConsent(false);setIntent({...intent,price_format:e.target.value})}}><option value="unknown">Unspecified — abstain</option><option value="dot">Decimal dot, no grouping</option><option value="comma">Decimal comma, no grouping</option></select></label>
    <label>Declared stock unit<select value={intent.stock_unit} onChange={e=>{setConsent(false);setIntent({...intent,stock_unit:e.target.value})}}><option value="unknown">Unspecified — abstain</option><option value="each">Available individual units</option></select></label>
    <label><input type="checkbox" checked={intent.allow_sku_trim} onChange={e=>{setConsent(false);setIntent({...intent,allow_sku_trim:e.target.checked})}}/> SKU outer whitespace is export padding; trimming is authorized</label>
    <label className="block">Explicit interpretation intent<textarea className="block border p-2 w-full" maxLength={500} value={intent.request} onChange={e=>{setConsent(false);setIntent({...intent,request:e.target.value})}}/></label>
    <button disabled={busy||!!interpretation||intent.request.length<10} onClick={interpret}>Propose supplier interpretation</button>
    {interpretation&&<div>{Object.entries(interpretation.proposal.fields).map(([f,c])=><div key={f}><p><strong>{f}</strong>: proposed {c.column||'abstention'}; {c.explanation}</p><p>Source evidence: {c.evidence.map(e=>`row ${e.row}: ${e.value}`).join('; ')}</p><label>{f} normalization<select value={rules[f]} onChange={e=>{setConsent(false);setRules({...rules,[f]:e.target.value})}}>{(['identity',...(f==='sku'?['trim']:f==='price'?['decimal_comma']:['strip_each'])]).map(r=><option key={r}>{r}</option>)}</select></label></div>)}<p>Uncertainties: {interpretation.proposal.uncertainties.join('; ')||'None reported by model; human review still required'}</p></div>}
   </fieldset>
   <label className="block"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I confirm these mappings and intend to replace prices and stock using the same currency. No conversion or tax decisions.</label>
   <button disabled={!consent||busy} onClick={confirm}>Confirm and rehearse</button>
  </section>}
  {error&&<p role="alert">{error}</p>}
  {status&&<section className="space-y-4"><h2 className="text-xl">Status: <span data-testid="state">{status.state}</span></h2>
   {status.state==='partial'&&<p>Partial success: only resolved, independently verified rows are exported. Review unresolved rows below.</p>}
   {status.state==='failed'&&<p>Rehearsal failed. No verified CSV is available.</p>}
   {['complete','partial'].includes(status.state)&&<p><a href={'/api/jobs/'+upload!.id+'/download/csv'}>Download verified CSV</a> · <a href={'/api/jobs/'+upload!.id+'/download/report'}>Download change report</a></p>}
   {status.report&&<div className="space-y-4">
    {status.report.reason&&<p>{status.report.reason}</p>}
    {status.report.input_rows!==undefined&&<p>{status.report.input_rows} input rows · {status.report.resolved_rows} resolved · {status.report.unresolved?.length||0} unresolved</p>}
    {!!status.report.changes?.length&&<table><caption>Verified replacements</caption><thead><tr><th>SKU</th><th>Price before</th><th>Price after</th><th>Stock before</th><th>Stock after</th></tr></thead><tbody>{status.report.changes.map(r=><tr key={r.sku}><td>{r.sku}</td><td>{r.before.price}</td><td>{r.after.price}</td><td>{r.before.stock}</td><td>{r.after.stock}</td></tr>)}</tbody></table>}
    {!!status.report.unresolved?.length&&<table><caption>Unresolved supplier rows</caption><thead><tr><th>Row</th><th>SKU</th><th>Reason</th></tr></thead><tbody>{status.report.unresolved.map(r=><tr key={r.row}><td>{r.row}</td><td>{r.sku}</td><td>{r.reason}</td></tr>)}</tbody></table>}
   </div>}
   {!['queued','running'].includes(status.state)&&<button onClick={()=>{setStatus(null);setUpload(null);setError('')}}>Start another rehearsal</button>}
  </section>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
