import {api} from './api.js';
import {activityFeed} from './participation-ui.js';
let loading=false,updated=false;
async function load(){if(loading)return;loading=true;const status=document.querySelector('#landingStatus');
 try{const {stats,feed}=await api('/public/overview');for(const [key,value]of Object.entries(stats)){const node=document.querySelector(`[data-stat="${key}"]`);if(node)node.textContent=new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(value);}document.querySelector('#publicFeed').innerHTML=activityFeed(feed);status.hidden=true;updated=true;const stamp=document.querySelector('#landingUpdated');stamp.hidden=false;stamp.textContent='Diperbarui '+new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date())+' WIB · pembaruan otomatis setiap 30 detik.';}
 catch{status.hidden=false;status.innerHTML=`<p>${updated?'Pembaruan belum berhasil. Angka yang tampil adalah data terakhir yang berhasil dimuat.':'Statistik dan kegiatan belum dapat dimuat.'}</p><button class="btn o sm" type="button">Coba lagi</button>`;if(!updated)document.querySelector('#publicFeed').textContent='Data kegiatan belum tersedia.';status.querySelector('button').addEventListener('click',load);}
 finally{loading=false;}
}
load();
addEventListener('focus',()=>{if(document.visibilityState==='visible')load();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load();});
setInterval(()=>{if(document.visibilityState==='visible')load();},30000);
