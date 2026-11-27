import {api} from './api.js';
import {activityFeed} from './participation-ui.js';
let loading=false,updated=false;
async function load(){if(loading)return;loading=true;const status=document.querySelector('#landingStatus');
 try{const {stats,feed,headlines}=await api('/public/overview');for(const [key,value]of Object.entries(stats)){const node=document.querySelector(`[data-stat="${key}"]`);if(node)node.textContent=new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(value);}if(headlines){document.querySelectorAll('.landing-headlines>article').forEach((article,i)=>{const row=headlines[i];article.hidden=!row||row.active===false;if(!row)return;article.querySelector('h1,h2').textContent=row.title;const paragraph=article.matches('.landing-hero')?article.querySelector('div>p:not(.landing-eyebrow)'):article.querySelector('p');paragraph.textContent=row.body;let img=article.querySelector('img');if(row.image){if(!img){img=document.createElement('img');img.width=450;img.height=383;img.alt='';img.className='landing-mascot';article.append(img);}img.src=row.image;img.hidden=false;}else if(img)img.hidden=true;});}document.querySelector('#publicFeed').innerHTML=activityFeed(feed);status.hidden=true;updated=true;const stamp=document.querySelector('#landingUpdated');stamp.hidden=false;stamp.textContent='Diperbarui '+new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date())+' WIB · pembaruan otomatis setiap 30 detik.';}
 catch{status.hidden=false;status.innerHTML=`<p>${updated?'Pembaruan belum berhasil. Angka yang tampil adalah data terakhir yang berhasil dimuat.':'Statistik dan kegiatan belum dapat dimuat.'}</p><button class="btn o sm" type="button">Coba lagi</button>`;if(!updated)document.querySelector('#publicFeed').textContent='Data kegiatan belum tersedia.';status.querySelector('button').addEventListener('click',load);}
 finally{loading=false;}
}
load();
addEventListener('focus',()=>{if(document.visibilityState==='visible')load();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load();});
setInterval(()=>{if(document.visibilityState==='visible')load();},30000);
