import {openDatabase} from '../server/database.js';
import {createObjectStore} from '../server/storage.js';
if(!process.env.DATABASE_URL||!process.env.SUPABASE_URL)throw Error('Isi konfigurasi Supabase di .env dahulu.');
const db=await openDatabase({initialize:true});
try{await createObjectStore().ensureBucket();console.log('Schema PostgreSQL dan bucket privat siap.');}finally{await db.close();}
