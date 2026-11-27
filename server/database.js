import {AsyncLocalStorage} from 'node:async_hooks';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

export const tables=['accounts','sessions','state','audit','verified_accounts','account_roles','email_tokens','super_admins','role_changes','activity_changes','admin_changes','migration_history'];
export function postgresSQL(sql){
 let index=0;
 sql=sql.replace(/\?/g,()=>'$'+(++index));
 if(/^INSERT OR IGNORE /i.test(sql))sql=sql.replace(/^INSERT OR IGNORE /i,'INSERT ')+' ON CONFLICT DO NOTHING';
 return sql.replace(new RegExp('\\b('+tables.join('|')+')\\b','g'),name=>'bibu.'+name);
}
export async function openDatabase({dataDir,dbPath,connectionString=process.env.DATABASE_URL,postgresClient,initialize=!!postgresClient}={}){
 const context=new AsyncLocalStorage();
 let pool,sqlite,queue=Promise.resolve();
 const postgres=!!(connectionString||postgresClient);
 if(postgresClient)pool=postgresClient;
 else if(connectionString){
  const {Pool}=await import('pg');
  const url=new URL(connectionString);
  let ssl;
  if(url.hostname.endsWith('.supabase.com')||url.hostname.endsWith('.supabase.co')){url.searchParams.delete('sslmode');url.searchParams.delete('sslrootcert');ssl={rejectUnauthorized:true,ca:await readFile(new URL('./certs/supabase-ca.crt',import.meta.url),'utf8')};}
  pool=new Pool({connectionString:url.href,ssl,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});
  if(process.env.VERCEL){const {attachDatabasePool}=await import('@vercel/functions');attachDatabasePool(pool);}
  pool.on('error',()=>console.error('PostgreSQL pool connection failed.'));
 }else{
  if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('DATABASE_URL wajib untuk deployment. SQLite hanya untuk pengembangan lokal.');
  const {DatabaseSync}=await import('node:sqlite');sqlite=new DatabaseSync(dbPath||path.join(dataDir,'bibubebo.sqlite'));sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
 }
 async function exclusive(fn){const previous=queue;let release;queue=new Promise(resolve=>{release=resolve;});await previous;try{return await fn();}finally{release();}}
 async function query(sql,params=[]){
  if(postgres){
   const client=context.getStore()||pool;
   let statement=postgresSQL(sql);
   if(context.getStore()&&/^SELECT data FROM bibu.state WHERE id=1$/.test(statement))statement+=' FOR UPDATE';
   return client.query(statement,params);
  }
  const run=()=>{const statement=sqlite.prepare(sql);if(/^\s*(SELECT|PRAGMA)/i.test(sql))return {rows:statement.all(...params)};const result=statement.run(...params);return {rows:[],rowCount:result.changes};};
  return context.getStore()?run():exclusive(run);
 }
 const db={
  dialect:postgres?'postgres':'sqlite',
  prepare(sql){return {async get(...params){return (await query(sql,params)).rows[0];},async all(...params){return (await query(sql,params)).rows;},async run(...params){const result=await query(sql,params);return {changes:result.rowCount};}};},
  async exec(sql){if(postgres)return (context.getStore()||pool).query(sql);const run=()=>sqlite.exec(sql);return context.getStore()?run():exclusive(run);},
  async transaction(fn){
   if(context.getStore())return fn();
   if(postgres){
    const client=postgresClient?pool:await pool.connect();
    const run=async()=>{await client.query('BEGIN');try{const result=await context.run(client,fn);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{if(!postgresClient)client.release();}};
    return postgresClient?exclusive(run):run();
   }
   return exclusive(async()=>{sqlite.exec('BEGIN IMMEDIATE');try{const result=await context.run(true,fn);sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}});
  },
  async close(){if(postgres){if(!postgresClient)await pool.end();}else sqlite.close();},
 };
 if(postgres&&initialize){const schema=await readFile(new URL('../migrations/001-postgres.sql',import.meta.url),'utf8');if(postgresClient?.exec)await postgresClient.exec(schema);else await pool.query(schema);}
 return db;
}
