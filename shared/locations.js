import {LOCS} from './catalog.js';
export const locationRows=state=>state.locations||LOCS.map(name=>({name,active:true}));
export const locationNames=(state,activeOnly=false)=>locationRows(state).filter(row=>!activeOnly||row.active).map(row=>row.name);
export function parseLocations(input){
 if(typeof input!=='string'||input.length>150000)throw Error('Daftar maksimal 150.000 karakter.');
 const lines=input.replace(/^\uFEFF/,'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 if(lines.length>1001)throw Error('Impor maksimal 1.000 kelurahan sekaligus.');
 const names=[],duplicates=[];const seen=new Set();
 for(let line of lines){
  if(/^"[^"\r\n]+"$/.test(line))line=line.slice(1,-1);
  const name=line.normalize('NFKC').replace(/\s+/g,' ').trim();
  if(!names.length&&/^(kelurahan|nama kelurahan|name)$/i.test(name))continue;
  if(name.length<2||name.length>80||!/^\p{L}[\p{L}\p{N} .’'()-]*$/u.test(name))throw Error('Nama kelurahan tidak valid: '+name.slice(0,80)+'. Gunakan satu kolom tanpa kecamatan/kota.');
  const key=name.toLocaleLowerCase('id-ID');if(seen.has(key)){duplicates.push(name);continue;}seen.add(key);names.push(name);
 }
 if(!names.length)throw Error('Isi minimal satu nama kelurahan.');
 if(names.length>1000)throw Error('Impor maksimal 1.000 kelurahan sekaligus.');
 return {names,duplicates};
}
