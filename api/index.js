import {createApp} from '../server/app.js';
let initialized;
export default async function handler(req,res){
 try{
  initialized??=createApp().catch(error=>{initialized=undefined;throw error;});
  const {app}=await initialized;return app(req,res);
 }catch{console.error('API initialization failed. Check database and storage configuration.');res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Layanan belum tersedia. Coba lagi.'}));}
}
