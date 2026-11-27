import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { ARTICLE_POINTS } from '../shared/catalog.js';
import {originSnapshot} from '../shared/history.js';

export function mountArticles(app, { read, transaction, requireRole, savePhoto, mailer, storage, date, week, notify }) {
  const fail = (status, message) => {throw Object.assign(new Error(message), { status });};
  const recipient = process.env.CURATION_EMAIL || 'ilitterless@gmail.com';
  const publicArticle = (article) => ({ ...article });
  async function deliver(id, actor) {
    const article=await transaction(actor,'article.mail.start',state=>{
      const article=state.articles?.find(a=>a.id===id&&!a.archived);if(!article)fail(404,'Artikel tidak ditemukan atau diarsipkan.');
      if(article.emailStatus==='sent')return {...article};
      const now=Date.now();if(article.emailStatus==='sending'&&now-(article.lastAttempt||0)<60000)fail(409,'Email sedang dikirim. Tunggu sebentar.');
      article.emailStatus='sending';article.lastAttempt=now;return {...article};
    });
    if(article.emailStatus==='sent')return article;
    const user = (await read()).users.find((u) => u.id === article.uid);
    const origin = new URL('/petugas', process.env.APP_ORIGIN || 'http://127.0.0.1:5173').href;
    try {
      await mailer.send({ to: recipient, replyTo: user.email, subject: 'COBI: pengajuan artikel kegiatan ' + id,
        text: `Pengajuan artikel warga untuk kurasi tim iLitterless.\nPoin ${ARTICLE_POINTS} hanya diberikan setelah disetujui.\n\nPengirim: ${user.name}\nEmail: ${user.email}\nBibu ID: ${user.bibu}\nKelurahan: ${user.loc}\n\nFoto kegiatan: terlampir\n\nTulisan:\n${article.body}\n\nSiapa saja yang terlibat:\n${article.participants}\n\nTanggal kejadian: ${article.occurredOn}\n\nID artikel: ${id}\nKurasi melalui panel petugas: ${origin}/#artikel\n`,
        attachments: [{ filename: 'foto-kegiatan' + path.extname(article.photo), content: await storage.read('photos/'+path.basename(article.photo)) }], messageId: `<article-${id}@bibubebo.local>` });
      await transaction(actor, 'article.mail.sent', (state) => {const a = state.articles.find((a) => a.id === id);a.emailStatus = 'sent';a.emailedAt = new Date().toISOString();});
    } catch {
      await transaction(actor, 'article.mail.failed', (state) => {state.articles.find((a) => a.id === id).emailStatus = 'failed';});
    }
    return (await read()).articles.find((a) => a.id === id);
  }
  app.post('/api/articles', requireRole('peserta'), async (req, res) => {
    const { body, participants, occurredOn, clientId } = req.body;
    if (typeof body !== 'string' || body.trim().length < 50 || body.length > 12000 || typeof participants !== 'string' || !participants.trim() || participants.length > 2000 || typeof occurredOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || !Number.isFinite(Date.parse(occurredOn)) || new Date(occurredOn).toISOString().slice(0, 10) !== occurredOn || occurredOn > date() || typeof clientId !== 'string' || !clientId || clientId.length > 80) fail(400, 'Lengkapi tulisan (50–12000 karakter), pihak terlibat, dan tanggal kejadian yang valid, tidak di masa depan.');
    const old = (await read()).articles?.find((a) => a.uid === req.account.id && a.clientId === clientId);if (old) return res.json({ article: publicArticle(old) });
    const photo = await savePhoto(req.body.photo, true,req.account),id = randomUUID();
    const stored=await transaction(req.account.id, 'article.create', (state) => {if(req.body.photo.startsWith('/api/photos/')&&!state.uploads?.some(upload=>upload.completed&&upload.uid===req.account.id&&'/api/photos/'+upload.filename===req.body.photo))fail(400,'Foto sudah tidak tersedia. Unggah kembali.');state.articles ??= [];const old=state.articles.find(a=>a.uid===req.account.id&&a.clientId===clientId);if(old)return old;const article={ id, uid: req.account.id, origin:originSnapshot(state,req.account.id), clientId, body: body.trim(), participants: participants.trim(), occurredOn, photo, week: week(), createdAt: new Date().toISOString(), status: 'pending', emailStatus: 'queued' };state.articles.push(article);return article;});
    if(stored.id!==id&&!req.body.photo.startsWith('/api/photos/'))await storage.remove('photos/'+path.basename(photo));
    const article = await deliver(stored.id, req.account.id);res.status(201).json({ article: publicArticle(article) });
  });
  app.post('/api/my/articles/:id',requireRole('peserta'),async(req,res)=>{
    const initial=(await read()).articles?.find(a=>a.id===req.params.id&&a.uid===req.account.id&&!a.archived);if(!initial)fail(404,'Artikel tidak ditemukan.');const b=req.body,why=typeof b.reason==='string'?b.reason.trim():'';if(why.length<5||why.length>500)fail(400,'Isi alasan perubahan 5–500 karakter.');let replacement;
    if(b.photo&&b.photo!==initial.photo)replacement=await savePhoto(b.photo,true,req.account);
    await transaction(req.account.id,'article.owner-edit',s=>{const a=s.articles.find(a=>a.id===req.params.id&&a.uid===req.account.id&&!a.archived);if(!a)fail(404,'Artikel tidak ditemukan.');if(!['pending','rejected'].includes(a.status)||a.emailStatus==='sending')fail(409,'Artikel yang sudah disetujui atau sedang dikirim hanya dapat dikelola petugas.');const before=structuredClone(a);
     if(b.operation==='archive')a.archived=true;
     else {if(typeof b.body!=='string'||b.body.trim().length<50||b.body.length>12000||typeof b.participants!=='string'||!b.participants.trim()||b.participants.length>2000||!/^\d{4}-\d{2}-\d{2}$/.test(b.occurredOn||'')||!Number.isFinite(Date.parse(b.occurredOn))||new Date(b.occurredOn).toISOString().slice(0,10)!==b.occurredOn||b.occurredOn>date())fail(400,'Lengkapi tulisan, pihak terlibat, dan tanggal yang valid.');a.body=b.body.trim();a.participants=b.participants.trim();a.occurredOn=b.occurredOn;if(replacement)a.photo=replacement;a.status='pending';a.emailStatus='queued';a.reason='Artikel diperbarui; perlu kirim ulang email.';}
     s.managementChanges??=[];s.managementChanges.push({id:randomUUID(),kind:'articles',targetId:a.id,actor:req.account.email,operation:b.operation==='archive'?'archive':'update',reason:why,before,after:structuredClone(a),pointsDelta:0,created:new Date().toISOString()});
    });res.json({ok:true});
  });
  app.post('/api/articles/:id/send', requireRole('peserta', 'admin'), async (req, res) => {
    const article = (await read()).articles?.find((a) => a.id === req.params.id && (req.account.role === 'admin' || a.uid === req.account.id));
    if (!article) fail(404, 'Artikel tidak ditemukan.');res.json({ article: publicArticle(await deliver(article.id, req.account.id)) });
  });
  app.post('/api/articles/:id/review', requireRole('admin'), async (req, res) => {
    const { status, reason } = req.body;
    if (!['verified', 'rejected'].includes(status) || status === 'rejected' && (typeof reason !== 'string' || !reason.trim() || reason.length > 500)) fail(400, 'Pilih keputusan dan isi alasan jika ditolak.');
    await transaction(req.account.id, 'article.review', (state) => {
      const article = state.articles?.find((a) => a.id === req.params.id);if (!article) fail(404, 'Artikel tidak ditemukan.');if (article.status !== 'pending') fail(409, 'Artikel sudah dikurasi.');if (status === 'verified' && article.emailStatus !== 'sent') fail(409, 'Email belum terkirim ke tim. Kirim ulang sebelum menyetujui.');
      if(article.archived)fail(409,'Artikel diarsipkan. Pulihkan sebelum kurasi.');article.awardedPoints=state.pointRules?.article??ARTICLE_POINTS;article.origin??=originSnapshot(state,article.uid);article.status = status;article.reason = status === 'rejected' ? reason.trim() : '';article.reviewedBy = req.account.id;article.reviewedAt = new Date().toISOString();
      notify(state, article.uid, status === 'verified' ? `Artikel kegiatan Anda lolos kurasi iLitterless. +${article.awardedPoints} poin` : `Artikel belum diterima: ${article.reason}`);
    });res.json({ ok: true });
  });
}
