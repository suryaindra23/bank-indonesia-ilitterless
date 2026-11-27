import test from 'node:test';
import assert from 'node:assert/strict';
import { queued,enqueue,flushQueue } from '../src/api.js';
import { readPhoto } from '../src/storage.js';
const memory = () => {
 const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};
};
test('outbox scopes queued photographs to account and retries with original idempotency key',async()=>{
 const oldStorage=globalThis.localStorage,oldFetch=globalThis.fetch;globalThis.localStorage=memory();
 try{
  enqueue('one',{clientId:'same',tile:'tas',photo:'photo'});assert.equal(queued('two').length,0);
  globalThis.fetch=async()=>{throw Error('offline');};await assert.rejects(flushQueue('one'));assert.equal(queued('one').length,1);
  const sent=[];globalThis.fetch=async(_url,options)=>{sent.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true})};};await flushQueue('one');assert.equal(sent[0].clientId,'same');assert.equal(queued('one').length,0);
 }finally{globalThis.localStorage=oldStorage;globalThis.fetch=oldFetch;}
});
test('outbox reports storage-full without pretending photograph was saved',()=>{
 const old=globalThis.localStorage;globalThis.localStorage={getItem:()=>null,setItem:()=>{throw Error('quota');}};
 try{assert.throws(()=>enqueue('one',{clientId:'new'}),/belum tersimpan/);}finally{globalThis.localStorage=old;}
});
test('photograph intake rejects unsupported and oversized files',async()=>{
 await assert.rejects(readPhoto({type:'image/svg+xml',size:5}),/JPG/);
 await assert.rejects(readPhoto({type:'image/png',size:11*1024*1024}),/10 MB/);
});
