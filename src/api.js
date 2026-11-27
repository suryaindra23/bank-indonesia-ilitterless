function contextHeaders(){const role=globalThis.document?.body?.dataset.apiRole||globalThis.document?.body?.dataset.dashboardRole;return role?{'X-Bibu-Role':role}:{};}
async function directUpload(file,purpose){
 const signed=await api('/uploads/sign',{purpose,name:file.name,size:file.size});
 if(!signed.direct)return null;
 const response=await fetch(signed.signedUrl,{method:'PUT',headers:{'Content-Type':signed.mime,'x-upsert':'false'},body:await file.arrayBuffer(),signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error('Unggahan ke Storage gagal. Coba lagi.');
 return api('/uploads/'+signed.id+'/complete',{});
}
export async function api(path, body) {
 if(['/actions','/articles'].includes(path)&&typeof body?.photo==='string'&&body.photo.startsWith('data:image/')){
  const blob=await (await fetch(body.photo)).blob(),file=new File([blob],'foto.'+(blob.type.split('/')[1]||'jpeg'),{type:blob.type});
  const uploaded=await directUpload(file,'photo');if(uploaded)body={...body,photo:uploaded.photo};
 }
 let response;
 try {
  response=await fetch('/api'+path,{credentials:'same-origin',signal:AbortSignal.timeout(30000),method:body===undefined?'GET':'POST',headers:{...contextHeaders(),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
 } catch {throw Object.assign(new Error('Server tidak terhubung. Periksa koneksi lalu coba lagi.'),{network:true});}
 const data=await response.json().catch(()=>({error:'Server belum tersedia. Coba lagi.'}));
 if(!response.ok)throw Object.assign(new Error(data.error || 'Permintaan gagal.'),{status:response.status,verificationRequired:data.verificationRequired});
 return data;
}
const queueKey=uid=>'bibubebo:outbox:'+uid;
export async function uploadMaterial(file){
 const uploaded=await directUpload(file,'material');if(uploaded)return uploaded.file;
 const body=new FormData();body.append('file',file);
 let response;try{response=await fetch('/api/materials/file',{method:'POST',body,headers:contextHeaders(),credentials:'same-origin',signal:AbortSignal.timeout(180000)});}catch{throw Error('Unggahan gagal. Periksa koneksi dan coba lagi.');}
 const result=await response.json();if(!response.ok)throw Error(result.error||'Unggahan gagal.');return result.file;
}
export function queued(uid){try{return JSON.parse(localStorage.getItem(queueKey(uid))) || [];}catch{return [];}}
export function enqueue(uid,action){
 try{localStorage.setItem(queueKey(uid),JSON.stringify([...queued(uid),action]));}
 catch{throw Error('Penyimpanan perangkat penuh. Foto belum tersimpan; jangan tutup halaman.');}
}
export async function flushQueue(uid){
 const items=queued(uid);
 for(const action of items){try{await api('/actions',action);}catch(error){if(error.status!==410)throw error;}const remaining=queued(uid).filter(a=>a.clientId!==action.clientId);localStorage.setItem(queueKey(uid),JSON.stringify(remaining));}
}
