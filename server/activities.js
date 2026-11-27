import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {points} from '../shared/catalog.js';
export const activityKey=(uid,clientId)=>createHash('sha256').update(uid+':'+clientId).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const photoKey=photo=>/^\/api\/photos\/[a-f0-9-]+\.(jpeg|png|webp)$/.test(photo||'')?'photos/'+path.basename(photo):null;
const references=(state,key)=>[...state.acts,...(state.articles||[])].some(record=>photoKey(record.photo)===key);
export function mountActivityManagement(app,{db,read,transaction,requireRole,storage}){
 const context=(...roles)=>(req,_res,next)=>roles.includes(req.account?.role)?next():next(Object.assign(new Error('Gunakan halaman Petugas atau Super Admin yang sesuai.'),{status:403}));
 async function cleanup(id){const event=await db.prepare('SELECT cleanup_key,cleanup_status FROM activity_changes WHERE id=?').get(id);if(!event?.cleanup_key||event.cleanup_status==='done')return event?.cleanup_status||'not-required';
  const shared=references(await read(),event.cleanup_key);if(shared){await db.prepare('UPDATE activity_changes SET cleanup_status=? WHERE id=?').run('shared',id);return 'shared';}
  try{await storage.remove(event.cleanup_key);await db.prepare('UPDATE activity_changes SET cleanup_status=? WHERE id=?').run('done',id);return 'done';}catch{await db.prepare('UPDATE activity_changes SET cleanup_status=? WHERE id=?').run('pending',id);return 'pending';}
 }
 app.get('/api/activity-management',requireRole('admin','superadmin'),context('admin','superadmin'),async(req,res)=>{
  const state=await read(),q=String(req.query.q||'').trim().toLowerCase().slice(0,100),status=String(req.query.status||''),page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1));
  const rows=state.acts.filter(action=>{const user=state.users.find(u=>u.id===action.uid);return (!q||[action.act,user?.name,user?.bibu,String(action.id)].join(' ').toLowerCase().includes(q))&&(!status||(status==='hidden'?action.status==='verified'&&action.publicVisible===false:action.status===status));}).sort((a,b)=>b.id-a.id);
  res.json({actions:rows.slice((page-1)*12,page*12).map(action=>({...action,residentName:state.users.find(u=>u.id===action.uid)?.name||'Warga',residentBibu:state.users.find(u=>u.id===action.uid)?.bibu||'',currentPoints:points(state,action.uid),balance:points(state,action.uid)-(state.users.find(u=>u.id===action.uid)?.spent||0)})),total:rows.length,page,pages:Math.max(1,Math.ceil(rows.length/12)),canModerate:req.account.roles.includes('admin'),canDelete:req.account.role==='superadmin'});
 });
 app.get('/api/activity-management/history',requireRole('admin','superadmin'),context('admin','superadmin'),async(req,res)=>{
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1)),total=Number((await db.prepare('SELECT COUNT(*) AS count FROM activity_changes').get()).count);
  const events=await db.prepare('SELECT id,action_id,actor_email,operation,reason,details,cleanup_status,created FROM activity_changes ORDER BY created DESC,id DESC LIMIT ? OFFSET ?').all(20,(page-1)*20);
  res.json({events:events.map(event=>({...event,details:JSON.parse(event.details)})),total,page,pages:Math.max(1,Math.ceil(total/20)),canDelete:req.account.role==='superadmin'});
 });
 for(const operation of ['visibility','cancel','delete'])app.post('/api/actions/:id/'+operation,requireRole(operation==='delete'?'superadmin':'admin'),context(...(operation==='delete'?['superadmin']:['admin','superadmin'])),async(req,res)=>{
  const reason=typeof req.body.reason==='string'?req.body.reason.trim():'';if(reason.length<5||reason.length>500)fail(400,'Tulis alasan minimal 5 dan maksimal 500 karakter.');
  if(operation==='visibility'&&typeof req.body.visible!=='boolean')fail(400,'Pilih status publikasi.');
  if(operation==='delete'&&req.body.confirmation!=='HAPUS')fail(400,'Ketik HAPUS untuk mengonfirmasi penghapusan permanen.');
  const result=await transaction(req.account.id,'activity.'+operation,async state=>{
   // Permissions are checked again after taking the state lock.
   const actor=await db.prepare('SELECT id,email,role FROM accounts WHERE id=?').get(req.account.id);if(!actor)fail(403,'Akses tidak tersedia.');
   const needed=operation==='delete'?'superadmin':'admin';const current=actor.role===needed||!!(await db.prepare(needed==='superadmin'?'SELECT uid FROM super_admins WHERE uid=?':'SELECT uid FROM account_roles WHERE uid=? AND role=\'admin\'').get(actor.id));if(!current)fail(403,'Hak akses Anda sudah dicabut.');
   const action=state.acts.find(item=>String(item.id)===req.params.id);if(!action)fail(404,'Kegiatan tidak ditemukan atau sudah dihapus.');
   const before=points(state,action.uid),resident=state.users.find(user=>user.id===action.uid),previousStatus=action.status,previousVisible=action.publicVisible!==false;
   if(operation==='visibility'){
    if(action.status!=='verified')fail(409,'Hanya kegiatan disetujui yang dapat dipublikasikan atau disembunyikan.');
    if(previousVisible===req.body.visible)return {changed:false,pointsDelta:0};action.publicVisible=req.body.visible;
   }
   if(operation==='cancel'){
    if(action.status==='cancelled')return {changed:false,pointsDelta:0};
    action.status='cancelled';action.publicVisible=false;action.reason=reason;action.cancelledAt=new Date().toISOString();action.cancelledBy=actor.id;
   }
   let key=null,cleanupStatus='not-required';
   if(operation==='delete'){
    state.nextActionId=state.acts.reduce((max,item)=>Math.max(max,Number(item.id)+1),state.nextActionId||1);
    if(action.clientId){state.deletedActionKeys??=[];state.deletedActionKeys.push(activityKey(action.uid,action.clientId));}
    state.acts=state.acts.filter(item=>item.id!==action.id);key=photoKey(action.photo);
    if(key){cleanupStatus=references(state,key)?'shared':'pending';if(cleanupStatus!=='shared')state.uploads=(state.uploads||[]).filter(upload=>'photos/'+upload.filename!==key);}
   }
   const after=points(state,action.uid),id=randomUUID(),details={title:action.act,residentId:action.uid,residentName:resident?.name||'Warga',previousStatus,status:operation==='delete'?'deleted':action.status,previousVisible,visible:operation==='visibility'?req.body.visible:false,pointsBefore:before,pointsAfter:after,pointsDelta:after-before,balanceAfter:after-(resident?.spent||0)};
   await db.prepare('INSERT INTO activity_changes VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,action.id,actor.id,actor.email,operation,reason,JSON.stringify(details),key,cleanupStatus,new Date().toISOString());
   if(['cancel','delete'].includes(operation)&&resident){resident.notes.unshift('Kegiatan "'+action.act+'" '+(operation==='cancel'?'dibatalkan petugas':'dihapus pengelola')+': '+reason+'. Koreksi poin '+(after-before)+'.');resident.notes=resident.notes.slice(0,100);}
   return {changed:true,eventId:id,...details,cleanupStatus};
  });
  if(operation==='delete'&&result.eventId)result.cleanupStatus=await cleanup(result.eventId);
  res.json(result);
 });
 app.post('/api/activity-management/cleanup/:id',requireRole('superadmin'),context('superadmin'),async(req,res)=>{
  const event=await db.prepare('SELECT id FROM activity_changes WHERE id=? AND operation=?').get(req.params.id,'delete');if(!event)fail(404,'Riwayat penghapusan tidak ditemukan.');res.json({cleanupStatus:await cleanup(event.id)});
 });
}
