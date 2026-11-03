import {test,expect} from '@playwright/test';
import {spawn,spawnSync,ChildProcess} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
const root=path.resolve(import.meta.dirname,'../..');
let worker:ChildProcess;
test.beforeAll(()=>{
 const python=process.platform==='win32'?path.join(root,'.venv/Scripts/python.exe'):path.join(root,'.venv/bin/python');
 worker=spawn(python,['-m','shelfready.worker'],{cwd:root,env:{...process.env,SHELFREADY_LOCAL_RUNNER:'1',SHELFREADY_DATA_DIR:path.join(root,'.runtime/browser')},stdio:'ignore'});
});
test.afterAll(()=>{
 if(worker?.pid){
  if(process.platform==='win32')spawnSync('taskkill',['/PID',String(worker.pid),'/T','/F']);
  else worker.kill();
 }
});
test('confirm mappings, rehearse real Vultr code and download partial verified results',async({page})=>{
 await page.goto('/');
 await page.getByLabel('Baseline WooCommerce CSV').setInputFiles(path.join(root,'fixtures/baseline.csv'));
 await page.getByLabel('Supplier CSV').setInputFiles({name:'supplier.csv',mimeType:'text/csv',buffer:Buffer.from('SKU,Regular price,Stock\n00017,13.5500,7\nA-2,1.35,2\nUNKNOWN,5.00,1\n')});
 await page.getByRole('button',{name:'Upload and review mappings'}).click();
 await expect(page.getByRole('button',{name:'Confirm and rehearse'})).toBeDisabled();
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Confirm and rehearse'}).click();
 await expect.poll(async()=>await page.getByTestId('state').textContent(),{timeout:230000}).toMatch(/partial|failed/);
 await expect(page.getByTestId('state')).toHaveText('partial');
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Download verified CSV'}).click()]);
 const dir=path.join(root,'artifacts/rehearsal');await fs.mkdir(dir,{recursive:true});
 await download.saveAs(path.join(dir,'verified.csv'));
 const csv=await fs.readFile(path.join(dir,'verified.csv'),'utf8');
 expect(csv).toContain('00017,13.5500,7');expect(csv).not.toContain('UNKNOWN');
 const [report]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Download change report'}).click()]);
 await report.saveAs(path.join(dir,'report.json'));
 const evidence=JSON.parse(await fs.readFile(path.join(dir,'report.json'),'utf8'));
 expect(evidence.input_rows).toBe(3);expect(evidence.resolved_rows).toBe(2);
 expect(evidence.unresolved).toEqual([{row:3,sku:'UNKNOWN',reason:'SKU absent from baseline'}]);
 expect(evidence.attempts.length).toBeLessThanOrEqual(3);
 await page.screenshot({path:path.join(dir,'browser.png'),fullPage:true});
});
