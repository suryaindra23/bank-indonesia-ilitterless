import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {readdirSync,readFileSync} from 'node:fs';

function pdfAssets(){const directory=fileURLToPath(new URL('./node_modules/pdfjs-dist/',import.meta.url)),groups=['cmaps','standard_fonts','wasm'];return {
 name:'pdf-reading-assets',
 configureServer(server){server.middlewares.use('/pdfjs-assets',(req,res,next)=>{const match=req.url?.split('?')[0].match(/^\/(cmaps|standard_fonts|wasm)\/([\w.-]+)$/);if(!match)return next();try{const bytes=readFileSync(resolve(directory,match[1],match[2]));res.setHeader('Content-Type',match[2].endsWith('.wasm')?'application/wasm':match[2].endsWith('.js')?'text/javascript':'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end();}});},
 generateBundle(){for(const group of groups)for(const name of readdirSync(resolve(directory,group)))this.emitFile({type:'asset',fileName:'pdfjs-assets/'+group+'/'+name,source:readFileSync(resolve(directory,group,name))});},
 };}

export default defineConfig({
  plugins:[pdfAssets()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:'+(process.env.API_PORT || '3001') },
    fs: {deny:['**/.env','**/.env.*','**/.git/**','**/*.{crt,pem}','**/data/**','**/server/**','**/scripts/**','**/tests/**',resolve(process.env.DATA_DIR || 'data')+'/**']},
  },
  preview: { proxy: { '/api': 'http://127.0.0.1:'+(process.env.API_PORT || '3001') } },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        warga: fileURLToPath(new URL('./warga/index.html', import.meta.url)),
        petugas: fileURLToPath(new URL('./petugas/index.html', import.meta.url)),
        superAdmin: fileURLToPath(new URL('./super-admin/index.html', import.meta.url)),
        bankIndonesia: fileURLToPath(new URL('./bank-indonesia/index.html', import.meta.url)),
      },
    },
  },
});
