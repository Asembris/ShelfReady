import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({plugins:[tailwindcss()],server:{host:'127.0.0.1',port:18766,strictPort:true,proxy:{'/api':'http://127.0.0.1:18765'}}});
