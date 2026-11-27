import {PGlite} from '@electric-sql/pglite';
import {openDatabase} from '../server/database.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp, passwordHash } from '../server/app.js';
import { points } from '../shared/catalog.js';
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
const secret = 'Password-Untuk-Test-123';
async function fixture(t,options={}) {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'bibu-test-'));
  const pg=process.env.TEST_POSTGRES?new PGlite():null;
  const database=pg?await openDatabase({postgresClient:pg}):undefined;
  const messages = [],mailer = { send: async (message) => messages.push(message) };const core = await createApp({ dataDir, limit: 1000, mailer, database,...options });const server = core.app.listen(0, '127.0.0.1');await new Promise((r) => server.once('listening', r));const base = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => {await new Promise((r) => server.close(r));await core.db.close();if(pg)await pg.close();rmSync(dataDir, { recursive: true, force: true });});
  async function call(url, body, cookie = '', headers = {}) {const res = await fetch(base + '/api' + url, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), Cookie: cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });return { status: res.status, cookie: res.headers.get('set-cookie')?.split(';')[0], body: res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text(), headers: res.headers };}
  async function resident(email = 'warga@example.test',complete=true) {const result = await call('/auth/register', { email, password: secret, name: 'Warga Pengujian', loc: 'Tlogomas' });assert.equal(result.status, 201);assert.equal(result.body.needsVerification, true);assert.equal(result.cookie, undefined);const token = new URL(messages.at(-1).text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');const verified = await call('/auth/verify', { token });assert.equal(verified.status, 200);if(complete)assert.equal((await call('/profile',{name:'Warga Pengujian',originType:'komunitas',originName:'Tlogomas',whatsapp:'081234567890',district:'Lowokwaru',city:'Kota Malang'},verified.cookie)).status,200);return { ...verified, status: 201 };}
  async function staff(role) {const id = randomUUID();await core.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id, role + '@example.test', 'Petugas Test', 'Tlogomas', role, await passwordHash(secret));return call('/auth/login', { email: role + '@example.test', password: secret });}
  return { ...core, call, resident, staff, dataDir, messages, mailer, base };
}
test('email/password registration, duplicate email, session, logout and expiry', async (t) => {
  const f = await fixture(t);const r = await f.resident('WARGA@example.test');assert.match(r.cookie, /bibu_session=/);assert.match(r.headers.get('set-cookie'), /HttpOnly/);assert.equal(r.body.account.email, 'warga@example.test');assert.equal(r.body.account.role, 'peserta');
  assert.equal((await f.call('/auth/register', { email: 'warga@example.test', password: secret, name: 'Ayu', loc: 'Tlogomas' })).status, 409);
  assert.equal((await f.call('/auth/login', { email: 'warga@example.test', password: 'wrong' })).status, 401);
  assert.equal((await f.call('/auth/me', undefined, r.cookie)).body.account.id, r.body.account.id);
  const row = await f.db.prepare('SELECT password_hash FROM accounts').get();assert.notEqual(row.password_hash, secret);assert.ok(!JSON.stringify(r.body).includes('password_hash'));
  await f.call('/auth/logout', {}, r.cookie);assert.equal((await f.call('/bootstrap', undefined, r.cookie)).status, 401);
  const login = await f.call('/auth/login', { email: 'warga@example.test', password: secret });assert.equal(login.status, 200);await f.db.prepare('UPDATE sessions SET expires=0').run();assert.equal((await f.call('/bootstrap', undefined, login.cookie)).status, 401);
});
test('server enforces resident ownership, reviews, photograph access and BI read-only', async (t) => {
  const f = await fixture(t),a = await f.resident(),b = await f.resident('other@example.test'),admin = await f.staff('admin'),bi = await f.staff('bi');
  assert.equal((await f.call('/bootstrap')).status, 401);
  const posted = await f.call('/actions', { tile: 'tas', uid: b.body.account.id, photo, clientId: 'one', status: 'verified', points: 9999 }, a.cookie);assert.equal(posted.status, 201);assert.equal(posted.body.action.uid, a.body.account.id);assert.equal(posted.body.action.status, 'pending');
  const id = posted.body.action.id;assert.equal((await f.call('/actions/' + id + '/review', { status: 'verified' }, a.cookie)).status, 403);
  assert.equal((await f.call(posted.body.action.photo.replace('/api', ''), undefined, b.cookie)).status, 404);
  assert.equal((await f.call('/actions/' + id + '/review', { status: 'verified' }, bi.cookie)).status, 403);
  assert.equal((await f.call('/actions/' + id + '/review', { status: 'verified' }, admin.cookie)).status, 200);
  assert.equal((await f.call('/actions/' + id + '/review', { status: 'verified' }, admin.cookie)).status, 409);
  assert.equal((await f.call('/actions', { tile: 'tas', photo, clientId: 'one' }, a.cookie)).body.action.id, id);
  const own = (await f.call('/bootstrap', undefined, a.cookie)).body;assert.equal(own.users.length, 1);assert.equal(own.users[0].points, 2);assert.equal(own.acts.length, 1);
  assert.equal((await f.call('/preferences', { big: true, uid: b.body.account.id }, a.cookie)).status, 200);assert.equal((await f.call('/bootstrap', undefined, a.cookie)).body.users[0].big, true);
  const other = (await f.call('/bootstrap', undefined, b.cookie)).body;assert.equal(other.acts.length, 0);assert.equal(other.users[0].points, 0);
  const report = (await f.call('/bootstrap', undefined, bi.cookie)).body;assert.equal(report.users.length, 2);assert.ok(report.users.every((u) => !u.email && u.name === 'Warga'));assert.equal(report.acts[0].photo, '');
  assert.equal((await f.call('/reports/export', undefined, bi.cookie)).status, 200);assert.equal((await f.call('/reports/export', undefined, a.cookie)).status, 403);
});
test('points, quiz idempotency, stock, concurrent redemption and one-time fulfillment', async (t) => {
  const f = await fixture(t),r = await f.resident(),admin = await f.staff('admin'),uid = r.body.account.id;
  assert.equal((await f.call('/lessons/l1/answer', { answer: 0 }, r.cookie)).status,410);
  assert.equal((await f.call('/lessons/l1/complete', {}, r.cookie)).body.awarded, 20);
  assert.equal((await f.call('/lessons/l1/complete', {}, r.cookie)).body.awarded, 0);
  assert.equal((await f.call('/rewards/r2/redeem', { clientId: 'low' }, r.cookie)).status, 409);
  for (let i = 0; i < 8; i++) assert.equal((await f.call('/transactions', { uid, mat: 'Kertas', kg: 1.5, clientId: 'trx' + i }, admin.cookie)).status, 201);
  assert.equal((await f.call('/bootstrap', undefined, r.cookie)).body.users[0].balance, 260);
  await f.call('/transactions', { uid, mat: 'Kertas', kg: 1.5, clientId: 'trx0' }, admin.cookie);assert.equal((await f.call('/bootstrap', undefined, r.cookie)).body.users[0].balance, 260);
  assert.equal((await f.call('/rewards/r2/stock', { stock: 2 }, r.cookie)).status, 403);
  await f.call('/rewards/r2/stock', { stock: 1 }, admin.cookie);
  const results = await Promise.all(['buy-a', 'buy-b'].map((clientId) => f.call('/rewards/r2/redeem', { clientId }, r.cookie)));assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
  const voucher = results.find((x) => x.status === 201).body.voucher;assert.equal((await f.call('/rewards/r2/redeem', { clientId: voucher.clientId }, r.cookie)).body.voucher.code, voucher.code);
  assert.equal((await f.call('/bootstrap', undefined, r.cookie)).body.users[0].balance, 10);
  assert.equal((await f.call('/vouchers/fulfill', { code: voucher.code }, admin.cookie)).status, 200);assert.equal((await f.call('/vouchers/fulfill', { code: voucher.code }, admin.cookie)).status, 409);
});
test('validation rejects cross-origin, forged photos and role escalation', async (t) => {
  const f = await fixture(t),r = await f.resident();assert.equal((await f.call('/auth/register', { email: 'bad', password: '1', role: 'admin' })).status, 400);
  assert.equal((await f.call('/actions', { tile: 'tas', photo: 'data:image/svg+xml,<svg/>', clientId: 'bad' }, r.cookie)).status, 400);
  assert.equal((await f.call('/actions', { tile: 'tas', photo, clientId: 'csrf' }, r.cookie, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.call('/auth/register', { email: 'role@example.test', password: secret, name: 'Nama', loc: 'Tlogomas', role: 'admin' })).body.needsVerification, true);assert.equal((await f.db.prepare('SELECT role FROM accounts WHERE email=?').get('role@example.test')).role, 'peserta');
});
test('email verification and password reset expire, cannot be replayed and revoke sessions', async (t) => {
  const f = await fixture(t),r = await f.resident();
  const verifyToken = new URL(f.messages[0].text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');assert.equal((await f.call('/auth/verify', { token: verifyToken })).status, 400);
  await f.call('/auth/forgot', { email: 'warga@example.test' });const resetToken = new URL(f.messages.at(-1).text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');const next = 'Different-Password-123';assert.equal((await f.call('/auth/reset', { token: resetToken, password: next })).status, 200);assert.equal((await f.call('/bootstrap', undefined, r.cookie)).status, 401);assert.equal((await f.call('/auth/reset', { token: resetToken, password: next })).status, 400);assert.equal((await f.call('/auth/login', { email: 'warga@example.test', password: secret })).status, 401);assert.equal((await f.call('/auth/login', { email: 'warga@example.test', password: next })).status, 200);
  const unverified = await f.call('/auth/register', { email: 'notverified@example.test', password: secret, name: 'Nama', loc: 'Tlogomas' });assert.equal(unverified.status, 201);assert.equal((await f.call('/auth/login', { email: 'notverified@example.test', password: secret })).body.verificationRequired, true);const token = new URL(f.messages.at(-1).text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');await f.db.prepare('UPDATE email_tokens SET expires=0').run();assert.equal((await f.call('/auth/verify', { token })).status, 400);
});
test('community API aggregates all members without exposing resident identities', async (t) => {
  const f = await fixture(t),a = await f.resident(),b = await f.resident('member@example.test'),admin = await f.staff('admin');
  assert.equal((await f.call('/communities')).status, 401);
  await f.call('/lessons/l1/complete', {}, a.cookie);
  await f.call('/transactions', { uid: b.body.account.id, mat: 'Kertas', kg: 1, clientId: 'community-deposit' }, admin.cookie);
  const response = await f.call('/communities', undefined, a.cookie);assert.equal(response.status, 200);
  const own = response.body.communities.find((group) => group.l === 'Tlogomas');assert.equal(own.points, 50);assert.equal(own.members, 2);assert.equal(own.rank, 1);
  assert.deepEqual(Object.keys(own).sort(), ['l', 'members', 'points', 'rank', 'v', 'verified']);
  const bootstrap = (await f.call('/bootstrap', undefined, a.cookie)).body;assert.equal(bootstrap.users.length, 1);assert.deepEqual(bootstrap.community, response.body.communities);
  assert.equal((await f.call('/communities', { points: 9999 }, a.cookie)).status, 404);
});
test('pilot missions count distinct days; SQLite persists state after reopening', async (t) => {
  const f = await fixture(t),r = await f.resident(),uid = r.body.account.id;
  const state = await f.read();state.acts = [1, 2, 3].map((id) => ({ id, uid, tile: 'tumbler', status: 'verified', date: '2026-11-23', week: 3 }));assert.equal(points(state, uid), 3);state.acts[1].date = '2026-11-24';state.acts[2].date = '2026-11-25';assert.equal(points(state, uid), 9);await f.write(state);
  const reopened = await createApp({ dataDir: f.dataDir,database:process.env.TEST_POSTGRES?f.db:undefined });assert.equal((await reopened.read()).acts.length, 3);assert.equal((await reopened.db.prepare('SELECT email FROM accounts WHERE id=?').get(uid)).email, 'warga@example.test');if(!process.env.TEST_POSTGRES)await reopened.db.close();
});
test('daily points are 1–10 per type and awarded once per day; old earned points survive migration', async (t) => {
  const f = await fixture(t),r = await f.resident(),admin = await f.staff('admin'),uid = r.body.account.id;
  for (const clientId of ['first', 'second']) {const action = (await f.call('/actions', { tile: 'tumbler', photo, clientId }, r.cookie)).body.action;await f.call('/actions/' + action.id + '/review', { status: 'verified' }, admin.cookie);}
  assert.equal((await f.call('/bootstrap', undefined, r.cookie)).body.users[0].points, 3);
  const legacy = await f.read();legacy.pointRulesVersion = 1;legacy.acts = [1, 2, 3].map((id, index) => ({ id, uid, tile: 'tumbler', status: 'verified', week: 1, date: '2026-11-' + (20 + index) }));legacy.users[0].spent = 200;await f.write(legacy);
  const reopened = await createApp({ dataDir: f.dataDir,database:process.env.TEST_POSTGRES?f.db:undefined });const migrated = await reopened.read();assert.equal(points(migrated, uid), 250);assert.equal(points(migrated, uid) - migrated.users[0].spent, 50);assert.equal(migrated.pointRulesVersion, 2);if(!process.env.TEST_POSTGRES)await reopened.db.close();
});
test('article email includes required fields and photo; only curation grants 50 points once', async (t) => {
  const f = await fixture(t),r = await f.resident(),other = await f.resident('private@example.test'),admin = await f.staff('admin');
  const payload = { body: 'Warga bersama-sama memilah sampah dan membersihkan lingkungan untuk menjaga kebersihan kawasan.', participants: 'Warga dan komunitas lingkungan', occurredOn: '2026-01-10', photo, clientId: 'article-one' };
  assert.equal((await f.call('/articles', { ...payload, participants: '' }, r.cookie)).status, 400);
  const posted = await f.call('/articles', payload, r.cookie);assert.equal(posted.status, 201);const article = posted.body.article;assert.equal(article.emailStatus, 'sent');assert.equal(article.status, 'pending');
  const mail = f.messages.at(-1);assert.equal(mail.to, 'ilitterless@gmail.com');assert.equal(mail.replyTo, r.body.account.email);assert.equal(mail.attachments.length, 1);assert.ok(mail.text.includes(payload.body) && mail.text.includes(payload.participants) && mail.text.includes(payload.occurredOn));
  assert.equal((await f.call('/bootstrap', undefined, r.cookie)).body.users[0].points, 0);
  assert.equal((await f.call(article.photo.replace('/api', ''), undefined, other.cookie)).status, 404);
  assert.equal((await f.call('/articles/' + article.id + '/review', { status: 'verified' }, r.cookie)).status, 403);
  assert.equal((await f.call('/articles/' + article.id + '/review', { status: 'verified' }, admin.cookie)).status, 200);
  assert.equal((await f.call('/articles/' + article.id + '/review', { status: 'verified' }, admin.cookie)).status, 409);
  assert.equal((await f.call('/articles', payload, r.cookie)).body.article.id, article.id);
  assert.equal((await f.call('/bootstrap', undefined, r.cookie)).body.users[0].points, 50);
});
test('failed article email is retained, retryable and cannot receive points before delivery', async (t) => {
  const f = await fixture(t),r = await f.resident(),admin = await f.staff('admin'),send = f.mailer.send;f.mailer.send = async () => {throw Error('SMTP offline');};
  const posted = await f.call('/articles', { body: 'Kegiatan warga mengumpulkan dan memilah sampah plastik secara bersama-sama di lingkungan tempat tinggal.', participants: 'Warga setempat', occurredOn: '2026-01-10', photo, clientId: 'failure' }, r.cookie);const id = posted.body.article.id;assert.equal(posted.body.article.emailStatus, 'failed');
  assert.equal((await f.call('/articles/' + id + '/review', { status: 'verified' }, admin.cookie)).status, 409);
  f.mailer.send = send;assert.equal((await f.call('/articles/' + id + '/send', {}, r.cookie)).body.article.emailStatus, 'sent');
  assert.equal((await f.call('/articles/' + id + '/review', { status: 'rejected', reason: 'Isi belum lengkap' }, admin.cookie)).status, 200);assert.equal((await f.call('/bootstrap', undefined, r.cookie)).body.users[0].points, 0);
});
test('team can publish all four learning formats; files are private and completion is idempotent', async (t) => {
  const f = await fixture(t),r = await f.resident(),admin = await f.staff('admin');
  const text = { title: 'Materi teks pengujian', kind: 'text', body: 'Materi tentang mengurangi sampah dan memilah sampah dari rumah.', clientId: 'manual' };
  assert.equal((await f.call('/materials', text, r.cookie)).status, 403);const material = (await f.call('/materials', text, admin.cookie)).body.material;
  assert.equal((await f.call('/lessons/' + material.id + '/complete', {}, r.cookie)).body.awarded, 20);assert.equal((await f.call('/lessons/' + material.id + '/complete', {}, r.cookie)).body.awarded, 0);assert.equal((await f.call('/lessons/l1/complete', {}, r.cookie)).status, 200);
  const video = await f.call('/materials', { title: 'Video pengujian', kind: 'video', videoUrl: 'https://youtu.be/abcdefghijk', clientId: 'video' }, admin.cookie);assert.equal(video.status, 201);assert.match(video.body.material.videoEmbed, /youtube-nocookie/);
  assert.equal((await f.call('/materials', { title: 'Video berbahaya', kind: 'video', videoUrl: 'javascript:alert(1)', clientId: 'bad-video' }, admin.cookie)).status, 400);
  for (const [name, content, kind] of [['modul.pdf', '%PDF-1.7\nPengujian materi PDF\n%%EOF', 'module'], ['presentasi.pptx', 'PK\x03\x04' + '0'.repeat(30), 'powerpoint'], ['video.mp4', '0000ftypisom' + '0'.repeat(30), 'video']]) {
    const body = new FormData();body.append('file', new Blob([content]), name);const response = await fetch(f.base + '/api/materials/file', { method: 'POST', headers: { Cookie: admin.cookie }, body });assert.equal(response.status, 201);const { file } = await response.json();assert.equal(file.kind, kind);
    assert.equal((await f.call('/material-files/' + file.id, undefined, r.cookie)).status, 404);
    const published = await f.call('/materials', { title: name, kind, fileId: file.id, clientId: name }, admin.cookie);assert.equal(published.status, 201);assert.equal((await f.call('/material-files/' + file.id, undefined, r.cookie)).status, 200);assert.equal((await f.call('/material-files/' + file.id)).status, 401);
  }
});
test('granted roles allow per-page access while ungranted role headers cannot escalate privileges', async (t) => {
  const f = await fixture(t),owner = await f.resident(),other = await f.resident('single@example.test');
  for (const role of ['peserta', 'admin', 'bi']) await f.db.prepare('INSERT INTO account_roles VALUES(?,?)').run(owner.body.account.id, role);
  const own = (await f.call('/bootstrap', undefined, owner.cookie, { 'X-Bibu-Role': 'peserta' })).body;assert.equal(own.account.role, 'peserta');assert.deepEqual(own.account.roles, ['peserta', 'admin', 'bi']);assert.equal(own.users.length, 1);
  const staff = (await f.call('/bootstrap', undefined, owner.cookie, { 'X-Bibu-Role': 'admin' })).body;assert.equal(staff.account.role, 'admin');assert.equal(staff.users.length, 2);
  const bi = (await f.call('/bootstrap', undefined, owner.cookie, { 'X-Bibu-Role': 'bi' })).body;assert.equal(bi.account.role, 'bi');assert.ok(bi.users.every((user) => user.name === 'Warga' && !user.email));
  assert.equal((await f.call('/reports/export', undefined, owner.cookie)).status, 200);
  assert.equal((await f.call('/rewards/r1/stock', { stock: 5 }, other.cookie, { 'X-Bibu-Role': 'admin' })).status, 403);assert.equal((await f.call('/bootstrap', undefined, other.cookie, { 'X-Bibu-Role': 'admin' })).body.account.role, 'peserta');
});

test('direct Storage uploads enforce owner, role, signature, size and private download',async t=>{
 const objects=new Map();let lastKey;
 const objectStore={remote:true,async signUpload(key){lastKey=key;return 'https://storage.example.test/'+key;},async put(key,bytes){objects.set(key,bytes);},async inspect(key){const bytes=objects.get(key);if(!bytes)throw Error('Missing upload');return {size:bytes.length,header:bytes.subarray(0,16)};},async remove(key){objects.delete(key);},async serve(res,key){res.type('application/octet-stream').send(objects.get(key));}};
 const f=await fixture(t,{objectStore}),one=await f.resident('upload-one@example.test'),two=await f.resident('upload-two@example.test'),staff=await f.staff('admin');
 assert.equal((await f.call('/uploads/sign',{purpose:'photo',name:'photo.png',size:68})).status,401);
 assert.equal((await f.call('/uploads/sign',{purpose:'material',name:'book.pdf',size:30},one.cookie)).status,403);
 assert.equal((await f.call('/uploads/sign',{purpose:'material',name:'book.pdf',size:51*1024*1024},staff.cookie)).status,400);
 const bytes=Buffer.from(photo.split(',')[1],'base64');
 const signed=await f.call('/uploads/sign',{purpose:'photo',name:'photo.png',size:bytes.length},one.cookie);assert.equal(signed.body.direct,true);await objectStore.put(lastKey,bytes);
 assert.equal((await f.call('/uploads/'+signed.body.id+'/complete',{},two.cookie)).status,404);
 const complete=await f.call('/uploads/'+signed.body.id+'/complete',{},one.cookie);assert.equal(complete.status,200);
 assert.equal((await f.call('/actions',{tile:'tas',photo:complete.body.photo,clientId:randomUUID()},two.cookie)).status,400);
 const action=await f.call('/actions',{tile:'tas',photo:complete.body.photo,clientId:randomUUID()},one.cookie);assert.equal(action.status,201);
 assert.equal((await f.call(complete.body.photo.slice(4),undefined,two.cookie)).status,404);
 assert.equal((await fetch(f.base+complete.body.photo,{headers:{Cookie:one.cookie}})).status,200);
 const invalid=await f.call('/uploads/sign',{purpose:'material',name:'fake.pdf',size:30},staff.cookie);await objectStore.put(lastKey,Buffer.alloc(30));assert.equal((await f.call('/uploads/'+invalid.body.id+'/complete',{},staff.cookie)).status,400);
 const pdf=Buffer.from('%PDF-1.4\nA legitimate small test module');
 const material=await f.call('/uploads/sign',{purpose:'material',name:'module.pdf',size:pdf.length},staff.cookie);await objectStore.put(lastKey,pdf);
 const finalized=await f.call('/uploads/'+material.body.id+'/complete',{},staff.cookie);assert.equal(finalized.status,200);
 assert.equal((await f.call('/material-files/'+finalized.body.file.id,undefined,one.cookie)).status,404);
 assert.equal((await f.call('/materials',{kind:'module',title:'Modul Storage',body:'Materi belajar dari Storage privat.',fileId:finalized.body.file.id,clientId:randomUUID()},staff.cookie)).status,201);
 assert.equal((await f.call('/material-files/'+finalized.body.file.id,undefined,one.cookie)).status,200);
});

test('profile is mandatory after verification; validates origin and protects new contact details',async t=>{
 const f=await fixture(t),resident=await f.resident('onboarding@example.test',false),bi=await f.staff('bi');
 assert.equal((await f.call('/bootstrap',undefined,resident.cookie)).body.profileRequired,true);
 assert.equal((await f.call('/actions',{tile:'tas',photo,clientId:'before-profile'},resident.cookie)).status,403);
 assert.equal((await f.call('/quiz/answer',{id:'q1',selected:1,week:'2026-11-22'},resident.cookie)).status,403);
 assert.equal((await f.call('/profile',{name:'Nama Baru',originType:'komunitas',originName:'Hijau',whatsapp:'abc',district:'Lowokwaru',city:'Malang'},resident.cookie)).status,400);
 assert.equal((await f.call('/profile',{name:'Nama Baru',originType:'instansi',originName:'SMA Pengujian',whatsapp:'+6281234567890',district:'Lowokwaru',city:'Kota Malang'},resident.cookie)).status,200);
 const data=(await f.call('/bootstrap',undefined,resident.cookie)).body;assert.equal(data.profileRequired,false);assert.equal(data.account.name,'Nama Baru');assert.equal(data.users[0].profile.originType,'instansi');
 const report=(await f.call('/bootstrap',undefined,bi.cookie)).body;assert.equal(report.users[0].profile,undefined);assert.equal(report.users[0].phone,'');
});
test('weekly quiz persists ten single answers, hides keys, locks editing and resets Sunday in Jakarta',async t=>{
 let clock=new Date('2026-11-28T16:59:59Z');const f=await fixture(t,{now:()=>clock}),resident=await f.resident(),admin=await f.staff('admin');
 const initial=(await f.call('/quiz',undefined,resident.cookie)).body;assert.equal(initial.key,'2026-11-22');assert.equal(initial.questions.length,10);assert.ok(initial.questions.every(q=>q.answer===undefined&&q.explanation===undefined));
 const edit=(await f.call('/admin/quiz',undefined,admin.cookie)).body;
 assert.equal((await f.call('/admin/quiz',{week:edit.week,questions:edit.questions.slice(0,9)},admin.cookie)).status,400);
 assert.equal((await f.call('/admin/quiz',{week:edit.week,questions:edit.questions},resident.cookie)).status,403);
 assert.equal((await f.call('/admin/quiz',{week:edit.week,questions:edit.questions},admin.cookie)).status,200);
 const first=edit.questions[0];const submitted=await Promise.all([1,2].map(()=>f.call('/quiz/answer',{week:initial.key,id:first.id,selected:first.answer},resident.cookie)));assert.deepEqual(submitted.map(result=>result.status).sort(),[200,409]);
 assert.equal((await f.call('/admin/quiz',{week:edit.week,questions:edit.questions},admin.cookie)).status,409);
 for(const question of edit.questions.slice(1))assert.equal((await f.call('/quiz/answer',{week:initial.key,id:question.id,selected:question.answer},resident.cookie)).status,200);
 const finished=(await f.call('/quiz',undefined,resident.cookie)).body;assert.equal(finished.completed,true);assert.equal(finished.score,10);assert.equal((await f.call('/bootstrap',undefined,resident.cookie)).body.users[0].points,10);
 assert.equal((await f.call('/quiz/answer',{week:initial.key,id:first.id,selected:0},resident.cookie)).status,409);
 assert.equal((await f.call('/admin/quiz',{week:edit.next,questions:edit.questions},admin.cookie)).status,200);
 clock=new Date('2026-11-28T17:00:00Z');const next=(await f.call('/quiz',undefined,resident.cookie)).body;assert.equal(next.key,'2026-11-29');assert.equal(next.answered,0);assert.equal(next.completed,false);assert.equal(next.questions.length,10);
 assert.equal((await f.call('/quiz/answer',{week:initial.key,id:first.id,selected:0},resident.cookie)).status,409);
 assert.equal((await f.call('/quiz/answer',{week:next.key,id:first.id,selected:first.answer},resident.cookie)).status,200);
 assert.equal((await f.call('/bootstrap',undefined,resident.cookie)).body.users[0].points,11);
});
test('public landing statistics and feed use verified data without personal identities or pending actions',async t=>{
 const f=await fixture(t),resident=await f.resident(),admin=await f.staff('admin');
 const action=(await f.call('/actions',{tile:'tas',photo,clientId:'feed-action'},resident.cookie)).body.action;
 assert.equal((await fetch(f.base+'/api/public/activity-photos/'+action.id)).status,404);
 const before=(await f.call('/public/overview')).body;assert.equal(before.stats.communities,1);assert.equal(before.stats.communityMembers,1);assert.equal(before.stats.communityActivities,0);assert.equal(before.feed.length,0);
 await f.call('/actions/'+action.id+'/review',{status:'verified'},admin.cookie);await f.call('/transactions',{uid:resident.body.account.id,mat:'Plastik',kg:2.5,clientId:'landing-deposit'},admin.cookie);
 const after=(await f.call('/public/overview')).body;assert.equal(after.stats.wasteKg,2.5);assert.equal(after.stats.communityActivities,1);assert.equal(after.feed[0].title,'Pakai tas kain');assert.equal(after.feed[0].community,'Tlogomas');assert.equal(after.feed[0].photo,'/api/public/activity-photos/'+action.id);const image=await fetch(f.base+after.feed[0].photo);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image/);assert.equal((await fetch(f.base+action.photo)).status,401);
 const json=JSON.stringify(after);for(const privateValue of ['warga@example.test','081234567890','/api/photos/','password_hash','Warga Pengujian'])assert.ok(!json.includes(privateValue));
});

test('only Super Admin context can grant roles; changes are immediate and audited without password exposure',async t=>{
 const f=await fixture(t),resident=await f.resident('access-target@example.test'),admin=await f.staff('admin'),bi=await f.staff('bi'),root=await f.staff('superadmin');
 for(const cookie of [resident.cookie,admin.cookie,bi.cookie])assert.equal((await f.call('/super-admin/users',undefined,cookie,{'X-Bibu-Role':'superadmin'})).status,403);
 assert.equal((await f.call('/super-admin/users')).status,401);
 const target=resident.body.account.id,rootId=root.body.account.id,passwordBefore=(await f.db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(target)).password_hash;
 const list=await f.call('/super-admin/users?q=access-target',undefined,root.cookie);assert.equal(list.status,200);assert.equal(list.body.users.length,1);assert.ok(!JSON.stringify(list.body).includes('password_hash'));assert.ok(!JSON.stringify(list.body).includes('token_hash'));
 const rootView=(await f.call('/bootstrap',undefined,root.cookie)).body;assert.deepEqual(rootView.users,[]);assert.deepEqual(rootView.acts,[]);
 for(const roles of [[],['root'],['admin','admin']])assert.equal((await f.call('/super-admin/users/'+target+'/roles',{roles},root.cookie)).status,400);
 const grant=await f.call('/super-admin/users/'+target+'/roles',{roles:['peserta','admin','bi','superadmin']},root.cookie);assert.equal(grant.status,200);
 assert.equal((await f.call('/bootstrap',undefined,resident.cookie,{'X-Bibu-Role':'admin'})).body.account.role,'admin');
 assert.equal((await f.call('/super-admin/users',undefined,resident.cookie)).status,403);
 const headers={'X-Bibu-Role':'superadmin'};assert.equal((await f.call('/super-admin/users',undefined,resident.cookie,headers)).status,200);
 const revoke=await f.call('/super-admin/users/'+rootId+'/roles',{roles:['bi']},resident.cookie,headers);assert.equal(revoke.status,200);
 assert.equal((await f.call('/super-admin/users',undefined,root.cookie,{'X-Bibu-Role':'superadmin'})).status,403);
 const history=(await f.call('/super-admin/history',undefined,resident.cookie,headers)).body;assert.equal(history.total,2);assert.ok(history.history.some(event=>event.target_id===target&&event.before.includes('peserta')&&event.after.includes('superadmin')));
 assert.equal((await f.db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(target)).password_hash,passwordBefore);
 assert.equal((await f.call('/super-admin/users/'+target+'/roles',{roles:['peserta']},resident.cookie,headers)).status,409);
 const unverified=await f.call('/auth/register',{name:'Belum Verifikasi',email:'unverified-role@example.test',password:secret,loc:'Tlogomas'});assert.equal(unverified.status,201);const pending=await f.db.prepare('SELECT id FROM accounts WHERE email=?').get('unverified-role@example.test');assert.equal((await f.call('/super-admin/users/'+pending.id+'/roles',{roles:['admin']},resident.cookie,headers)).status,409);
});
test('concurrent self-demotion never removes the last Super Admin',async t=>{
 const f=await fixture(t),root=await f.staff('superadmin'),second=await f.resident('second-root@example.test');
 await f.call('/super-admin/users/'+second.body.account.id+'/roles',{roles:['peserta','superadmin']},root.cookie);
 const responses=await Promise.all([f.call('/super-admin/users/'+root.body.account.id+'/roles',{roles:['bi']},root.cookie),f.call('/super-admin/users/'+second.body.account.id+'/roles',{roles:['peserta']},second.cookie,{'X-Bibu-Role':'superadmin'})]);
 assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
 const count=Number((await f.db.prepare("SELECT COUNT(*) AS count FROM accounts a WHERE a.role='superadmin' OR EXISTS (SELECT 1 FROM super_admins s WHERE s.uid=a.id)").get()).count);assert.equal(count,1);
});

test('staff hides or cancels activities with audit; hiding preserves points while cancellation corrects totals once',async t=>{
 const f=await fixture(t),resident=await f.resident(),admin=await f.staff('admin'),bi=await f.staff('bi'),root=await f.staff('superadmin');
 const action=(await f.call('/actions',{tile:'tas',photo,clientId:'moderation'},resident.cookie)).body.action;
 await f.call('/actions/'+action.id+'/review',{status:'verified'},admin.cookie);
 for(const cookie of [resident.cookie,bi.cookie]){assert.equal((await f.call('/activity-management',undefined,cookie)).status,403);assert.equal((await f.call('/actions/'+action.id+'/cancel',{reason:'Alasan pengujian'},cookie)).status,403);}
 assert.equal((await f.call('/actions/'+action.id+'/visibility',{visible:false,reason:'a'},admin.cookie)).status,400);
 const hidden=await f.call('/actions/'+action.id+'/visibility',{visible:false,reason:'Foto perlu ditinjau'},admin.cookie);assert.equal(hidden.status,200);assert.equal(hidden.body.pointsDelta,0);
 const overview=(await f.call('/public/overview')).body;assert.equal(overview.feed.length,0);assert.equal(overview.stats.communityActivities,1);assert.equal((await f.call('/bootstrap',undefined,resident.cookie)).body.users[0].points,2);assert.equal((await fetch(f.base+'/api/public/activity-photos/'+action.id)).status,404);
 assert.equal((await fetch(f.base+action.photo,{headers:{Cookie:root.cookie}})).status,200);
 assert.equal((await f.call('/actions/'+action.id+'/visibility',{visible:true,reason:'Foto sudah sesuai'},admin.cookie)).status,200);assert.equal((await fetch(f.base+'/api/public/activity-photos/'+action.id)).status,200);
 const cancelled=await f.call('/actions/'+action.id+'/cancel',{reason:'Kegiatan ternyata duplikat'},admin.cookie);assert.equal(cancelled.status,200);assert.equal(cancelled.body.pointsDelta,-2);
 assert.equal((await f.call('/bootstrap',undefined,resident.cookie)).body.users[0].points,0);assert.equal((await f.call('/public/overview')).body.stats.communityActivities,0);assert.equal((await fetch(f.base+'/api/public/activity-photos/'+action.id)).status,404);
 assert.equal((await f.call('/bootstrap',undefined,bi.cookie)).body.acts.length,0);
 const repeat=await f.call('/actions/'+action.id+'/cancel',{reason:'Ulang permintaan sama'},admin.cookie);assert.equal(repeat.body.changed,false);assert.equal(repeat.body.pointsDelta,0);
 assert.equal((await f.call('/actions/'+action.id+'/visibility',{visible:true,reason:'Tidak boleh dipulihkan'},admin.cookie)).status,409);
 assert.equal((await f.call('/actions/'+action.id+'/review',{status:'verified'},admin.cookie)).status,409);
 const history=(await f.call('/activity-management/history',undefined,root.cookie)).body;assert.equal(history.total,3);assert.ok(history.events.some(event=>event.operation==='cancel'&&event.details.pointsDelta===-2));assert.ok(!JSON.stringify(history).includes('cleanup_key'));
});
test('permanent deletion is Super Admin only, removes unshared photo, leaves history, blocks retry and never reuses IDs',async t=>{
 const f=await fixture(t),resident=await f.resident(),admin=await f.staff('admin'),root=await f.staff('superadmin');
 const action=(await f.call('/actions',{tile:'pilah',photo,clientId:'permanent'},resident.cookie)).body.action;
 assert.equal((await f.call('/actions/'+action.id+'/delete',{reason:'Salah unggah kegiatan',confirmation:'HAPUS'},admin.cookie)).status,403);
 assert.equal((await f.call('/actions/'+action.id+'/delete',{reason:'Salah unggah kegiatan',confirmation:'YA'},root.cookie)).status,400);
 const deleted=await f.call('/actions/'+action.id+'/delete',{reason:'Salah unggah kegiatan',confirmation:'HAPUS'},root.cookie);assert.equal(deleted.status,200);assert.equal(deleted.body.cleanupStatus,'done');assert.equal((await f.read()).acts.length,0);assert.equal(existsSync(path.join(f.dataDir,'photos',path.basename(action.photo))),false);
 assert.equal((await fetch(f.base+action.photo,{headers:{Cookie:resident.cookie}})).status,404);
 assert.equal((await f.call('/actions',{tile:'pilah',photo,clientId:'permanent'},resident.cookie)).status,410);
 const next=(await f.call('/actions',{tile:'tas',photo,clientId:'new-after-delete'},resident.cookie)).body.action;assert.ok(next.id>action.id);
 assert.equal((await fetch(f.base+'/api/public/activity-photos/'+action.id)).status,404);
 const history=(await f.call('/activity-management/history',undefined,root.cookie)).body;assert.equal(history.total,1);assert.equal(history.events[0].operation,'delete');assert.equal(history.events[0].reason,'Salah unggah kegiatan');assert.equal(history.events[0].details.residentId,resident.body.account.id);
});
test('delete retains a photo still referenced by an article and records a spent-point deficit without deleting vouchers',async t=>{
 const f=await fixture(t),resident=await f.resident(),admin=await f.staff('admin'),root=await f.staff('superadmin'),uid=resident.body.account.id;
 const action=(await f.call('/actions',{tile:'jalan',photo,clientId:'spent-award'},resident.cookie)).body.action;await f.call('/actions/'+action.id+'/review',{status:'verified'},admin.cookie);
 const state=await f.read();state.frozenMissionPoints[uid]=240;state.rewards.find(reward=>reward.id==='r2').stock=1;state.articles.push({id:'shared-photo-article',uid,photo:action.photo,status:'pending',week:1});await f.write(state);
 assert.equal((await f.call('/rewards/r2/redeem',{clientId:'spent-before-delete'},resident.cookie)).status,201);
 const deleted=await f.call('/actions/'+action.id+'/delete',{reason:'Kegiatan tidak sah ditemukan',confirmation:'HAPUS'},root.cookie);assert.equal(deleted.body.pointsDelta,-10);assert.equal(deleted.body.balanceAfter,-10);assert.equal(deleted.body.cleanupStatus,'shared');assert.equal(existsSync(path.join(f.dataDir,'photos',path.basename(action.photo))),true);
 const after=(await f.call('/bootstrap',undefined,resident.cookie)).body.users[0];assert.equal(after.vouchers.length,1);assert.equal(after.balance,-10);
});
test('a storage cleanup failure is visible and retryable after the activity has been removed',async t=>{
 const files=new Map();let failCleanup=true;const objectStore={remote:false,async put(key,bytes){files.set(key,bytes);},async remove(key){if(failCleanup)throw Error('Storage unavailable');files.delete(key);},async serve(res,key){res.type('image/png').send(files.get(key));}};
 const f=await fixture(t,{objectStore}),resident=await f.resident(),root=await f.staff('superadmin'),admin=await f.staff('admin');
 const action=(await f.call('/actions',{tile:'tas',photo,clientId:'cleanup-retry'},resident.cookie)).body.action;
 const deleted=await f.call('/actions/'+action.id+'/delete',{reason:'Hapus percobaan unggah',confirmation:'HAPUS'},root.cookie);assert.equal(deleted.status,200);assert.equal(deleted.body.cleanupStatus,'pending');assert.equal((await f.read()).acts.length,0);
 assert.equal((await f.call('/activity-management/cleanup/'+deleted.body.eventId,{},admin.cookie)).status,403);failCleanup=false;assert.equal((await f.call('/activity-management/cleanup/'+deleted.body.eventId,{},root.cookie)).body.cleanupStatus,'done');assert.equal(files.size,0);
});

test('Super Admin imports locations atomically, skips duplicates, and inactive locations reject new enrollment',async t=>{
 const f=await fixture(t),root=await f.staff('superadmin'),admin=await f.staff('admin'),resident=await f.resident();
 assert.equal((await f.call('/super-admin/locations/import',{text:'Sukun'},resident.cookie)).status,403);
 assert.equal((await f.call('/super-admin/locations/import',{text:'Sukun'},admin.cookie)).status,403);
 const imported=await f.call('/super-admin/locations/import',{text:'\uFEFFKelurahan\n"Sukun"\nsukun\nTlogomas\nBandungrejosari'},root.cookie);assert.equal(imported.status,200);assert.deepEqual(imported.body.added,['Sukun','Bandungrejosari']);assert.equal(imported.body.skipped.length,2);
 assert.equal((await f.call('/super-admin/locations/import',{text:'Valid Baru\nKelurahan,Kecamatan'},root.cookie)).status,400);assert.ok(!(await f.read()).locations.some(row=>row.name==='Valid Baru'));
 assert.equal((await f.call('/auth/register',{email:'newloc@example.test',password:secret,name:'Warga Baru',loc:'Sukun'})).status,201);
 assert.equal((await f.call('/super-admin/locations/status',{name:'Sukun',active:false},root.cookie)).status,200);
 assert.ok(!(await f.call('/locations')).body.locations.some(row=>row.name==='Sukun'));
 assert.equal((await f.call('/auth/register',{email:'disabled@example.test',password:secret,name:'Warga Baru',loc:'Sukun'})).status,400);
 assert.equal((await f.call('/residents',{name:'Warga Baru',loc:'Sukun'},admin.cookie)).status,400);
 assert.ok((await f.call('/bootstrap',undefined,admin.cookie)).body.reportLocations.includes('Sukun'));
 for(const row of imported.body.locations.filter(row=>row.name!=='Tlogomas'&&row.name!=='Sukun'))await f.call('/super-admin/locations/status',{name:row.name,active:false},root.cookie);
 assert.equal((await f.call('/super-admin/locations/status',{name:'Tlogomas',active:false},root.cookie)).status,409);
 const history=(await f.call('/super-admin/admin-history',undefined,root.cookie)).body;assert.ok(history.events.some(event=>event.operation==='locations.import'));assert.equal((await f.call('/super-admin/admin-history',undefined,admin.cookie)).status,403);
});
test('Super Admin sends a one-use password reset without exposing password or token in audit',async t=>{
 const f=await fixture(t),root=await f.staff('superadmin'),resident=await f.resident(),uid=resident.body.account.id,admin=await f.staff('admin');
 assert.equal((await f.call('/super-admin/users/'+uid+'/reset-password',{},admin.cookie)).status,403);
 const reset=await f.call('/super-admin/users/'+uid+'/reset-password',{},root.cookie);assert.equal(reset.status,200);assert.ok(!JSON.stringify(reset.body).includes('token='));
 const mail=f.messages.at(-1),token=new URL(mail.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');assert.equal(mail.to,'warga@example.test');
 const count=f.messages.length;await f.call('/super-admin/users/'+uid+'/reset-password',{},root.cookie);assert.equal(f.messages.length,count);
 assert.equal((await f.call('/auth/reset',{token,password:'Changed-Password-123!'})).status,200);assert.equal((await f.call('/bootstrap',undefined,resident.cookie)).status,401);
 assert.equal((await f.call('/auth/reset',{token,password:'Changed-Password-123!'})).status,400);
 assert.equal((await f.call('/auth/login',{email:'warga@example.test',password:secret})).status,401);assert.equal((await f.call('/auth/login',{email:'warga@example.test',password:'Changed-Password-123!'})).status,200);
 const history=await f.call('/super-admin/admin-history',undefined,root.cookie);assert.ok(!JSON.stringify(history.body).includes(token));
});
test('deleting an account revokes access, anonymizes profile and preserves activity history',async t=>{
 const f=await fixture(t),root=await f.staff('superadmin'),resident=await f.resident(),uid=resident.body.account.id,admin=await f.staff('admin');
 const action=(await f.call('/actions',{tile:'tas',photo,clientId:'retained-history'},resident.cookie)).body.action;
 assert.equal((await f.call('/super-admin/users/'+uid+'/delete',{reason:'Permintaan pengguna',confirmation:'HAPUS'},admin.cookie)).status,403);
 assert.equal((await f.call('/super-admin/users/'+root.body.account.id+'/delete',{reason:'Percobaan sendiri',confirmation:'HAPUS'},root.cookie)).status,409);
 assert.equal((await f.call('/super-admin/users/'+uid+'/delete',{reason:'Permintaan pengguna',confirmation:'YA'},root.cookie)).status,400);
 assert.equal((await f.call('/super-admin/users/'+uid+'/delete',{reason:'Permintaan pengguna',confirmation:'HAPUS'},root.cookie)).status,200);
 assert.equal((await f.call('/bootstrap',undefined,resident.cookie)).status,401);assert.equal((await f.call('/auth/login',{email:'warga@example.test',password:secret})).status,401);
 assert.equal(await f.db.prepare('SELECT id FROM accounts WHERE id=?').get(uid),undefined);const state=await f.read(),user=state.users.find(u=>u.id===uid);assert.ok(user.deletedAt);assert.equal(user.email,undefined);assert.equal(user.profile,undefined);assert.equal(user.phone,'');assert.equal(state.acts[0].id,action.id);
 assert.equal((await f.call('/transactions',{uid,mat:'Kertas',kg:1,clientId:'deleted-user'},admin.cookie)).status,404);
 assert.equal((await f.call('/super-admin/users/'+uid+'/delete',{reason:'Ulang permintaan',confirmation:'HAPUS'},root.cookie)).status,404);
 assert.ok((await f.call('/super-admin/admin-history',undefined,root.cookie)).body.events.some(event=>event.operation==='user.delete'&&event.details.reason==='Permintaan pengguna'));
});
test('material archive/restore and permanent delete preserve earned points and block stale completion',async t=>{
 const f=await fixture(t),admin=await f.staff('admin'),root=await f.staff('superadmin'),resident=await f.resident(),body={title:'Materi daur ulang',kind:'text',body:'Pelajari cara memilah sampah agar dapat didaur ulang.',clientId:'manage-text'};
 const lesson=(await f.call('/materials',body,admin.cookie)).body.material;
 assert.equal((await f.call('/lessons/'+lesson.id+'/complete',{},resident.cookie)).body.awarded,20);
 assert.equal((await f.call('/materials/'+lesson.id+'/archive',{reason:'Materi ditinjau ulang'},resident.cookie)).status,403);
 assert.equal((await f.call('/materials/'+lesson.id+'/archive',{reason:'Materi ditinjau ulang'},admin.cookie)).status,200);
 assert.ok(!(await f.call('/bootstrap',undefined,resident.cookie)).body.lessons.some(item=>item.id===lesson.id));assert.equal((await f.call('/bootstrap',undefined,resident.cookie)).body.users[0].points,20);
 assert.equal((await f.call('/lessons/'+lesson.id+'/complete',{},resident.cookie)).status,404);
 assert.equal((await f.call('/materials/'+lesson.id+'/restore',{reason:'Isi telah disetujui'},admin.cookie)).status,200);
 assert.equal((await f.call('/lessons/'+lesson.id+'/complete',{},resident.cookie)).body.awarded,0);
 assert.equal((await f.call('/materials/'+lesson.id+'/delete',{reason:'Materi tidak digunakan',confirmation:'HAPUS'},admin.cookie)).status,403);
 assert.equal((await f.call('/materials/'+lesson.id+'/delete',{reason:'Materi tidak digunakan',confirmation:'YA'},root.cookie)).status,400);
 assert.equal((await f.call('/materials/'+lesson.id+'/delete',{reason:'Materi tidak digunakan',confirmation:'HAPUS'},root.cookie)).status,200);
 assert.equal((await f.call('/bootstrap',undefined,resident.cookie)).body.users[0].points,20);assert.equal((await f.call('/materials',body,admin.cookie)).status,410);
 const history=(await f.call('/material-management?history=true',undefined,root.cookie)).body;assert.deepEqual(history.rows.map(row=>row.operation),['delete','restore','archive']);assert.equal(history.rows[0].actor,'superadmin@example.test');
});
test('archived material file access is denied to citizens; shared files are removed only after last lesson is deleted',async t=>{
 const f=await fixture(t),admin=await f.staff('admin'),root=await f.staff('superadmin'),resident=await f.resident();
 const form=new FormData();form.append('file',new Blob(['%PDF-1.7\nTransport test'],{type:'application/pdf'}),'modul.pdf');const uploaded=await fetch(f.base+'/api/materials/file',{method:'POST',headers:{Cookie:admin.cookie},body:form}),file=(await uploaded.json()).file;
 const body={title:'Materi berbagi berkas',kind:'module',fileId:file.id};const first=(await f.call('/materials',{...body,clientId:'shared-one'},admin.cookie)).body.material,second=(await f.call('/materials',{...body,clientId:'shared-two'},admin.cookie)).body.material;
 for(const lesson of [first,second])await f.call('/materials/'+lesson.id+'/archive',{reason:'Peninjauan berkas'},admin.cookie);
 assert.equal((await fetch(f.base+'/api/material-files/'+file.id,{headers:{Cookie:resident.cookie}})).status,404);assert.equal((await fetch(f.base+'/api/material-files/'+file.id,{headers:{Cookie:admin.cookie}})).status,200);
 await f.call('/materials/'+first.id+'/delete',{reason:'Bersihkan materi pertama',confirmation:'HAPUS'},root.cookie);assert.ok((await f.read()).materialFiles.some(item=>item.id===file.id));
 const removed=await f.call('/materials/'+second.id+'/delete',{reason:'Bersihkan materi terakhir',confirmation:'HAPUS'},root.cookie);assert.equal(removed.body.cleanupStatus,'done');assert.ok(!(await f.read()).materialFiles.some(item=>item.id===file.id));assert.equal((await fetch(f.base+'/api/material-files/'+file.id,{headers:{Cookie:admin.cookie}})).status,404);
});
test('failed material cleanup is audited and retryable only by Super Admin',async t=>{
 let broken=true;const objectStore={remote:false,async remove(){if(broken)throw Error('Storage unavailable');}};const f=await fixture(t,{objectStore}),root=await f.staff('superadmin'),admin=await f.staff('admin');
 const state=await f.read(),id='material-cleanup-test',fileId=randomUUID();state.materialFiles??=[];state.materialFiles.push({id:fileId,filename:randomUUID()+'.pdf',kind:'module',mime:'application/pdf'});state.lessons.push({id,t:'Berkas uji pembersihan',fileId,body:[],kind:'module'});await f.write(state);
 const deleted=await f.call('/materials/'+id+'/delete',{reason:'Hapus berkas pengujian',confirmation:'HAPUS'},root.cookie);assert.equal(deleted.body.cleanupStatus,'pending');assert.ok(!(await f.read()).lessons.some(item=>item.id===id));
 assert.equal((await f.call('/material-management/cleanup/'+deleted.body.id,{},admin.cookie)).status,403);broken=false;assert.equal((await f.call('/material-management/cleanup/'+deleted.body.id,{},root.cookie)).body.cleanupStatus,'done');
 const history=(await f.call('/material-management?history=true',undefined,root.cookie)).body;assert.equal(history.rows[0].cleanupStatus,'done');assert.ok(!JSON.stringify(history).includes('materials/'));
});
