import { createApp } from '../server/app.js';
import { randomBytes,randomUUID } from 'node:crypto';
const args = process.argv.slice(2),get = (key) => {const index = args.indexOf('--' + key);return index < 0 ? undefined : args[index + 1];};
const email = get('email')?.trim().toLowerCase(),roles = get('roles')?.split(',').map((role) => role.trim());
if (!email || !roles?.length || roles.some((role) => !['peserta', 'admin', 'bi','superadmin'].includes(role))) {console.error('Usage: npm run role:grant -- --email EMAIL --roles peserta,admin,bi,superadmin');process.exit(1);}
const { db, read, write } = await createApp({ dataDir: process.env.DATA_DIR });
try {
  await db.transaction(async()=>{const account = await db.prepare('SELECT id,email,name,loc,role FROM accounts WHERE email=?').get(email);if (!account) throw Error('Akun belum terdaftar. Daftarkan email dahulu.');
  const before=[...new Set([account.role,...(await db.prepare('SELECT role FROM account_roles WHERE uid=?').all(account.id)).map(row=>row.role),...((await db.prepare('SELECT uid FROM super_admins WHERE uid=?').get(account.id))?['superadmin']:[])])];
  for (const role of roles){if(role==='superadmin')await db.prepare('INSERT OR IGNORE INTO super_admins VALUES(?,?,?)').run(account.id,'cli',new Date().toISOString());else await db.prepare('INSERT OR IGNORE INTO account_roles VALUES(?,?)').run(account.id,role);}
  if (roles.includes('peserta')) {const state = await read();if (!state.users.some((user) => user.id === account.id)) {state.users.push({ id: account.id, email: account.email, name: account.name, loc: account.loc, phone: '', reg: 1, bibu: 'BIBU-' + randomBytes(6).toString('hex').toUpperCase(), ls: [], prev: 0, spent: 0, vouchers: [], notes: [], wa: [], shown: null, lastStg: null });await write(state);}}
  const after=[...new Set([...before,...roles])];if(after.length!==before.length)await db.prepare('INSERT INTO role_changes VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),'cli','Operator terminal',account.id,account.email,JSON.stringify(before),JSON.stringify(after),new Date().toISOString());
  await db.prepare('INSERT INTO audit(uid,action,created) VALUES(?,?,?)').run(account.id, 'roles.grant:' + roles.join(','), new Date().toISOString());});console.log('Akses ' + email + ': ' + roles.join(', '));
} catch (error) {console.error(error.message);process.exitCode = 1;} finally {await db.close();}
