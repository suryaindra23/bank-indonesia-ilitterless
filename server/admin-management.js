import {randomUUID} from 'node:crypto';
import {locationRows,parseLocations} from '../shared/locations.js';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
export function mountAdminManagement(app,{db,read,write,transaction,rolesFor,requireRole,limitAccess,sendToken}){
 const context=(req,_res,next)=>req.account.role==='superadmin'?next():next(Object.assign(Error('Buka halaman Super Admin.'),{status:403}));
 async function actor(req){const account=await db.prepare('SELECT id,email,role FROM accounts WHERE id=?').get(req.account.id);if(!account||!(await rolesFor(account)).includes('superadmin'))fail(403,'Akses Super Admin sudah dicabut.');return account;}
 async function audit(req,operation,target,details){await db.prepare('INSERT INTO admin_changes VALUES(?,?,?,?,?,?,?)').run(randomUUID(),req.account.id,req.account.email,operation,target,JSON.stringify(details),new Date().toISOString());}
 app.get('/api/locations',async(_req,res)=>res.json({locations:locationRows(await read()).filter(row=>row.active)}));
 app.get('/api/super-admin/locations',requireRole('superadmin'),context,async(_req,res)=>res.json({locations:locationRows(await read())}));
 app.post('/api/super-admin/locations/import',requireRole('superadmin'),context,limitAccess,async(req,res)=>{
  let parsed;try{parsed=parseLocations(req.body.text);}catch(error){fail(400,error.message);}
  const result=await transaction(req.account.id,'locations.import',async state=>{await actor(req);state.locations=locationRows(state);const existing=new Set(state.locations.map(row=>row.name.toLocaleLowerCase('id-ID'))),added=[],skipped=[...parsed.duplicates];
   for(const name of parsed.names){if(existing.has(name.toLocaleLowerCase('id-ID'))){skipped.push(name);continue;}added.push(name);state.locations.push({name,active:true});}
   await audit(req,'locations.import','locations',{added,skipped});return {added,skipped,locations:state.locations};});res.json(result);
 });
 app.post('/api/super-admin/locations/status',requireRole('superadmin'),context,limitAccess,async(req,res)=>{
  if(typeof req.body.active!=='boolean')fail(400,'Pilih status kelurahan.');
  await transaction(req.account.id,'locations.status',async state=>{await actor(req);state.locations=locationRows(state);const row=state.locations.find(row=>row.name===req.body.name);if(!row)fail(404,'Kelurahan tidak ditemukan.');if(!req.body.active&&row.active&&state.locations.filter(row=>row.active).length===1)fail(409,'Sisakan minimal satu kelurahan aktif.');row.active=req.body.active;await audit(req,'locations.status',row.name,{active:row.active});});res.json({ok:true});
 });
 app.post('/api/super-admin/users/:id/reset-password',requireRole('superadmin'),context,limitAccess,async(req,res)=>{
  await actor(req);const target=await db.prepare('SELECT id,email FROM accounts WHERE id=?').get(req.params.id);if(!target)fail(404,'Pengguna tidak ditemukan.');
  await sendToken(target,'reset');await audit(req,'password.reset-request',target.id,{email:target.email});res.json({message:'Permintaan tautan reset diproses. Pengguna perlu memeriksa email; pengiriman ulang dibatasi satu menit.'});
 });
 app.post('/api/super-admin/users/:id/delete',requireRole('superadmin'),context,limitAccess,async(req,res)=>{
  const reason=typeof req.body.reason==='string'?req.body.reason.trim():'';if(reason.length<5||reason.length>500||req.body.confirmation!=='HAPUS')fail(400,'Isi alasan 5–500 karakter dan ketik HAPUS.');
  await db.transaction(async()=>{
   const state=await read();await actor(req);const target=await db.prepare('SELECT id,email,role FROM accounts WHERE id=?').get(req.params.id);if(!target)fail(404,'Pengguna sudah dihapus atau tidak ditemukan.');if(target.id===req.account.id)fail(409,'Anda tidak dapat menghapus akun sendiri.');
   if((await rolesFor(target)).includes('superadmin')){const count=Number((await db.prepare("SELECT COUNT(*) AS count FROM accounts a WHERE a.role='superadmin' OR EXISTS(SELECT 1 FROM super_admins s WHERE s.uid=a.id)").get()).count);if(count<=1)fail(409,'Super Admin terakhir tidak dapat dihapus.');}
   const user=state.users.find(user=>user.id===target.id);if(user){user.name='Pengguna dihapus';delete user.email;delete user.profile;user.phone='';user.wa=[];user.notes=[];user.deletedAt=new Date().toISOString();}
   for(const table of ['sessions','email_tokens','verified_accounts','account_roles','super_admins'])await db.prepare('DELETE FROM '+table+' WHERE uid=?').run(target.id);
   await db.prepare('DELETE FROM accounts WHERE id=?').run(target.id);await write(state);await audit(req,'user.delete',target.id,{email:target.email,reason,historyRetained:true});
  });res.json({ok:true});
 });
 app.get('/api/super-admin/admin-history',requireRole('superadmin'),context,async(req,res)=>{const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1)),total=Number((await db.prepare('SELECT COUNT(*) AS count FROM admin_changes').get()).count);const events=await db.prepare('SELECT * FROM admin_changes ORDER BY created DESC,id DESC LIMIT ? OFFSET ?').all(20,(page-1)*20);res.json({events:events.map(event=>({...event,details:JSON.parse(event.details)})),page,total,pages:Math.max(1,Math.ceil(total/20))});});
}
