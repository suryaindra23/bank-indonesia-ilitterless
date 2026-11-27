import { createApp, passwordHash } from '../server/app.js';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
const args = process.argv.slice(2),get = (key) => args[args.indexOf('--' + key) + 1];
const email = get('email')?.trim().toLowerCase(),role = get('role');
if (!email || !['admin', 'bi','superadmin'].includes(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {console.error('Usage: npm run user:create -- --email EMAIL --role admin|bi|superadmin');process.exit(1);}
let muted = false;
const output = new Writable({ async write(chunk, _encoding, callback) {if (!muted) await process.stdout.write(chunk);callback();} });
output.isTTY = process.stdout.isTTY;output.columns = process.stdout.columns;
const reader = createInterface({ input: process.stdin, output, terminal: !!process.stdin.isTTY });
const name = await reader.question('Nama: ');
let password = process.env.ACCOUNT_PASSWORD;
if (!password) {await process.stdout.write('Kata sandi (minimal 10 karakter): ');muted = true;password = await reader.question('');muted = false;await process.stdout.write('\n');}reader.close();
if (name.trim().length < 2 || password.length < 10 || password.length > 128) {console.error('Nama/kata sandi tidak valid.');process.exit(1);}
const { db } = await createApp({ dataDir: process.env.DATA_DIR });
try {await db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(randomUUID(), email, name.trim(), 'Tlogomas', role, await passwordHash(password));console.log('Akun ' + role + ' dibuat: ' + email);} finally {await db.close();}
