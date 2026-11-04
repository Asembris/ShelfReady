// Run from the repository root after npm ci in web/. No application server required.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from '../web/node_modules/playwright/index.mjs';

const root=path.resolve('brand');
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
assert.equal(manifest.status,'APPROVED — Concept A / Proof Shelf');
assert.equal(manifest.assets.length,17);
const sha=data=>createHash('sha256').update(data).digest('hex');
const assets=[];
for(const asset of manifest.assets){
 assert.equal(path.basename(asset.file),asset.file);
 const data=await fs.readFile(path.join(root,asset.file));
 assert.equal(sha(data),asset.sha256,`${asset.file}: differs from approved artwork`);
 assets.push({...asset,svg:data.toString()});
}
assert.equal(sha(await fs.readFile(path.join(root,manifest.font.file))),manifest.font.sha256);
assert.match(await fs.readFile(path.join(root,manifest.font.license),'utf8'),/SIL OPEN FONT LICENSE/);
const css=await fs.readFile(path.join(root,'tokens.css'),'utf8');
for(const color of Object.values(manifest.palette))assert.ok(css.toUpperCase().includes(color.toUpperCase()));

const allow=new Set(['preview.html','tokens.css',manifest.font.file,manifest.font.license,
                     ...manifest.assets.map(a=>a.file)]);
const mime={'.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain'};
const missing=[];
const server=http.createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'preview.html';
  if(name==='favicon.ico'){res.writeHead(204);res.end();return;}
  if(!allow.has(name)){missing.push(name);res.writeHead(404);res.end();return;}
  const data=await fs.readFile(path.join(root,name));
  res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(500);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1120,height:1000},deviceScaleFactor:1});
 const consoleErrors=[];page.on('pageerror',e=>consoleErrors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/preview.html`);
 await page.evaluate(()=>document.fonts.ready);
 const rendered=await page.evaluate(async assets=>{
  if(!document.fonts.check('600 16px "ShelfReady Inter"'))throw Error('Brand font failed to load');
  const fontFaces=[...document.fonts];
  if(!fontFaces.some(f=>f.family.includes('ShelfReady Inter')&&f.status==='loaded'))throw Error('Font not used');
  for(const img of document.images){
   if(!img.alt.trim()||!img.complete||img.naturalWidth===0)throw Error('Missing image or accessible name');
  }
  const results=[];
  for(const asset of assets){
   const doc=new DOMParser().parseFromString(asset.svg,'image/svg+xml');
   if(doc.querySelector('parsererror'))throw Error('Invalid SVG XML');
   const svg=doc.documentElement;
   if(svg.localName!=='svg'||svg.getAttribute('role')!=='img')throw Error('Missing SVG image role');
   const title=doc.getElementById(svg.getAttribute('aria-labelledby'));
   if(!title||!title.textContent.trim())throw Error('Missing SVG accessible title');
   for(const node of doc.querySelectorAll('*')){
    if(!['svg','title','g','path'].includes(node.localName))throw Error('Unexpected SVG element');
    for(const attr of node.attributes){
     if(/^on/i.test(attr.name)||/href|style/i.test(attr.name))throw Error('External or active SVG reference');
    }
   }
   if(asset.file.startsWith('favicon-')||asset.file.startsWith('horizontal-')||asset.file.startsWith('icon-')){
    if(asset.tagline||title.textContent.includes('Rehearse.'))throw Error('Tagline in compact asset');
   }
   const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(asset.svg);
   await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   const alpha=(x,y)=>pixels[(y*canvas.width+x)*4+3];
   if(alpha(0,0)!==0||alpha(canvas.width-1,canvas.height-1)!==0)throw Error('Opaque background');
   let visible=0;for(let n=3;n<pixels.length;n+=4)if(pixels[n]>0)visible++;
   if(visible<10)throw Error('Empty asset');
   if(asset.file.startsWith('favicon-')){
    const size=Number(asset.file.split('-')[1]);
    if(canvas.width!==size||canvas.height!==size)throw Error('Wrong favicon dimensions');
    const point=size===16?[9,9]:size===24?[12,13]:[16,17];
    if(alpha(...point)!==0)throw Error('Favicon notch closed');
   }
   results.push({file:asset.file,width:canvas.width,height:canvas.height,transparent:true,visible_pixels:visible});
  }
  return results;
 },assets);
 assert.deepEqual(missing,[],'Broken local asset references');assert.deepEqual(consoleErrors,[]);
 const luminance=hex=>{
  const c=hex.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
 };
 const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const contrastResults={navy_on_white:contrast('#102044','#ffffff'),
  cobalt_on_white:contrast('#164bff','#ffffff'),inverse_ink_on_navy:contrast('#f1f5ff','#0a1530'),
  inverse_cobalt_on_navy:contrast('#6c8cff','#0a1530')};
 for(const ratio of Object.values(contrastResults))assert.ok(ratio>=4.5,'Insufficient brand-pair contrast');
 const out=path.resolve('artifacts/brand/production-validation');await fs.mkdir(out,{recursive:true});
 await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:1000});
 await page.evaluate(async()=>{
  await Promise.all([...document.images].map(img=>img.decode()));
  for(const img of document.querySelectorAll('.primary,.signature')){
   if(!new URL(img.currentSrc).pathname.includes('/horizontal-'))throw Error('Compact proof retained tagline');
  }
 });
 await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
 const docs=await fs.readFile('docs/BRAND.md','utf8');
 for(const match of docs.matchAll(/\]\((\.\.\/brand\/[^)#]+)(?:#[^)]*)?\)/g)){
  await fs.access(path.resolve('docs',match[1]));
 }
 const summary={assets:rendered,contrast:contrastResults,broken_references:missing,font_loaded:true,
                approved_hashes_preserved:true,device_scale:1};
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify(summary,null,2));
 console.log(`Validated ${rendered.length} approved SVGs: accessibility, transparency, rendering, favicon notch, font and references.`);
 console.log('Contrast ratios:',Object.fromEntries(Object.entries(contrastResults).map(([k,v])=>[k,v.toFixed(2)])));
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
