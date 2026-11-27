import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const formats={'.mp4':['video','video/mp4'],'.pptx':['powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'],'.ppt':['powerpoint','application/vnd.ms-powerpoint'],'.pdf':['module','application/pdf'],'.docx':['module','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],'.doc':['module','application/msword']};
const photos={'.jpeg':['photo','image/jpeg'],'.jpg':['photo','image/jpeg'],'.png':['photo','image/png'],'.webp':['photo','image/webp']};
export function validHeader(ext,header){return ['.jpeg','.jpg'].includes(ext)?header[0]===255&&header[1]===216:ext==='.png'?header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):ext==='.webp'?header.toString('ascii',0,4)==='RIFF'&&header.toString('ascii',8,12)==='WEBP':ext==='.pdf'?header.toString('ascii',0,5)==='%PDF-':ext==='.mp4'?header.toString('ascii',4,8)==='ftyp':['.pptx','.docx'].includes(ext)?header[0]===80&&header[1]===75:header.subarray(0,8).equals(Buffer.from('d0cf11e0a1b11ae1','hex'));}
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function mountUploads(app,{storage,read,transaction,requireRole}){
 app.post('/api/uploads/sign',requireRole('peserta','admin'),async(req,res)=>{
  const {purpose,name,size}=req.body;if(!['photo','material'].includes(purpose))fail(400,'Jenis unggahan tidak valid.');
  if(purpose==='material'&&!req.account.roles.includes('admin'))fail(403,'Akses tidak diizinkan.');
  if(!storage.remote)return res.json({direct:false});
  const ext=path.extname(typeof name==='string'?name:'').toLowerCase(),format=(purpose==='photo'?photos:formats)[ext],max=purpose==='photo'?6*1024*1024:50*1024*1024;
  if(!format||!Number.isInteger(size)||size<12||size>max)fail(400,'Format atau ukuran berkas tidak valid.');
  const id=randomUUID(),filename=id+(ext==='.jpg'?'.jpeg':ext),key=(purpose==='photo'?'photos/':'materials/')+filename;
  const pending={id,uid:req.account.id,purpose,key,filename,name:path.basename(name).replace(/[\r\n]/g,'').slice(0,160),kind:format[0],mime:format[1],size,expires:Date.now()+2*60*60*1000};
  await transaction(req.account.id,'upload.sign',state=>{state.uploads??=[];state.uploads=state.uploads.filter(upload=>upload.expires>Date.now()||upload.completed);if(state.uploads.filter(upload=>upload.uid===req.account.id&&!upload.completed).length>=20)fail(429,'Terlalu banyak unggahan belum selesai. Coba lagi nanti.');state.uploads.push(pending);});
  res.json({direct:true,id,signedUrl:await storage.signUpload(key),mime:pending.mime});
 });
 app.post('/api/uploads/:id/complete',requireRole('peserta','admin'),async(req,res)=>{
  const pending=(await read()).uploads?.find(upload=>upload.id===req.params.id&&upload.uid===req.account.id);
  if(!pending)fail(404,'Unggahan tidak ditemukan.');if(pending.expires<Date.now()&&!pending.completed)fail(400,'Unggahan kedaluwarsa.');
  if(pending.purpose==='material'&&!req.account.roles.includes('admin'))fail(403,'Akses tidak diizinkan.');
  if(!pending.completed){const object=await storage.inspect(pending.key);if(object.size!==pending.size||!validHeader(path.extname(pending.filename),object.header)){await storage.remove(pending.key);fail(400,'Isi berkas tidak cocok dengan format atau ukuran.');}}
  const file=await transaction(req.account.id,'upload.complete',state=>{
   const upload=state.uploads.find(upload=>upload.id===pending.id);if(!upload)fail(410,'Unggahan telah dihapus pengelola.');upload.completed=true;
   if(upload.purpose==='photo')return {photo:'/api/photos/'+upload.filename};
   state.materialFiles??=[];let file=state.materialFiles.find(file=>file.id===upload.id);if(!file){file={id:upload.id,filename:upload.filename,name:upload.name,kind:upload.kind,mime:upload.mime,size:upload.size,createdBy:upload.uid};state.materialFiles.push(file);}return {file:{id:file.id,name:file.name,kind:file.kind,size:file.size}};
  });res.json(file);
 });
}
