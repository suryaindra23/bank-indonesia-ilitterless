import path from 'node:path';
import {INITIAL_QUESTIONS,quizPeriod,quizView} from '../shared/weekly-quiz.js';
export const profileComplete=user=>!!(user?.profile?.completedAt&&user.name&&user.profile.originType&&user.profile.originName&&user.profile.whatsapp&&user.profile.district&&user.profile.city);
const clean=(value,max=120)=>typeof value==='string'?value.trim().slice(0,max):'';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function publicOverview(state){
 const members=state.users.filter(u=>!u.deletedAt&&(state.communities?state.communities.some(row=>row.id===u.communityId&&!row.deletedAt):profileComplete(u)&&u.profile.originType==='komunitas')),ids=new Set(members.map(u=>u.id));
 const activities=state.acts.filter(a=>a.status==='verified');
 return {stats:{communities:state.communities?state.communities.filter(row=>!row.deletedAt).length:new Set(members.map(u=>u.profile.originName.toLocaleLowerCase('id-ID'))).size,communityMembers:members.length,wasteKg:Math.round(state.trx.reduce((sum,t)=>sum+t.kg,0)*10)/10,communityActivities:activities.filter(a=>ids.has(a.uid)).length},feed:activities.filter(action=>action.publicVisible!==false).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.id-a.id).slice(0,6).map(a=>({id:a.id,title:a.act,date:a.date,tile:a.tile,photo:a.photo?'/api/public/activity-photos/'+a.id:null,community:(members.find(u=>u.id===a.uid)?.communityName||members.find(u=>u.id===a.uid)?.profile?.originName)||null})),headlines:state.headlines||null};
}
export function mountParticipation(app,{read,transaction,db,requireRole,storage,now=()=>new Date()}){
 app.get('/api/public/overview',async(_req,res)=>res.json(publicOverview(await read())));
 app.get('/api/public/activity-photos/:id',async(req,res)=>{
  const action=(await read()).acts.find(item=>String(item.id)===req.params.id&&item.status==='verified'&&item.publicVisible!==false);
  if(!action||!/^\/api\/photos\/[a-f0-9-]+\.(jpeg|png|webp)$/.test(action.photo||''))fail(404,'Foto kegiatan tidak ditemukan.');
  await storage.serve(res,'photos/'+path.basename(action.photo));
 });

 app.post('/api/profile',requireRole('peserta'),async(req,res)=>{
  const name=clean(req.body.name,60),originType=clean(req.body.originType),originName=clean(req.body.originName),whatsapp=clean(req.body.whatsapp,25).replace(/[\s()-]/g,''),district=clean(req.body.district),city=clean(req.body.city);
  if(name.length<2||!['kelurahan','komunitas','instansi','event','lainnya'].includes(originType)||!/^\+?[0-9]{9,15}$/.test(whatsapp)||district.length<2||city.length<2)fail(400,'Lengkapi nama, asal, nomor WhatsApp, kecamatan, serta kota/kabupaten.');
  await transaction(req.account.id,'profile.complete',async state=>{const group=state.communities.find(row=>!row.deletedAt&&row.type===originType&&(req.body.communityId?row.id===req.body.communityId:row.name.toLowerCase()===originName.toLowerCase()));if(!group)fail(400,'Pilih kelompok yang sudah didaftarkan petugas sesuai jenis asal.');const user=state.users.find(u=>u.id===req.account.id);if(!user)fail(404,'Profil warga tidak ditemukan.');user.name=name;user.phone=whatsapp;user.communityId=group.id;user.communityName=group.name;user.profile={originType,originName:group.name,whatsapp,district,city,completedAt:new Date().toISOString()};await db.prepare('UPDATE accounts SET name=? WHERE id=?').run(name,req.account.id);});res.json({ok:true});
 });
 async function ensureWeek(){const {key}=quizPeriod(now());if(!(await read()).quizWeeks?.[key])await transaction('system','quiz.week.open',state=>{state.quizWeeks??={};state.quizWeeks[key]??={questions:structuredClone(state.quizBank||INITIAL_QUESTIONS)};});}
 app.get('/api/quiz',requireRole('peserta'),async(req,res)=>{await ensureWeek();res.json(quizView(await read(),req.account.id,now()));});
 app.post('/api/quiz/answer',requireRole('peserta'),async(req,res)=>{
  if(!profileComplete((await read()).users.find(user=>user.id===req.account.id)))fail(403,'Lengkapi profil dahulu.');
  await ensureWeek();const {id,selected,week}=req.body,period=quizPeriod(now());if(week!==period.key)fail(409,'Minggu kuis sudah berubah. Muat ulang kuis.');
  const result=await transaction(req.account.id,'quiz.answer',state=>{const question=state.quizWeeks[period.key].questions.find(q=>q.id===id);if(!question||!Number.isInteger(selected)||selected<0||selected>=question.options.length)fail(400,'Pilih jawaban kuis yang valid.');state.quizAttempts??=[];let attempt=state.quizAttempts.find(a=>a.uid===req.account.id&&a.week===period.key);if(!attempt){attempt={uid:req.account.id,week:period.key,answers:[],score:0};state.quizAttempts.push(attempt);}if(attempt.answers.length===10||attempt.answers.some(a=>a.id===id))fail(409,'Jawaban sudah tersimpan dan tidak dapat diulang.');const correct=selected===question.answer;attempt.answers.push({id,selected,correct});attempt.score+=correct?1:0;if(attempt.answers.length===10)attempt.completedAt=new Date().toISOString();return {correct,awarded:correct?1:0};});res.json({...result,quiz:quizView(await read(),req.account.id,now())});
 });
 app.get('/api/admin/quiz',requireRole('admin'),async(_req,res)=>{await ensureWeek();const state=await read(),period=quizPeriod(now());res.json({week:period.key,next:period.next,questions:state.quizWeeks[period.key].questions,bank:state.quizBank||INITIAL_QUESTIONS,nextQuestions:state.quizWeeks?.[period.next]?.questions||state.quizBank||INITIAL_QUESTIONS,locked:state.quizAttempts?.some(a=>a.week===period.key&&a.answers.length>0)||false});});
 app.post('/api/admin/quiz',requireRole('admin'),async(req,res)=>{
  const questions=req.body.questions;if(!Array.isArray(questions)||questions.length!==10)fail(400,'Kuis harus berisi tepat 10 pertanyaan.');
  const normalized=questions.map((q,index)=>{if(typeof q.text!=='string'||q.text.trim().length<5||q.text.length>500||!Array.isArray(q.options)||q.options.length<2||q.options.length>5||q.options.some(o=>typeof o!=='string'||!o.trim()||o.length>250)||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||typeof q.explanation!=='string'||q.explanation.length>1000)fail(400,'Lengkapi pertanyaan, pilihan, kunci jawaban, dan penjelasan.');return {id:'q'+(index+1),text:q.text.trim(),options:q.options.map(o=>o.trim()),answer:q.answer,explanation:q.explanation.trim()};});
  const period=quizPeriod(now());if(![period.key,period.next].includes(req.body.week))fail(400,'Pilih minggu berjalan atau minggu berikutnya.');
  await transaction(req.account.id,'quiz.publish',state=>{if(state.quizAttempts?.some(a=>a.week===req.body.week&&a.answers.length))fail(409,'Kuis minggu ini sudah dijawab peserta. Kelola kuis minggu berikutnya.');state.quizWeeks??={};state.quizWeeks[req.body.week]={questions:normalized,publishedBy:req.account.id};state.quizBank=normalized;});res.json({ok:true});
 });
}
