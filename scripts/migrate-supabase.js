import {DatabaseSync,backup} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdir,readFile,chmod} from 'node:fs/promises';
import path from 'node:path';
import {openDatabase,tables} from '../server/database.js';
import {createObjectStore} from '../server/storage.js';

const dataDir=path.resolve(process.env.DATA_DIR||'data');
if(!process.env.DATABASE_URL||!process.env.SUPABASE_URL)throw Error('Isi DATABASE_URL dan konfigurasi Storage di .env dahulu.');
const source=new DatabaseSync(path.join(dataDir,'bibubebo.sqlite'),{readOnly:true});
await mkdir(path.join(dataDir,'backups'),{recursive:true,mode:0o700});
const destination=path.join(dataDir,'backups','before-supabase-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
await backup(source,destination);
await chmod(destination,0o600);
const copyTables=tables.filter(name=>name!=='migration_history'),snapshot={};
source.exec('BEGIN');try{for(const table of copyTables)snapshot[table]=source.prepare('SELECT * FROM '+table).all();}finally{source.exec('COMMIT');source.close();}
const state=JSON.parse(snapshot.state[0].data),objects=new Map();
for(const item of [...state.acts,...(state.articles||[])])if(item.photo){const filename=path.basename(item.photo);objects.set('photos/'+filename,{mime:'image/'+path.extname(filename).slice(1)});}
for(const file of state.materialFiles||[])objects.set('materials/'+file.filename,{mime:file.mime});
const hash=createHash('sha256').update(JSON.stringify(snapshot));
for(const [key,item]of objects){item.bytes=await readFile(path.join(dataDir,key));item.hash=createHash('sha256').update(item.bytes).digest('hex');hash.update(key).update(item.hash);}
const sourceHash=hash.digest('hex'),db=await openDatabase({initialize:true}),storage=createObjectStore();
try{
 await storage.ensureBucket();
 const previous=await db.prepare('SELECT * FROM migration_history WHERE id=1').get();
 if(previous){if(previous.source_hash!==sourceHash)throw Error('Sumber berbeda dari migrasi sebelumnya. Target tidak ditimpa.');console.log('Migrasi sumber ini sudah selesai; target tidak diubah.');}
 else{
  if((await db.prepare('SELECT id FROM accounts LIMIT 1').get()))throw Error('Target sudah berisi akun. Migrasi dihentikan agar tidak menimpa data.');
  for(const [key,item]of objects){
   // A retry may find objects uploaded before a database rollback.
   try{await storage.put(key,item.bytes,item.mime);}catch(error){const existing=await storage.read(key);if(createHash('sha256').update(existing).digest('hex')!==item.hash)throw error;}
   const stored=await storage.read(key);if(createHash('sha256').update(stored).digest('hex')!==item.hash)throw Error('Verifikasi berkas gagal: '+key);
  }
  await db.transaction(async()=>{
   await db.exec('SELECT pg_advisory_xact_lock(74180532)');
   if(await db.prepare('SELECT id FROM migration_history WHERE id=1').get()||await db.prepare('SELECT id FROM accounts LIMIT 1').get())throw Error('Target berubah selama migrasi; impor dibatalkan.');
   const target=await db.prepare('SELECT data FROM state WHERE id=1').get();
   if(target){const current=JSON.parse(target.data);if(current.users.length||current.acts.length||current.trx.length||current.articles?.length||current.materialFiles?.length)throw Error('Target sudah berisi aktivitas.');await db.prepare('DELETE FROM state').run();}
   for(const table of copyTables)for(const row of snapshot[table]){const columns=Object.keys(row);await db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).run(...Object.values(row));}
   await db.exec("SELECT setval(pg_get_serial_sequence('bibu.audit','id'),COALESCE((SELECT MAX(id) FROM bibu.audit),0)+1,false)");
   const counts=Object.fromEntries(copyTables.map(table=>[table,snapshot[table].length]));
   await db.prepare('INSERT INTO migration_history VALUES(1,?,?,?)').run(sourceHash,new Date().toISOString(),JSON.stringify(counts));
  });
  console.log('Migrasi selesai. Backup SQLite tersimpan di data/backups/.');
 }
 for(const table of copyTables){const rows=await db.prepare('SELECT * FROM '+table).all();console.log(table+': '+rows.length+' baris');}
 console.log('Berkas privat terverifikasi: '+objects.size);
}finally{await db.close();}
