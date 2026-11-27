import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { openDatabase } from './database.js';
import { createObjectStore } from './storage.js';
import {mountUploads} from './uploads.js';
import {mountParticipation,profileComplete,publicOverview} from './participation.js';
import {mountAccess} from './access.js';
import {mountActivityManagement,activityKey} from './activities.js';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { TILES, MIS, LES, DEFAULT_REWARDS, points, completedMissions, dailyAward } from '../shared/catalog.js';
import {locationNames} from '../shared/locations.js';
import {mountAdminManagement} from './admin-management.js';
import { mountArticles } from './articles.js';
import { mountMaterials } from './materials.js';
import { createMailer } from './mail.js';
import { communityStandings } from '../shared/community.js';
import { co2e } from '../shared/carbon.js';
const scrypt = promisify(scryptCallback);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => {throw Object.assign(new Error(message), { status });};
const text = (value, max = 100) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const emailOf = (value) => text(value, 254).toLowerCase();
const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const publicAccount = (a) => a ? { id: a.id, email: a.email, name: a.name, loc: a.loc, role: a.role, roles: a.roles || [a.role] } : null;

export async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `${salt}:${hash.toString('hex')}`;
}
async function passwordMatches(password, encoded) {
  const [salt, hex] = encoded.split(':');
  const hash = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(hash, Buffer.from(hex, 'hex'));
}

export async function createApp({ dataDir = path.resolve('data'), dbPath, limit = 30, mailer, database, objectStore, now=()=>new Date() } = {}) {
  dataDir = path.resolve(process.env.VERCEL?'/tmp/bibubebo':dataDir);
  if((process.env.VERCEL||process.env.DATABASE_URL)&&!objectStore&&!process.env.SUPABASE_URL)throw Error('SUPABASE_URL dan service role wajib; penyimpanan lokal tidak digunakan di cloud.');
  if(process.env.VERCEL&&!/^https:\/\//.test(process.env.APP_ORIGIN||''))throw Error('APP_ORIGIN wajib berupa alamat HTTPS aplikasi.');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const photoDir = path.join(dataDir, 'photos');mkdirSync(photoDir, { recursive: true, mode: 0o700 });
  mailer ??= createMailer({ previewDir: path.join(dataDir, 'mail-preview') });
  const db = database || (await openDatabase({ dataDir, dbPath }));
  const storage = objectStore || createObjectStore({ dataDir });
  if (db.dialect === 'sqlite') await db.exec(`
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,loc TEXT NOT NULL,role TEXT NOT NULL,password_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES accounts(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,uid TEXT NOT NULL,action TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS verified_accounts(uid TEXT PRIMARY KEY REFERENCES accounts(id));
 CREATE TABLE IF NOT EXISTS account_roles(uid TEXT NOT NULL REFERENCES accounts(id),role TEXT NOT NULL CHECK(role IN ('peserta','admin','bi')),PRIMARY KEY(uid,role));
 CREATE TABLE IF NOT EXISTS super_admins(uid TEXT PRIMARY KEY REFERENCES accounts(id),granted_by TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS activity_changes(id TEXT PRIMARY KEY,action_id INTEGER NOT NULL,actor_id TEXT NOT NULL,actor_email TEXT NOT NULL,operation TEXT NOT NULL,reason TEXT NOT NULL,details TEXT NOT NULL,cleanup_key TEXT,cleanup_status TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS role_changes(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,actor_email TEXT NOT NULL,target_id TEXT NOT NULL,target_email TEXT NOT NULL,before_roles TEXT NOT NULL,after_roles TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS admin_changes(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,actor_email TEXT NOT NULL,operation TEXT NOT NULL,target_id TEXT NOT NULL,details TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS email_tokens(token_hash TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES accounts(id),purpose TEXT NOT NULL,expires INTEGER NOT NULL,created INTEGER NOT NULL);
 `);
  await db.prepare('INSERT OR IGNORE INTO state VALUES(1,?)').run(JSON.stringify({ users: [], acts: [], trx: [], articles: [], pointRulesVersion: 2, rewards: DEFAULT_REWARDS, pilotStart: process.env.PILOT_START || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) }));
  const read = async () => JSON.parse((await db.prepare('SELECT data FROM state WHERE id=1').get()).data);
  const write = async (state) => await db.prepare('UPDATE state SET data=? WHERE id=1').run(JSON.stringify(state));
  const transaction = async (uid, action, fn) => await db.transaction(async () => {
    const state = await read();const result = await fn(state);await write(state);
    await db.prepare('INSERT INTO audit(uid,action,created) VALUES(?,?,?)').run(uid, action, new Date().toISOString());return result;
  });
  if ((await read()).pointRulesVersion !== 2) await transaction('system', 'points.rules.migrate', (state) => {
    state.legacyMissionKeys = state.users.flatMap((user) => completedMissions(state, user.id).map((m) => m.key));
    for (const action of state.acts) if (action.status === 'verified') action.awardedPoints = 50;
    state.pointRulesVersion = 2;state.articles ??= [];delete state.missionPolicyVersion;
  });
  if (!Array.isArray((await read()).lessons)) await transaction('system', 'materials.initialize', (state) => {state.lessons = structuredClone(LES);});
  if ((await read()).rewards?.some((r) => r.n === 'Tumbler BIBUBEBO')) await transaction('system', 'brand.rename.kobi', (state) => {for (const r of state.rewards) if (r.n === 'Tumbler BIBUBEBO') r.n = 'Tumbler COBI';});
  if((await read()).missionPolicyVersion!==2)await transaction('system','quiz.replace.missions',state=>{
    if(state.missionPolicyVersion===2)return;
    state.frozenMissionPoints=Object.fromEntries(state.users.map(user=>[user.id,completedMissions(state,user.id).reduce((sum,m)=>sum+(state.legacyMissionKeys?.includes(m.key)?100:10),0)]));state.missionPolicyVersion=2;
  });
  if((await read()).rewards.some(reward=>reward.n==='Tumbler KOBI'))await transaction('system','brand.cobi.catalog',state=>{for(const reward of state.rewards)if(reward.n==='Tumbler KOBI')reward.n='Tumbler COBI';});
  const pilotStart = process.env.PILOT_START || (await read()).pilotStart || '2026-11-09';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pilotStart) || !Number.isFinite(Date.parse(pilotStart))) throw Error('PILOT_START harus YYYY-MM-DD');
  const date = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const week = () => Math.max(1, Math.floor((Date.parse(date()) - Date.parse(pilotStart)) / 604800000) + 1);
  const app = express();app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use('/api', (_req, res, next) => {res.set('Cache-Control', 'no-store');res.set('X-Content-Type-Options', 'nosniff');next();});
  app.use('/api', (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const allowed = process.env.APP_ORIGIN || (process.env.NODE_ENV === 'production' ? `${req.protocol}://${req.get('host')}` : 'http://127.0.0.1:' + (process.env.VITE_PORT || '5173'));
      if (req.get('origin') && req.get('origin') !== allowed) return next(Object.assign(new Error('Asal permintaan tidak diizinkan.'), { status: 403 }));
      if (!req.is('application/json') && !(req.path === '/materials/file' && req.is('multipart/form-data'))) return next(Object.assign(new Error('Gunakan JSON.'), { status: 415 }));
    }next();
  });
  app.use(express.json({ limit: '9mb' }));
  const tokenOf = (req) => req.headers.cookie?.split(';').map((s) => s.trim()).find((s) => s.startsWith('bibu_session='))?.slice(13) || '';
  const rolesFor=async account=>[...new Set([account.role,...(await db.prepare('SELECT role FROM account_roles WHERE uid=?').all(account.id)).map(row=>row.role),...((await db.prepare('SELECT uid FROM super_admins WHERE uid=?').get(account.id))?['superadmin']:[])])];
  app.use('/api', async (req, _res, next) => {
    const token = tokenOf(req);
    req.account = token ? await db.prepare('SELECT a.* FROM accounts a JOIN sessions s ON s.uid=a.id WHERE s.token_hash=? AND s.expires>?').get(digest(token), Date.now()) : null;
    if (req.account?.role === 'peserta' && !(await db.prepare('SELECT uid FROM verified_accounts WHERE uid=?').get(req.account.id))) req.account = null;
    if (req.account) {req.account.roles = await rolesFor(req.account);const requested = req.get('X-Bibu-Role');if (requested && req.account.roles.includes(requested)) req.account.role = requested;}
    next();
  });
  const requireRole = (...roles) => (req, _res, next) => {if (!req.account) return next(Object.assign(new Error('Silakan masuk terlebih dahulu.'), { status: 401 }));if (roles.length && !roles.some((role) => req.account.roles.includes(role))) return next(Object.assign(new Error('Akses tidak diizinkan.'), { status: 403 }));next();};
  const session = async (req, res, uid) => {
    await db.prepare('DELETE FROM sessions WHERE expires<? OR token_hash=?').run(Date.now(), digest(tokenOf(req)));
    const token = randomBytes(32).toString('hex');
    await db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), uid, Date.now() + 7 * 86400000);
    res.cookie('bibu_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000, path: '/' });
  };
  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' } });
  async function sendToken(account, purpose) {
    const previous = await db.prepare('SELECT created FROM email_tokens WHERE uid=? AND purpose=? ORDER BY created DESC LIMIT 1').get(account.id, purpose);
    if (previous && Date.now() - previous.created < 60000) return;
    const token = randomBytes(32).toString('hex');
    await db.prepare('DELETE FROM email_tokens WHERE uid=? AND purpose=?').run(account.id, purpose);
    await db.prepare('INSERT INTO email_tokens VALUES(?,?,?,?,?)').run(digest(token), account.id, purpose, Date.now() + 15 * 60000, Date.now());
    const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:' + (process.env.VITE_PORT || '5173');
    const link = new URL('/warga/', origin);link.searchParams.set('mode', purpose);link.searchParams.set('token', token);
    try {await mailer.send({ to: account.email, subject: purpose === 'verify' ? 'Verifikasi email COBI' : 'Atur ulang kata sandi COBI', text: `${purpose === 'verify' ? 'Verifikasi alamat email untuk mengaktifkan akun COBI.' : 'Gunakan tautan berikut untuk mengatur ulang kata sandi COBI.'}\n\n${link.href}\n\nTautan berlaku 15 menit dan hanya dapat digunakan sekali. Abaikan pesan ini jika Anda tidak memintanya.` });}
    catch {await db.prepare('DELETE FROM email_tokens WHERE token_hash=?').run(digest(token));fail(503, 'Email belum berhasil dikirim. Silakan coba kirim ulang tautan.');}
  }
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/auth/me', (req, res) => res.json({ account: publicAccount(req.account) }));
  app.post('/api/auth/register', authLimit, async (req, res) => {
    const email = emailOf(req.body.email),password = req.body.password,name = text(req.body.name, 60),loc = text(req.body.loc);
    if (!emailValid(email) || typeof password !== 'string' || password.length < 10 || password.length > 128 || name.length < 2 || !locationNames(await read(),true).includes(loc)) fail(400, 'Isi nama, email valid, kelurahan aktif, dan kata sandi 10–128 karakter.');
    const hash = await passwordHash(password),id = randomUUID();
    await transaction(id, 'register', async (state) => {
      if(!locationNames(state,true).includes(loc))fail(409,'Kelurahan tidak lagi aktif. Pilih kelurahan lain.');
      if (await db.prepare('SELECT id FROM accounts WHERE email=?').get(email)) fail(409, 'Email sudah terdaftar. Silakan masuk.');
      await db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id, email, name, loc, 'peserta', hash);
      state.users.push({ id, email, name, loc, phone: '', reg: week(), bibu: 'BIBU-' + randomBytes(6).toString('hex').toUpperCase(), ls: [], prev: 0, spent: 0, vouchers: [], notes: [], wa: [], shown: null, lastStg: null });
    });
    await sendToken(await db.prepare('SELECT * FROM accounts WHERE id=?').get(id), 'verify');
    res.status(201).json({ needsVerification: true, email });
  });
  const dummySalt = '00'.repeat(16),dummyHash = `${dummySalt}:${'00'.repeat(64)}`;
  app.post('/api/auth/login', authLimit, async (req, res) => {
    const email = emailOf(req.body.email),password = req.body.password;
    if (!emailValid(email) || typeof password !== 'string' || password.length > 128) fail(400, 'Isi email dan kata sandi.');
    const account = await db.prepare('SELECT * FROM accounts WHERE email=?').get(email);
    const valid = await passwordMatches(password, account?.password_hash || dummyHash);
    if (!valid || !account) fail(401, 'Email atau kata sandi belum cocok.');
    if (account.role === 'peserta' && !(await db.prepare('SELECT uid FROM verified_accounts WHERE uid=?').get(account.id))) return res.status(403).json({ error: 'Email belum diverifikasi. Buka tautan verifikasi di kotak masuk Anda.', verificationRequired: true });
    await session(req, res, account.id);res.json({ account: publicAccount({ ...account, roles: await rolesFor(account) }) });
  });
  app.post('/api/auth/logout', async (req, res) => {await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(tokenOf(req)));res.clearCookie('bibu_session', { path: '/' });res.json({ ok: true });});
  app.post('/api/auth/resend', authLimit, async (req, res) => {
    const email = emailOf(req.body.email);if (!emailValid(email)) fail(400, 'Isi email valid.');
    const account = await db.prepare('SELECT * FROM accounts WHERE email=?').get(email);
    if (account && !(await db.prepare('SELECT uid FROM verified_accounts WHERE uid=?').get(account.id))) await sendToken(account, 'verify');
    res.json({ message: 'Jika akun belum diverifikasi, tautan verifikasi dikirim ke email Anda.' });
  });
  app.post('/api/auth/verify', authLimit, async (req, res) => {
    const token = text(req.body.token, 128);const record = await db.prepare('SELECT * FROM email_tokens WHERE token_hash=? AND purpose=? AND expires>?').get(digest(token), 'verify', Date.now());
    if (!record) fail(400, 'Tautan verifikasi tidak valid atau kedaluwarsa. Minta tautan baru.');
    await transaction(record.uid, 'email.verify', async () => {if(!(await db.prepare('SELECT uid FROM email_tokens WHERE token_hash=? AND expires>?').get(digest(token),Date.now())))fail(400,'Tautan sudah digunakan atau kedaluwarsa.');await db.prepare('INSERT OR IGNORE INTO verified_accounts VALUES(?)').run(record.uid);await db.prepare('DELETE FROM email_tokens WHERE uid=? AND purpose=?').run(record.uid, 'verify');});
    await session(req, res, record.uid);res.json({ account: publicAccount(await db.prepare('SELECT * FROM accounts WHERE id=?').get(record.uid)) });
  });
  app.post('/api/auth/forgot', authLimit, async (req, res) => {
    const email = emailOf(req.body.email);if (!emailValid(email)) fail(400, 'Isi email valid.');const account = await db.prepare('SELECT * FROM accounts WHERE email=?').get(email);
    if (account) await sendToken(account, 'reset');res.json({ message: 'Jika email terdaftar, tautan pemulihan sudah dikirim. Periksa kotak masuk dan folder spam.' });
  });
  app.post('/api/auth/reset', authLimit, async (req, res) => {
    const token = text(req.body.token, 128),password = req.body.password;
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) fail(400, 'Kata sandi harus 10–128 karakter.');
    const record = await db.prepare('SELECT * FROM email_tokens WHERE token_hash=? AND purpose=? AND expires>?').get(digest(token), 'reset', Date.now());
    if (!record) fail(400, 'Tautan pemulihan tidak valid atau kedaluwarsa.');
    const hash = await passwordHash(password);
    await transaction(record.uid, 'password.reset', async () => {
      if (!(await db.prepare('SELECT uid FROM email_tokens WHERE token_hash=? AND expires>?').get(digest(token),Date.now()))) fail(400, 'Tautan sudah digunakan.');
      await db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(hash, record.uid);await db.prepare('DELETE FROM sessions WHERE uid=?').run(record.uid);await db.prepare('DELETE FROM email_tokens WHERE uid=?').run(record.uid);await db.prepare('INSERT OR IGNORE INTO verified_accounts VALUES(?)').run(record.uid);
    });res.clearCookie('bibu_session', { path: '/' });res.json({ ok: true });
  });
  async function bootstrap(account) {
    if(account.role==='superadmin')return {account:publicAccount(account),locations:locationNames(await read(),true),users:[],acts:[],articles:[],lessons:[],trx:[],rewards:[],community:[],week:week(),pilotStart};
    const state = await read();const scoped = account.role === 'peserta';const uid = account.id;
    const acts = state.acts.filter((a) => (!scoped || a.uid === uid)&&(account.role!=='bi'||a.status!=='cancelled'));
    const users = state.users.filter((u) => !scoped || u.id === uid).map((u) => ({ ...u, points: points(state, u.id), balance: points(state, u.id) - u.spent, prev: 0, wa: [] }));
    for (const u of users) u.prev = completedMissions(state, u.id).filter((m) => m.week !== week()).length;
    if (account.role === 'bi') for (const u of users) {u.name = 'Warga';delete u.email;delete u.profile;u.phone='';u.notes = [];u.vouchers = [];}
    const community = communityStandings(state);
    const articles = (state.articles || []).filter((a) => !scoped || a.uid === uid).map((a) => account.role === 'bi' ? { id: a.id, uid: a.uid, status: a.status, week: a.week } : a);
    return { account: publicAccount(account), locations:locationNames(state,true),reportLocations:locationNames(state),users, acts: acts.map((a) => account.role === 'bi' ? { ...a, photo: '', reviewedBy: undefined } : a), articles, lessons: state.lessons.map(({q,...lesson})=>({...lesson,q:null})), profileRequired:scoped&&!profileComplete(state.users.find(user=>user.id===uid)), feed:publicOverview(state).feed, trx: state.trx.filter((t) => !scoped || t.uid === uid), rewards: state.rewards, community, week: week(),pilotStart, curationEmail: process.env.CURATION_EMAIL || 'ilitterless@gmail.com' };
  }
  app.get('/api/bootstrap', requireRole(), async (req, res) => res.json(await bootstrap(req.account)));
  app.get('/api/communities', requireRole(), async (_req, res) => res.json({ communities: communityStandings(await read()) }));
  mountParticipation(app,{read,transaction,db,requireRole,storage,now});
  mountAccess(app,{db,read,write,rolesFor,requireRole,limitAccess:rateLimit({windowMs:15*60*1000,limit:100,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Terlalu banyak perubahan akses. Coba lagi nanti.'}})});
  mountAdminManagement(app,{db,read,write,transaction,rolesFor,requireRole,sendToken,limitAccess:rateLimit({windowMs:15*60*1000,limit:100,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Terlalu banyak perubahan. Coba lagi nanti.'}})});
  app.use('/api',async(req,res,next)=>{
    if(req.method==='POST'&&req.account?.role==='peserta'&&!profileComplete((await read()).users.find(user=>user.id===req.account.id)))return res.status(403).json({error:'Lengkapi profil dahulu sebelum menggunakan aplikasi.',profileRequired:true});next();
  });
  mountActivityManagement(app,{db,read,transaction,requireRole,storage});
  app.post('/api/preferences', requireRole('peserta'), async (req, res) => {
    if (typeof req.body.big !== 'boolean') fail(400, 'Preferensi tidak valid.');await transaction(req.account.id, 'preferences.update', (state) => {state.users.find((u) => u.id === req.account.id).big = req.body.big;});res.json({ ok: true });
  });
  function notify(state, uid, message) {const user = state.users.find((u) => u.id === uid);user.notes.unshift(message);user.notes = user.notes.slice(0, 100);}
  app.post('/api/residents', requireRole('admin'), async (req, res) => {
    const name = text(req.body.name, 60),loc = text(req.body.loc);if (name.length < 2 || !locationNames(await read(),true).includes(loc)) fail(400, 'Isi nama dan kelurahan aktif warga.');
    const user = { id: randomUUID(), email: '', name, loc, phone: '', reg: week(), bibu: 'BIBU-' + randomBytes(6).toString('hex').toUpperCase(), ls: [], prev: 0, spent: 0, vouchers: [], notes: [], wa: [], shown: null, lastStg: null };
    await transaction(req.account.id, 'resident.create', (state) => {if(!locationNames(state,true).includes(loc))fail(409,'Kelurahan tidak lagi aktif.');state.users.push(user);});res.status(201).json({ user });
  });
  async function savePhoto(value, required, account) {
    if (!value) {if (required) fail(400, 'Tambahkan foto bukti.');return '';}
    if (typeof value !== 'string') fail(400, 'Foto tidak valid.');
    if(value.startsWith('/api/photos/')){const upload=(await read()).uploads?.find(item=>item.completed&&item.uid===account?.id&&'/api/photos/'+item.filename===value);if(!upload)fail(400,'Foto belum diunggah oleh akun ini.');return value;}
    const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) fail(400, 'Gunakan foto JPG, PNG, atau WebP.');
    const data = Buffer.from(match[2], 'base64');if (data.length > 6 * 1024 * 1024 || data.length < 12) fail(400, 'Ukuran foto tidak valid (maksimal 6 MB).');
    const valid = match[1] === 'jpeg' ? data[0] === 255 && data[1] === 216 : match[1] === 'png' ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) fail(400, 'Isi file bukan foto yang didukung.');
    const filename = randomUUID() + '.' + match[1];await storage.put('photos/'+filename,data,'image/'+match[1]);return '/api/photos/' + filename;
  }
  mountArticles(app, { read, transaction, requireRole, savePhoto, mailer, storage, date, week, notify });
  mountMaterials(app, { read, transaction, requireRole, dataDir, storage });
  mountUploads(app,{storage,read,transaction,requireRole});
  app.get('/api/photos/:name', requireRole('peserta', 'admin','superadmin'), async (req, res) => {
    const state = await read(),photo = '/api/photos/' + req.params.name;
    if (!/^[a-f0-9-]+\.(jpeg|png|webp)$/.test(req.params.name) || ![...state.acts, ...(state.articles || [])].some((a) => a.photo === photo && (req.account.roles.includes('admin') || req.account.roles.includes('superadmin') || a.uid === req.account.id))) fail(404, 'Foto tidak ditemukan.');
    await storage.serve(res,'photos/'+req.params.name);
  });
  app.post('/api/actions', requireRole('peserta', 'admin'), async (req, res) => {
    const tile = TILES.find((t) => t.id === req.body.tile),uid = req.account.role === 'admin' ? text(req.body.uid) : req.account.id,clientId = text(req.body.clientId, 80);
    if (!tile || !uid || !clientId) fail(400, 'Pilih warga dan jenis aksi.');
    const initial=await read();if(initial.deletedActionKeys?.includes(activityKey(uid,clientId)))fail(410,'Kegiatan ini telah dihapus pengelola. Buat laporan baru bila diperlukan.');
    const old = initial.acts.find((a) => a.uid === uid && a.clientId === clientId);if (old) return res.json({ action: old });
    const photo = await savePhoto(req.body.photo, req.account.role === 'peserta',req.account);
    try {const action = await transaction(req.account.id, 'action.create', (state) => {
        if (!state.users.some((u) => u.id === uid&&!u.deletedAt)) fail(404, 'Warga tidak ditemukan atau akunnya sudah dihapus.');
        if(state.deletedActionKeys?.includes(activityKey(uid,clientId)))fail(410,'Kegiatan ini telah dihapus pengelola.');
        if(req.body.photo?.startsWith('/api/photos/')&&!state.uploads?.some(upload=>upload.completed&&upload.uid===req.account.id&&'/api/photos/'+upload.filename===req.body.photo))fail(400,'Foto sudah tidak tersedia. Unggah kembali.');
        const duplicate = state.acts.find((a) => a.uid === uid && a.clientId === clientId);if (duplicate) return duplicate;
        const id=state.acts.reduce((max,item)=>Math.max(max,Number(item.id)+1),state.nextActionId||1);state.nextActionId=id+1;
        const action = { id, clientId, uid, tile: tile.id, cat: tile.cat, act: tile.n, week: week(), day: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(date() + 'T00:00:00Z').getUTCDay()], date: date(), photo, status: req.account.role === 'admin' ? 'verified' : 'pending', src: req.account.role === 'admin' ? 'petugas' : 'app', mission: null };
        if (action.status === 'verified') action.awardedPoints = dailyAward(state, action);
        state.acts.push(action);if (action.status === 'verified') notify(state, uid, `Petugas mencatat aksi "${tile.n}". +${action.awardedPoints} poin`);return action;
      });res.status(201).json({ action });} catch (error) {if (photo&&!req.body.photo?.startsWith('/api/photos/')) await storage.remove('photos/'+path.basename(photo));throw error;}
  });
  app.post('/api/actions/:id/review', requireRole('admin'), async (req, res) => {
    const status = req.body.status,reason = text(req.body.reason, 200);if (!['verified', 'rejected'].includes(status) || status === 'rejected' && !reason) fail(400, 'Isi keputusan dan alasan penolakan.');
    await transaction(req.account.id, 'action.review', (state) => {const a = state.acts.find((a) => a.id === Number(req.params.id));if (!a) fail(404, 'Aksi tidak ditemukan.');if (a.status !== 'pending') fail(409, 'Aksi sudah diperiksa.');if (status === 'verified') a.awardedPoints = dailyAward(state, a);a.status = status;a.reason = status === 'rejected' ? reason : '';a.reviewedBy = req.account.id;notify(state, a.uid, status === 'verified' ? `Aksi "${a.act}" disetujui. +${a.awardedPoints} poin` : `Aksi "${a.act}" belum diterima: ${reason}. Silakan foto ulang.`);});res.json({ ok: true });
  });
  app.post('/api/lessons/:id/answer', requireRole('peserta'), async (req, res) => {
    fail(410,'Kuis dipindahkan ke kuis mingguan. Buka modul untuk belajar.');
    const lesson = (await read()).lessons.find((l) => l.id === req.params.id);if (!lesson?.q || !Number.isInteger(req.body.answer)) fail(400, 'Pilih jawaban materi.');
    if (req.body.answer !== lesson.q.a) return res.json({ correct: false, awarded: 0 });
    const awarded = await transaction(req.account.id, 'lesson.answer', (state) => {const user = state.users.find((u) => u.id === req.account.id);if (user.ls.includes(lesson.id)) return 0;user.ls.push(lesson.id);return 20;});res.json({ correct: true, awarded });
  });
  app.post('/api/transactions', requireRole('admin'), async (req, res) => {
    const uid = text(req.body.uid),mat = text(req.body.mat),kg = Number(req.body.kg),clientId = text(req.body.clientId, 80);
    if (!['Plastik', 'Kertas', 'Logam', 'Kaca'].includes(mat) || !Number.isFinite(kg) || kg < .1 || kg > 100 || !clientId) fail(400, 'Pilih material dan berat 0,1–100 kg.');
    await transaction(req.account.id, 'transaction.create', (state) => {if (!state.users.some((u) => u.id === uid&&!u.deletedAt)) fail(404, 'Warga tidak ditemukan atau akunnya sudah dihapus.');if (state.trx.some((t) => t.clientId === clientId)) return;state.trx.push({ id: randomUUID(), uid, mat, kg: Math.round(kg * 10) / 10, week: week(), date: date(), clientId });notify(state, uid, `Setoran ${mat} ${kg} kg tercatat. +30 poin. Emisi dihindari ±${(Math.round(co2e(mat, kg) * 10) / 10).toString().replace('.', ',')} kg CO₂e`);});res.status(201).json({ ok: true });
  });
  app.post('/api/rewards/:id/redeem', requireRole('peserta'), async (req, res) => {
    const clientId = text(req.body.clientId, 80);if (!clientId) fail(400, 'Permintaan tidak valid.');
    const voucher = await transaction(req.account.id, 'reward.redeem', (state) => {
      const user = state.users.find((u) => u.id === req.account.id),old = user.vouchers.find((v) => v.clientId === clientId);if (old) return old;
      const reward = state.rewards.find((r) => r.id === req.params.id);if (!reward || reward.stock < 1) fail(409, 'Hadiah sedang tidak tersedia.');if (points(state, user.id) - user.spent < reward.p) fail(409, 'Poin belum cukup.');
      user.spent += reward.p;reward.stock--;const voucher = { n: reward.n, code: 'BBB-' + randomBytes(8).toString('hex').toUpperCase(), rewardId: reward.id, clientId, redeemed: false, created: new Date().toISOString() };user.vouchers.push(voucher);return voucher;
    });res.status(201).json({ voucher });
  });
  app.post('/api/rewards/:id/stock', requireRole('admin'), async (req, res) => {
    const stock = req.body.stock;if (!Number.isInteger(stock) || stock < 0 || stock > 100000) fail(400, 'Isi stok 0–100000.');await transaction(req.account.id, 'reward.stock', (state) => {const r = state.rewards.find((r) => r.id === req.params.id);if (!r) fail(404, 'Hadiah tidak ditemukan.');r.stock = stock;});res.json({ ok: true });
  });
  app.post('/api/vouchers/fulfill', requireRole('admin'), async (req, res) => {
    const code = text(req.body.code, 40).toUpperCase();await transaction(req.account.id, 'voucher.fulfill', (state) => {const voucher = state.users.flatMap((u) => u.vouchers).find((v) => v.code === code);if (!voucher) fail(404, 'Kupon tidak ditemukan.');if (voucher.redeemed) fail(409, 'Kupon sudah digunakan.');voucher.redeemed = true;voucher.fulfilledBy = req.account.id;voucher.fulfilledAt = new Date().toISOString();});res.json({ ok: true });
  });
  app.get('/api/reports/export', requireRole('admin', 'bi'), async (req, res) => {
    const state = await read();const safe = (v) => '"' + String(v).replaceAll('"', '""') + '"';
    const rows = [['Kelurahan', 'Warga', 'Aksi disetujui', 'Aksi menunggu', 'Setoran kg', 'Emisi dihindari kg CO2e (EPA WARM v16)'], ...locationNames(state).map((loc) => {const ids = new Set(state.users.filter((u) => u.loc === loc).map((u) => u.id)),T = state.trx.filter((t) => ids.has(t.uid));return [loc, ids.size, state.acts.filter((a) => ids.has(a.uid) && a.status === 'verified').length, state.acts.filter((a) => ids.has(a.uid) && a.status === 'pending').length, T.reduce((s, t) => s + t.kg, 0).toFixed(1), T.reduce((s, t) => s + co2e(t.mat, t.kg), 0).toFixed(1)];})];
    res.attachment('cobi-laporan.csv').type('text/csv').send('\uFEFF' + rows.map((r) => r.map(safe).join(',')).join('\r\n'));
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
  app.use(express.static(path.resolve('dist')));
  app.use((error, _req, res, _next) => {const status = error.status || 500;if (status >= 500) console.error('Server error:', error.message);res.status(status).json({ error: status === 500 ? 'Server bermasalah. Coba lagi.' : error.message });});
  return { app, db, read, write };
}
