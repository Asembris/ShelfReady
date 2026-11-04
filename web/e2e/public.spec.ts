import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

test('authenticate, download synthetic inputs and rehearse through public HTTPS',async({page,request,playwright,baseURL})=>{
 const anonymous=await playwright.request.newContext({baseURL});
 try {
  for (const route of ['/', '/demo/baseline.csv', '/api/jobs/missing', '/api/jobs/missing/download/csv']) {
   expect((await anonymous.get(route)).status()).toBe(401);
  }
 } finally {await anonymous.dispose();}
 const inputs:Record<string,Buffer>={};
 for (const name of ['baseline.csv','update.csv']) {
  const response=await request.get(`/demo/${name}`);
  expect(response.status()).toBe(200);
  inputs[name]=await response.body();
  expect(inputs[name].toString()).toBe(await fs.readFile(path.resolve('../fixtures',name),'utf8'));
 }
 const denied=await request.post('/api/jobs',{headers:{Origin:'https://untrusted.invalid'},data:{}});
 expect(denied.status()).toBe(403);
 await page.goto('/');
 await page.getByLabel('Baseline WooCommerce CSV').setInputFiles({name:'baseline.csv',mimeType:'text/csv',buffer:inputs['baseline.csv']});
 await page.getByLabel('Supplier CSV').setInputFiles({name:'update.csv',mimeType:'text/csv',buffer:inputs['update.csv']});
 await page.getByRole('button',{name:'Upload and review mappings'}).click();
 await expect(page.getByRole('button',{name:'Confirm and rehearse'})).toBeDisabled();
 await page.getByLabel('I confirm these mappings',{exact:false}).check();
 await page.getByRole('button',{name:'Confirm and rehearse'}).click();
 await expect.poll(()=>page.getByTestId('state').textContent(),{timeout:230000}).toMatch(/complete|partial|failed/);
 await expect(page.getByTestId('state')).toHaveText('complete');
 const dir=path.resolve('../artifacts/cloud/public-browser');await fs.mkdir(dir,{recursive:true});
 for (const [label,name] of [['Download verified CSV','verified.csv'],['Download change report','report.json']]) {
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:label}).click()]);
  await download.saveAs(path.join(dir,name));
 }
 const csv=await fs.readFile(path.join(dir,'verified.csv'),'utf8');
 expect(csv).toContain('00017,13.55,7');expect(csv).toContain('A-2,1.35,2');
 const report=JSON.parse(await fs.readFile(path.join(dir,'report.json'),'utf8'));
 expect(report.resolved_rows).toBe(2);expect(report.input_rows).toBe(2);
 expect(report.unresolved).toEqual([]);
});
