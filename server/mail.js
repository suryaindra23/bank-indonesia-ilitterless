import nodemailer from 'nodemailer';
import { mkdirSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createMailer({previewDir}={}) {
 const testMode=process.env.MAIL_MAILER==='json'&&process.env.NODE_ENV==='test';
 const transport=testMode?nodemailer.createTransport({jsonTransport:true}):nodemailer.createTransport({
  host:process.env.MAIL_HOST,port:Number(process.env.MAIL_PORT || 587),
  secure:process.env.MAIL_SCHEME==='smtps'||Number(process.env.MAIL_PORT)===465,
  requireTLS:true,
  auth:{user:process.env.MAIL_USERNAME,pass:process.env.MAIL_PASSWORD?.replaceAll(' ','')},
  connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
 });
 return {
  async verify(){await transport.verify();},
  async send({to,subject,text,attachments,replyTo,messageId}){
   if(!testMode&&(!process.env.MAIL_HOST||!process.env.MAIL_USERNAME||!process.env.MAIL_PASSWORD))throw Error('SMTP belum dikonfigurasi.');
   await transport.sendMail({from:{name:process.env.MAIL_FROM_NAME || 'COBI',address:process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || 'test@example.test'},to,subject,text,attachments,replyTo,messageId});
   if(testMode&&previewDir){mkdirSync(previewDir,{recursive:true});writeFileSync(path.join(previewDir,randomUUID()+'.json'),JSON.stringify({to,subject,text}),{mode:0o600});}
  },
 };
}
