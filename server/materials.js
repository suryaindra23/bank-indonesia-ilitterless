import multer from 'multer';
import { mkdirSync, openSync, readSync, closeSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const formats = { '.mp4': ['video', 'video/mp4'], '.pptx': ['powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'], '.ppt': ['powerpoint', 'application/vnd.ms-powerpoint'], '.pdf': ['module', 'application/pdf'], '.docx': ['module', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], '.doc': ['module', 'application/msword'] };
const fail = (status, message) => {throw Object.assign(new Error(message), { status });};
function embedURL(value) {
  try {
    const url = new URL(value);if (url.protocol !== 'https:' || url.username || url.password) throw Error();let id;
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname)) {
      id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];if (!/^[\w-]{11}$/.test(id || '')) throw Error();return 'https://www.youtube-nocookie.com/embed/' + id;
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(url.hostname)) {id = url.pathname.match(/(?:video\/)?(\d+)\/?$/)?.[1];if (!id) throw Error();return 'https://player.vimeo.com/video/' + id;}
  } catch {}
  fail(400, 'Gunakan tautan HTTPS video YouTube/Vimeo, atau unggah MP4.');
}
export function mountMaterials(app, { read, transaction, requireRole, dataDir, storage }) {
  const directory = path.join(dataDir, 'materials');mkdirSync(directory, { recursive: true, mode: 0o700 });
  const upload = multer({ storage: multer.diskStorage({ destination: directory, filename: (_req, file, callback) => callback(null, randomUUID() + path.extname(file.originalname).toLowerCase()) }), limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 0 }, fileFilter: (_req, file, callback) => callback(formats[path.extname(file.originalname).toLowerCase()] ? null : Object.assign(new Error('Gunakan MP4, PowerPoint, PDF, atau Word.'), { status: 400 }), true) }).single('file');
  app.post('/api/materials/file', requireRole('admin'), (req, res, next) => upload(req, res, async (error) => {
    if (error) return next(Object.assign(new Error(error.code === 'LIMIT_FILE_SIZE' ? 'Ukuran berkas maksimal 50 MB.' : 'Unggahan berkas tidak valid.'), { status: 400 }));
    try {
      if (!req.file) fail(400, 'Pilih berkas materi.');
      if(storage.remote)fail(400,'Gunakan unggahan langsung ke Storage.');const ext = path.extname(req.file.filename),[kind, mime] = formats[ext];
      const header = Buffer.alloc(16),fd = openSync(req.file.path, 'r');try {readSync(fd, header, 0, 16, 0);} finally {closeSync(fd);}
      const valid = ext === '.pdf' ? header.toString('ascii', 0, 5) === '%PDF-' : ext === '.mp4' ? header.toString('ascii', 4, 8) === 'ftyp' : ['.pptx', '.docx'].includes(ext) ? header[0] === 80 && header[1] === 75 : header.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'));
      if (!valid) fail(400, 'Isi berkas tidak cocok dengan format yang dipilih.');
      const file = { id: randomUUID(), filename: req.file.filename, name: path.basename(req.file.originalname).replace(/[\r\n]/g, '').slice(0, 160), kind, mime, size: req.file.size, createdBy: req.account.id };
      await transaction(req.account.id, 'material.upload', (state) => {state.materialFiles ??= [];state.materialFiles.push(file);});res.status(201).json({ file: { id: file.id, name: file.name, kind: file.kind, size: file.size } });
    } catch (error) {if (req.file) unlinkSync(req.file.path);next(error);}
  }));
  app.post('/api/materials', requireRole('admin'), async (req, res) => {
    const { title, kind, body = '', fileId = '', videoUrl = '', clientId } = req.body;
    if (typeof title !== 'string' || title.trim().length < 3 || title.length > 160 || !['video', 'powerpoint', 'module', 'text'].includes(kind) || typeof body !== 'string' || body.length > 30000 || typeof clientId !== 'string' || !clientId || clientId.length > 80) fail(400, 'Lengkapi judul, jenis, dan isi materi.');
    if (kind === 'text' && body.trim().length < 20) fail(400, 'Tulis materi minimal 20 karakter.');
    const state = await read(),file = state.materialFiles?.find((file) => file.id === fileId);
    if (kind !== 'text' && !(kind === 'video' && !fileId) && (!file || file.kind !== kind)) fail(400, 'Unggah berkas sesuai jenis materi.');
    const videoEmbed = kind === 'video' && !fileId ? embedURL(videoUrl) : null;
    const material = { id: 'material-' + randomUUID(), title: title.trim(), t: title.trim(), kind, c: '#007573', i: 'book', body: body.trim() ? [body.trim()] : [], fileId: kind === 'text' ? null : file?.id || null, fileName: file?.name || null, fileMime:file?.mime||null, videoEmbed, q: null, clientId, createdBy: req.account.id, createdAt: new Date().toISOString() };
    const result = await transaction(req.account.id, 'material.publish', (snapshot) => {snapshot.lessons ??= [];if(snapshot.deletedMaterialClients?.includes(clientId))fail(410,'Materi sudah dihapus. Buat materi baru.');const old = snapshot.lessons.find((lesson) => lesson.clientId === clientId);if (old) return old;if(material.fileId&&!snapshot.materialFiles?.some(file=>file.id===material.fileId))fail(409,'Berkas sudah dihapus. Unggah ulang.');snapshot.lessons.push(material);return material;});res.status(201).json({ material: result });
  });
  app.get('/api/material-files/:id', requireRole(), async (req, res) => {
    const state = await read(),file = state.materialFiles?.find((file) => file.id === req.params.id);if (!file || !['admin','superadmin'].includes(req.account.role) && !state.lessons?.some((lesson) => lesson.fileId === file.id&&!lesson.archived)) fail(404, 'Berkas materi tidak ditemukan.');
    await storage.serve(res,'materials/'+file.filename,{mime:file.mime,name:file.name,download:!(file.mime==='application/pdf'||file.kind==='video')});
  });
  app.post('/api/lessons/:id/complete', requireRole('peserta'), async (req, res) => {
    const awarded = await transaction(req.account.id, 'material.complete', (state) => {const lesson=state.lessons?.find(lesson=>lesson.id===req.params.id&&!lesson.archived);if(!lesson)fail(404,'Materi tidak tersedia atau telah diarsipkan.');const user = state.users.find((user) => user.id === req.account.id);if (user.ls.includes(lesson.id)) return 0;user.ls.push(lesson.id);return 20;});res.json({ awarded });
  });
}
