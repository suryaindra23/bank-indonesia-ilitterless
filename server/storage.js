import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import path from 'node:path';
const checked=key=>{if(!/^(photos|materials)\/[a-f0-9-]+\.[a-z0-9]+$/.test(key))throw Error('Invalid storage key');return key;};
export function createObjectStore({dataDir,remote=!!process.env.SUPABASE_URL}={}){
 if(!remote)return {
  remote:false,
  async put(key,bytes){const location=path.join(dataDir,checked(key));await mkdir(path.dirname(location),{recursive:true,mode:0o700});await writeFile(location,bytes,{mode:0o600});},
  async read(key){return readFile(path.join(dataDir,checked(key)));},
  async remove(key){await unlink(path.join(dataDir,checked(key))).catch(error=>{if(error.code!=='ENOENT')throw error;});},
  async serve(res,key,{mime,name,download=false}={}){res.type(mime||path.extname(key));if(download)res.attachment(name);return res.sendFile(path.join(dataDir,checked(key)));},
 };
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib untuk Storage.');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const bucketName=process.env.SUPABASE_STORAGE_BUCKET||'bibubebo-private',bucket=client.storage.from(bucketName);
 const unwrap=result=>{if(result.error)throw Error('Storage: '+result.error.message);return result.data;};
 return {
  remote:true,
  async ensureBucket(){const result=await client.storage.getBucket(bucketName);if(result.error){unwrap(await client.storage.createBucket(bucketName,{public:false,fileSizeLimit:50*1024*1024}));}else if(result.data.public)throw Error('Bucket harus privat.');},
  async put(object,bytes,mime,{upsert=false}={}){unwrap(await bucket.upload(checked(object),bytes,{contentType:mime,upsert}));},
  async read(object){return Buffer.from(await unwrap(await bucket.download(checked(object))).arrayBuffer());},
  async inspect(object){
   const signed=unwrap(await bucket.createSignedUrl(checked(object),60));
   const response=await fetch(signed.signedUrl,{headers:{Range:'bytes=0-15'}});
   if(!response.ok)throw Error('Berkas unggahan tidak ditemukan.');
   const range=response.headers.get('content-range'),size=Number(range?.split('/')[1]||response.headers.get('content-length'));
   const reader=response.body.getReader();let header=Buffer.alloc(0);try{while(header.length<16){const {value,done}=await reader.read();if(done)break;header=Buffer.concat([header,Buffer.from(value)]).subarray(0,16);}}finally{await reader.cancel();}
   return {size,header};
  },
  async signUpload(object){return unwrap(await bucket.createSignedUploadUrl(checked(object),{upsert:false})).signedUrl;},
  async remove(object){unwrap(await bucket.remove([checked(object)]));},
  async serve(res,object,{name,download=false}={}){const signed=unwrap(await bucket.createSignedUrl(checked(object),120,download?{download:name}:undefined));res.redirect(302,signed.signedUrl);},
 };
}
