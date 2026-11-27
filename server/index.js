import { createApp } from './app.js';
const { app, db } = await createApp({ dataDir: process.env.DATA_DIR,limit:process.env.NODE_ENV==='test'?1000:30 });
const port = Number(process.env.API_PORT || process.env.PORT || 3001);
const server = app.listen(port, process.env.HOST || '127.0.0.1', () => console.log('COBI server ready on port ' + port));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => {await db.close();process.exit(0);}));
