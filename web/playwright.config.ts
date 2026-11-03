import {defineConfig} from '@playwright/test';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const python=process.platform==='win32'?path.join(root,'.venv/Scripts/python.exe'):path.join(root,'.venv/bin/python');
export default defineConfig({testDir:'e2e',workers:1,timeout:240000,use:{baseURL:'http://127.0.0.1:5173'},webServer:[
 {command:`"${python}" -m uvicorn shelfready.api:app --host 127.0.0.1 --port 8000`,cwd:root,url:'http://127.0.0.1:8000/docs',env:{SHELFREADY_DATA_DIR:path.join(root,'.runtime/browser')},reuseExistingServer:false},
 {command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:false}
]});
