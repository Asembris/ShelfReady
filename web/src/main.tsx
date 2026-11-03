import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
type Table = {headers:string[],rows:string[][]};
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
 const [status,setStatus]=useState<Status|null>(null);
 const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!upload||!status||!['queued','running'].includes(status.state))return;
   const timer=setInterval(()=>request('/jobs/'+upload.id).then(setStatus).catch(e=>setError(String(e))),1000);
   return ()=>clearInterval(timer);
 },[upload,status?.state]);
 async function submit(){setBusy(true);setError('');try{
   for(const kind of ['baseline','supplier']) if(!files[kind]||files[kind].size>16384) throw Error('Choose both CSVs, at most 16 KiB each.');
   const result:Upload=await request('/jobs',{baseline:await files.baseline.text(),supplier:await files.supplier.text()});
   setUpload(result);setStatus(null);setConsent(false);
   setMapping(Object.fromEntries(Object.entries(result.candidates).map(([kind,fields])=>[kind,Object.fromEntries(Object.entries(fields).map(([field,options])=>[field,options.length===1?options[0]:'']))])));
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 async function confirm(){setBusy(true);setError('');try{
   await request('/jobs/'+upload!.id+'/confirm',{...mapping,replace_price_and_stock_same_currency:consent});setStatus({state:'queued',report:null});
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 return <main className="max-w-4xl mx-auto p-8 space-y-6">
  <h1 className="text-3xl font-bold">ShelfReady</h1>
  <p>Rehearse price and stock replacements in a disposable WooCommerce store. Local preview; no production access.</p>
  <p>UTF-8 CSVs · 16 KiB and 100 rows per file · existing simple products · decimal prices up to six places · whole nonnegative stock.</p>
  {!status&&<section className="space-y-4">{['baseline','supplier'].map(kind=><label className="block" key={kind}>{kind==='baseline'?'Baseline WooCommerce CSV':'Supplier CSV'}<input className="block" type="file" accept=".csv,text/csv" onChange={e=>{setFiles({...files,[kind]:e.target.files![0]});setUpload(null)}}/></label>)}<button disabled={busy} onClick={submit}>Upload and review mappings</button></section>}
  {upload&&!status&&<section className="space-y-5">
   {Object.entries(upload.tables).map(([kind,table])=><fieldset key={kind}><legend className="font-bold">{kind} mappings</legend>
    {Object.keys(upload.candidates[kind]).map(field=><label className="inline-block mr-4" key={field}>{kind} {field}<select value={mapping[kind]?.[field]||''} onChange={e=>setMapping({...mapping,[kind]:{...mapping[kind],[field]:e.target.value}})}><option value="">Choose column</option>{table.headers.map(h=><option key={h}>{h}</option>)}</select></label>)}
    <details><summary>Preview first five rows</summary><pre>{JSON.stringify(table.rows.slice(0,5),null,2)}</pre></details>
   </fieldset>)}
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
