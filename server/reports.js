import {locationNames} from '../shared/locations.js';
import {carbonByMaterial} from '../shared/carbon.js';
const pc=(a,b)=>b?Math.round(a/b*100):0;
export function aggregateReport(state,week){
 const locations=locationNames(state),scopes=['all',...locations];
 return {locations,week,scopes:scopes.map(location=>({location,weeks:Array.from({length:week},(_,i)=>{
  const w=i+1,people=state.users.filter(u=>location==='all'||u.loc===location),ids=new Set(people.map(u=>u.id)),registered=people.filter(u=>u.reg<=w),actions=state.acts.filter(a=>a.week<=w&&ids.has(a.uid)&&!['cancelled','outbox'].includes(a.status)),tr=state.trx.filter(t=>!t.cancelledAt&&t.week<=w&&ids.has(t.uid)),active=registered.filter(u=>actions.some(a=>a.uid===u.id)),verified=actions.filter(a=>a.status==='verified').length,rejected=actions.filter(a=>a.status==='rejected').length,consistent=active.filter(u=>new Set(actions.filter(a=>a.uid===u.id).map(a=>a.week)).size>=2).length;
  return {week:w,target:location==='all'?60:20,reach:registered.length,act:pc(active.length,registered.length),actN:active.length,eng:new Set(actions.filter(a=>a.week===w).map(a=>a.uid)).size,ver:pc(verified,verified+rejected),V:verified,P:actions.filter(a=>a.status==='pending').length,cons:pc(consistent,active.length),consN:consistent,kg:Math.round(tr.reduce((s,t)=>s+t.kg,0)*10)/10,trx:tr.length,carbon:carbonByMaterial(tr),categories:['waste','plastic','green'].map(category=>({category,count:actions.filter(a=>a.cat===category&&a.status==='verified').length})),sources:{app:actions.filter(a=>a.status==='verified'&&a.src==='app').length,assisted:actions.filter(a=>a.src==='petugas').length},statuses:['verified','pending','rejected'].map(status=>({status,count:actions.filter(a=>a.week===w&&a.status===status).length})),learning:{participation:people.reduce((s,u)=>s+(u.ls?.length||0),0),verifiedUnderstanding:false}};
 })}))};
}
