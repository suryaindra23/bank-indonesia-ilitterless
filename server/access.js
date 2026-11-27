import {randomUUID,randomBytes} from 'node:crypto';
export const ACCESS_ROLES=['peserta','admin','bi','superadmin'];
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function mountAccess(app,{db,read,write,rolesFor,requireRole,limitAccess}){
 const contextual=(req,_res,next)=>{if(req.account?.role!=='superadmin')return next(Object.assign(new Error('Buka halaman Super Admin untuk mengelola akses.'),{status:403}));next();};
 const safe=async account=>({...account,roles:await rolesFor(account),emailVerified:!!(await db.prepare('SELECT uid FROM verified_accounts WHERE uid=?').get(account.id))});
 app.get('/api/super-admin/users',requireRole('superadmin'),contextual,async(req,res)=>{
  const q=typeof req.query.q==='string'?req.query.q.trim().slice(0,100).toLowerCase():'',page=Math.max(1,Math.min(100000,Number.parseInt(req.query.page,10)||1)),size=20;
  const where=q?' WHERE LOWER(a.name) LIKE ? OR LOWER(a.email) LIKE ?':'',params=q?['%'+q+'%','%'+q+'%']:[];
  const count=Number((await db.prepare('SELECT COUNT(*) AS count FROM accounts a'+where).get(...params)).count);
  const accounts=await db.prepare('SELECT a.id,a.name,a.email,a.role FROM accounts a'+where+' ORDER BY LOWER(a.name),a.id LIMIT ? OFFSET ?').all(...params,size,(page-1)*size);
  res.json({users:await Promise.all(accounts.map(safe)),page,total:count,pages:Math.max(1,Math.ceil(count/size))});
 });
 app.post('/api/super-admin/users/:id/roles',requireRole('superadmin'),contextual,limitAccess,async(req,res)=>{
  const roles=req.body.roles;if(!Array.isArray(roles)||!roles.length||roles.length>4||new Set(roles).size!==roles.length||roles.some(role=>!ACCESS_ROLES.includes(role)))fail(400,'Pilih minimal satu role yang valid.');
  const result=await db.transaction(async()=>{
   const state=await read();
   const actor=await db.prepare('SELECT id,email,name,role FROM accounts WHERE id=?').get(req.account.id);
   if(!actor||!(await rolesFor(actor)).includes('superadmin'))fail(403,'Akses Super Admin sudah dicabut.');
   const target=await db.prepare('SELECT id,email,name,loc,role FROM accounts WHERE id=?').get(req.params.id);if(!target)fail(404,'Pengguna tidak ditemukan.');
   const before=await rolesFor(target);const verified=await db.prepare('SELECT uid FROM verified_accounts WHERE uid=?').get(target.id);
   if(target.role==='peserta'&&!verified&&roles.some(role=>role!=='peserta'))fail(409,'Pengguna harus memverifikasi email sebelum mendapat akses internal.');
   if(before.includes('superadmin')&&!roles.includes('superadmin')){
    const count=Number((await db.prepare("SELECT COUNT(*) AS count FROM accounts a WHERE a.role='superadmin' OR EXISTS (SELECT 1 FROM super_admins s WHERE s.uid=a.id)").get()).count);
    if(count<=1)fail(409,'Super Admin terakhir tidak dapat dicabut. Tambahkan Super Admin lain terlebih dahulu.');
   }
   const after=ACCESS_ROLES.filter(role=>roles.includes(role));
   if(before.length===after.length&&before.every(role=>after.includes(role)))return {...target,roles:before,changed:false};
   const primary=roles.includes(target.role)?target.role:after[0];
   await db.prepare('UPDATE accounts SET role=? WHERE id=?').run(primary,target.id);
   await db.prepare('DELETE FROM account_roles WHERE uid=?').run(target.id);
   for(const role of after.filter(role=>role!=='superadmin'))await db.prepare('INSERT INTO account_roles VALUES(?,?)').run(target.id,role);
   await db.prepare('DELETE FROM super_admins WHERE uid=?').run(target.id);
   if(after.includes('superadmin'))await db.prepare('INSERT INTO super_admins VALUES(?,?,?)').run(target.id,actor.id,new Date().toISOString());
   if(after.includes('peserta')&&!state.users.some(user=>user.id===target.id)){state.users.push({id:target.id,email:target.email,name:target.name,loc:target.loc,phone:'',reg:1,bibu:'BIBU-'+randomBytes(6).toString('hex').toUpperCase(),ls:[],prev:0,spent:0,vouchers:[],notes:[],wa:[],shown:null,lastStg:null});await write(state);}
   const created=new Date().toISOString();
   await db.prepare('INSERT INTO role_changes VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),actor.id,actor.email,target.id,target.email,JSON.stringify(before),JSON.stringify(after),created);
   await db.prepare('INSERT INTO audit(uid,action,created) VALUES(?,?,?)').run(actor.id,'roles.update:'+target.id,created);
   return {...target,role:primary,roles:after,changed:true};
  });
  delete result.loc;res.json({user:result});
 });
 app.get('/api/super-admin/history',requireRole('superadmin'),contextual,async(req,res)=>{
  const page=Math.max(1,Math.min(100000,Number.parseInt(req.query.page,10)||1)),size=20,total=Number((await db.prepare('SELECT COUNT(*) AS count FROM role_changes').get()).count);
  const rows=await db.prepare('SELECT * FROM role_changes ORDER BY created DESC,id DESC LIMIT ? OFFSET ?').all(size,(page-1)*size);
  res.json({history:rows.map(row=>({...row,before:JSON.parse(row.before_roles),after:JSON.parse(row.after_roles),before_roles:undefined,after_roles:undefined})),total,page,pages:Math.max(1,Math.ceil(total/size))});
 });
}
