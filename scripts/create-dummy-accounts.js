// Membuat/memperbarui 3 akun dummy permanen (warga, petugas, BI) untuk uji coba.
// Kata sandi dibuat sekali, disimpan di data/akun-dummy.json (data/ diabaikan Git), lalu dipakai lagi setiap skrip dijalankan.
import { createApp, passwordHash } from '../server/app.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const dataDir = process.env.DATA_DIR || 'data';
const file = path.join(dataDir, 'akun-dummy.json');
const ACCOUNTS = [
  { key: 'warga', email: 'dummy+warga@gmail.com', name: 'Dummy Warga', role: 'peserta', url: '/warga/' },
  { key: 'petugas', email: 'dummy+petugas@gmail.com', name: 'Dummy Petugas', role: 'admin', url: '/petugas/' },
  { key: 'bi', email: 'dummy+bi@gmail.com', name: 'Dummy Bank Indonesia', role: 'bi', url: '/bank-indonesia/' },
];
await mkdir(dataDir, { recursive: true });
let saved = {};
try { saved = JSON.parse(await readFile(file, 'utf8')); } catch {}
for (const a of ACCOUNTS) if (!saved[a.key]?.password) saved[a.key] = { email: a.email, password: 'Dmy-' + randomBytes(9).toString('base64url') };
const { db, read, write } = await createApp({ dataDir: process.env.DATA_DIR });
try {
  for (const a of ACCOUNTS) {
    const hash = await passwordHash(saved[a.key].password);
    await db.transaction(async () => {
      let acc = await db.prepare('SELECT id FROM accounts WHERE email=?').get(a.email);
      const id = acc?.id || randomUUID();
      if (acc) await db.prepare('UPDATE accounts SET name=?,role=?,password_hash=? WHERE id=?').run(a.name, a.role, hash, id);
      else await db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id, a.email, a.name, 'Tlogomas', a.role, hash);
      await db.prepare('INSERT OR IGNORE INTO account_roles VALUES(?,?)').run(id, a.role);
      if (a.role === 'peserta') {
        await db.prepare('INSERT OR IGNORE INTO verified_accounts VALUES(?)').run(id);
        const state = await read();
        if (!state.users.some((u) => u.id === id)) { state.users.push({ id, email: a.email, name: a.name, loc: 'Tlogomas', phone: '', reg: 1, bibu: 'BIBU-' + randomBytes(6).toString('hex').toUpperCase(), ls: [], prev: 0, spent: 0, vouchers: [], notes: [], wa: [], shown: null, lastStg: null }); await write(state); }
      }
      await db.prepare('INSERT INTO audit(uid,action,created) VALUES(?,?,?)').run(id, 'dummy.account:' + a.role, new Date().toISOString());
    });
    console.log('Siap: ' + a.email + ' (' + a.role + ')');
  }
  await writeFile(file, JSON.stringify(saved, null, 2) + '\n', { mode: 0o600 });
  const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:5173';
  await writeFile(path.join(dataDir, 'akun-dummy.md'), '# Akun dummy COBI\n\nHanya untuk uji coba. Jangan dipakai di situs publik.\n\n| Peran | Halaman | Email | Kata sandi |\n|---|---|---|---|\n' + ACCOUNTS.map((a) => `| ${a.key} | ${origin}${a.url} | ${a.email} | ${saved[a.key].password} |`).join('\n') + '\n', { mode: 0o600 });
  console.log('Kredensial tersimpan di ' + path.join(dataDir, 'akun-dummy.md'));
  console.log('\n=== SIMPAN KREDENSIAL INI (misalnya di password manager) ===');
  for (const x of ACCOUNTS) console.log(`${x.key.padEnd(8)} ${origin}${x.url}\n         Email      : ${x.email}\n         Kata sandi : ${saved[x.key].password}\n`);
} finally { await db.close(); }
