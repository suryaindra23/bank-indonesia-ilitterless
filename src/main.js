new MutationObserver(()=>{for(const c of document.querySelectorAll('.stack td:not([data-l])')){let i=0,p=c;while(p=p.previousElementSibling)i+=p.colSpan;c.dataset.l=c.closest('table').rows[0].cells[i]?.textContent||''}}).observe(document,{childList:true,subtree:true})
import QRCode from 'qrcode';
import {materialManagementUI} from './material-management-ui.js';
import {accessPage} from './access-ui.js';
import {locationsUI} from './admin-management-ui.js';
import {isPDFMaterial,pdfReaderUI} from './pdf-reader-ui.js';
let pdfCleanup=()=>{};
import {activityManagementUI} from './activity-management-ui.js';
import {residentFiltersUI,emptyResidentFilters,filterResidents,originLabels} from './resident-filters.js';
import {profileForm,quizScreen,quizAdminForm,activityFeed} from './participation-ui.js';
import {communityOf} from '../shared/community.js';
import { readPhoto } from './storage.js';
import { api, queued, enqueue, flushQueue, uploadMaterial } from './api.js';
import { TILES, MIS, LES, LOCS as DEFAULT_LOCS, DAILY_POINTS, MISSION_POINTS, ARTICLE_POINTS } from '../shared/catalog.js';
let LOCS=[...DEFAULT_LOCS],REPORT_LOCS=[...DEFAULT_LOCS];
import { CARBON_FACTORS, CARBON_SOURCE, co2e, factorPerKg, carbonByMaterial } from '../shared/carbon.js';

const BIBU_DEFS=`<radialGradient id="bBody" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#9ad0ff"/><stop offset=".42" stop-color="#3d8af6"/><stop offset="1" stop-color="#1243b8"/></radialGradient>
<radialGradient id="bBelly" cx=".5" cy=".25" r=".9"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfe4ff"/></radialGradient>
<linearGradient id="bFin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b93f7"/><stop offset="1" stop-color="#1747bd"/></linearGradient>
<radialGradient id="bIris" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#4a7be0"/><stop offset="1" stop-color="#0a1c48"/></radialGradient>
<radialGradient id="bBlush"><stop offset="0" stop-color="#ff7fa0" stop-opacity=".85"/><stop offset="1" stop-color="#ff7fa0" stop-opacity="0"/></radialGradient>
<linearGradient id="bScarf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fd27b"/><stop offset="1" stop-color="#138040"/></linearGradient>
<linearGradient id="bDrop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4f0ff"/><stop offset="1" stop-color="#3aa3ff"/></linearGradient>
<linearGradient id="bGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#37cc74"/><stop offset="1" stop-color="#127a3b"/></linearGradient>
<clipPath id="bClip"><ellipse cx="66" cy="72" rx="48" ry="43"/></clipPath>`;
function bibu(){return '<img class="bibu brand-illustration" src="/brand/ilitterless-symbol.png" alt="Ikon paus iLitterless" width="450" height="383">';}

function legacyBibu(pose='happy',o={}){
 const drop='M0-9c-3 5-5 8-5 10.5a5 5 0 0 0 10 0C5-1 3-4 0-9z';
 const eyeO=(dy=0)=>`<ellipse cx="52" cy="64" rx="9.5" ry="11" fill="#fff"/><ellipse cx="80" cy="64" rx="9.5" ry="11" fill="#fff"/><circle cx="53" cy="${66+dy}" r="6.8" fill="url(#bIris)"/><circle cx="79" cy="${66+dy}" r="6.8" fill="url(#bIris)"/><circle cx="55.6" cy="${63+dy}" r="2.4" fill="#fff"/><circle cx="81.6" cy="${63+dy}" r="2.4" fill="#fff"/><circle cx="51" cy="${69+dy}" r="1.1" fill="#fff"/><circle cx="77" cy="${69+dy}" r="1.1" fill="#fff"/>`;
 const shut=x=>`<path d="M${x-8} 66q8-9 16 0" stroke="#0c2d6b" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
 const eyes={open:eyeO(),down:eyeO(3),closed:shut(52)+shut(80),wink:`<ellipse cx="52" cy="64" rx="9.5" ry="11" fill="#fff"/><circle cx="53" cy="66" r="6.8" fill="url(#bIris)"/><circle cx="55.6" cy="63" r="2.4" fill="#fff"/><circle cx="51" cy="69" r="1.1" fill="#fff"/>`+shut(80)};
 const mouthBig='<path d="M55 80q11 16 22 0z" fill="#7a1430"/><path d="M60 88q6-4 12 0q-6 4.5-12 0z" fill="#ff7a93"/>';
 const mouthSm='<path d="M59 83q7 6 14 0" stroke="#7a1430" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
 const finDown='<ellipse cx="22" cy="92" rx="13" ry="7.5" transform="rotate(-35 22 92)" fill="url(#bFin)"/>';
 const finUp='<ellipse cx="17" cy="52" rx="13" ry="7.5" transform="rotate(-62 17 52)" fill="url(#bFin)"/><path d="M4 36q-4 6-2 12M10 30q-6 3-7 9" stroke="#7fbaff" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
 const P={
  wave:{e:'open',m:mouthBig,f:finUp},happy:{e:'open',m:mouthBig,f:finDown},
  read:{e:'down',m:mouthSm,f:'',acc:'<g><path d="M40 92l26 5 26-5v26l-26 5-26-5z" fill="url(#bGreen)"/><path d="M66 97v26" stroke="#0e6331" stroke-width="2"/><path d="M43 94l23 4.5L89 94" stroke="#e9fff1" stroke-width="2.4" fill="none"/><path d="M78 106c-5 3-5 9 0 11 5-3 5-8 0-11z" fill="#e9fff1"/><ellipse cx="38" cy="104" rx="9" ry="6" transform="rotate(-60 38 104)" fill="url(#bFin)"/><ellipse cx="94" cy="104" rx="9" ry="6" transform="rotate(60 94 104)" fill="url(#bFin)"/></g>'},
  proud:{e:'closed',m:mouthBig,f:finUp,acc:'<path d="M118 22l2.6 6.4 6.4 2.6-6.4 2.6-2.6 6.4-2.6-6.4-6.4-2.6 6.4-2.6z" fill="#ffc21a"/><path d="M104 8l1.6 3.9 3.9 1.6-3.9 1.6-1.6 3.9-1.6-3.9-3.9-1.6 3.9-1.6z" fill="#ffc21a"/><path d="M24 22l1.6 3.9 3.9 1.6-3.9 1.6-1.6 3.9-1.6-3.9-3.9-1.6 3.9-1.6z" fill="#ffdc5c"/>'},
  cheer:{e:'open',m:mouthSm,f:finUp,acc:'<path d="M44 51l11-4M88 51l-11-4" stroke="#0c2d6b" stroke-width="3" stroke-linecap="round"/>'},
  tumbler:{e:'wink',m:mouthBig,f:finDown,acc:'<g><path d="M90 76h20l-2.5 36h-15z" fill="url(#bGreen)"/><rect x="88" y="70" width="24" height="8" rx="3" fill="#0e6331"/><path d="M100 88c-5 3-5 10 0 13 5-3 5-10 0-13z" fill="#e9fff1"/><ellipse cx="88" cy="98" rx="10" ry="6.5" transform="rotate(-20 88 98)" fill="url(#bFin)"/></g>'}};
 const p=P[pose]||P.happy;
 const crown=o.crown?'<path d="M44 30c-9-5-10-13-6-16 6 2 9 10 6 16zM88 30c0-9 6-15 11-13 2 5-4 12-11 13z" fill="#2fbf6a"/><path d="M54 22c-6-6-5-13-1-15 5 3 5 10 1 15zM78 22c-1-7 4-13 8-12 1 5-3 11-8 12z" fill="#22a85a"/>':'';
 return `<svg class="bibu ${o.cls||''}" viewBox="0 0 140 130" role="img" aria-label="Bibu, paus biru"><ellipse cx="66" cy="123" rx="40" ry="5" fill="#0c2d6b" opacity=".16"/>
 <path d="${drop}" transform="translate(66 18) scale(1.25)" fill="url(#bDrop)"/><path d="${drop}" transform="translate(50 24) rotate(-28)" fill="url(#bDrop)"/><path d="${drop}" transform="translate(82 24) rotate(28)" fill="url(#bDrop)"/>
 ${crown}
 <path d="M103 76c11-1 20-9 25-22-6 4-12 4-16 2 4-7 4-15-1-21-3 13-9 24-16 32z" fill="url(#bFin)"/>
 <ellipse cx="111" cy="98" rx="11" ry="6.5" transform="rotate(32 111 98)" fill="#1747bd"/>
 <ellipse cx="66" cy="72" rx="48" ry="43" fill="url(#bBody)"/>
 <g clip-path="url(#bClip)"><ellipse cx="64" cy="106" rx="42" ry="30" fill="url(#bBelly)"/><path d="M10 93Q66 123 122 93v11Q66 136 10 104z" fill="url(#bScarf)"/><path d="M14 96Q66 124 118 96" stroke="#7ee8a8" stroke-width="1.6" fill="none" opacity=".7"/></g>
 <circle cx="66" cy="111" r="7.5" fill="#eafff2" stroke="#138040" stroke-width="2"/><path d="M66 106c-4 2.5-4 7.5 0 10 4-2.5 4-7.5 0-10z" fill="#1aa354"/>
 <ellipse cx="44" cy="44" rx="15" ry="8" transform="rotate(-28 44 44)" fill="#fff" opacity=".35"/><circle cx="60" cy="36" r="3" fill="#fff" opacity=".4"/>
 ${eyes[p.e]}<ellipse cx="40" cy="79" rx="8" ry="4.5" fill="url(#bBlush)"/><ellipse cx="92" cy="79" rx="8" ry="4.5" fill="url(#bBlush)"/>${p.m}${p.f}${p.acc||''}</svg>`}

const I={"home":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>","book":"<path d=\"M12 7v14\"/><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"/>","gift":"<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13\"/><path d=\"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7\"/><path d=\"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5\"/>","user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>","back":"<path d=\"m15 18-6-6 6-6\"/>","cam":"<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\"/><circle cx=\"12\" cy=\"13\" r=\"3\"/>","check":"<path d=\"M20 6 9 17l-5-5\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>","x":"<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>","recycle":"<path d=\"M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5\"/><path d=\"M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12\"/><path d=\"m14 16-3 3 3 3\"/><path d=\"M8.293 13.596 7.196 9.5 3.1 10.598\"/><path d=\"m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843\"/><path d=\"m13.378 9.633 4.096 1.098 1.097-4.096\"/>","bag":"<path d=\"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z\"/><path d=\"M3 6h18\"/><path d=\"M16 10a4 4 0 0 1-8 0\"/>","leaf":"<path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z\"/><path d=\"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\"/>","cup":"<path d=\"m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8\"/><path d=\"M5 8h14\"/><path d=\"M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0\"/><path d=\"m12 8 1-6h2\"/>","ban":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m4.9 4.9 14.2 14.2\"/>","bike":"<circle cx=\"18.5\" cy=\"17.5\" r=\"3.5\"/><circle cx=\"5.5\" cy=\"17.5\" r=\"3.5\"/><circle cx=\"15\" cy=\"5\" r=\"1\"/><path d=\"M12 17.5V14l-3-3 4-3 2 3h2\"/>","chat":"<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\"/>","help":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/><path d=\"M12 17h.01\"/>","sound":"<path d=\"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z\"/><path d=\"M16 9a5 5 0 0 1 0 6\"/><path d=\"M19.364 18.364a9 9 0 0 0 0-12.728\"/>","qr":"<rect width=\"5\" height=\"5\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"5\" height=\"5\" x=\"16\" y=\"3\" rx=\"1\"/><rect width=\"5\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/><path d=\"M21 16h-3a2 2 0 0 0-2 2v3\"/><path d=\"M21 21v.01\"/><path d=\"M12 7v3a2 2 0 0 1-2 2H7\"/><path d=\"M3 12h.01\"/><path d=\"M12 3h.01\"/><path d=\"M12 16v.01\"/><path d=\"M16 12h1\"/><path d=\"M21 12v.01\"/><path d=\"M12 21v-1\"/>","scale":"<path d=\"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\"/><path d=\"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\"/><path d=\"M7 21h10\"/><path d=\"M12 3v18\"/><path d=\"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2\"/>","shield":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>","star":"<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\"/>","flag":"<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/><line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\"/>","trophy":"<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6\"/><path d=\"M18 9h1.5a2.5 2.5 0 0 0 0-5H18\"/><path d=\"M4 22h16\"/><path d=\"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22\"/><path d=\"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22\"/><path d=\"M18 2H6v7a6 6 0 0 0 12 0V2Z\"/>","spark":"<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\"/><path d=\"M20 3v4\"/><path d=\"M22 5h-4\"/><path d=\"M4 17v2\"/><path d=\"M5 18H3\"/>","scan":"<path d=\"M3 7V5a2 2 0 0 1 2-2h2\"/><path d=\"M17 3h2a2 2 0 0 1 2 2v2\"/><path d=\"M21 17v2a2 2 0 0 1-2 2h-2\"/><path d=\"M7 21H5a2 2 0 0 1-2-2v-2\"/><path d=\"M7 12h10\"/>","search":"<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/>","up":"<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\"/><polyline points=\"16 7 22 7 22 13\"/>","down":"<polyline points=\"22 17 13.5 8.5 8.5 13.5 2 7\"/><polyline points=\"16 17 22 17 22 11\"/>"};

I.community='<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>';
const $=s=>document.querySelector(s);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let seed=11;const rnd=()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const pick=a=>a[Math.floor(rnd()*a.length)];
const ic=(n,st='')=>`<svg class="ic" viewBox="0 0 24 24" style="${st}" aria-hidden="true">${I[n]}</svg>`;

const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

const CATS={waste:{n:'Sampah',c:'#178a4a',bg:'#dbf3e4'},plastic:{n:'Plastik',c:'#1468e6',bg:'#dcecff'},green:{n:'Hidup hijau',c:'#2c8a2a',bg:'#e6f5d6'}};
const ILLO_DEFS=`<linearGradient id="iG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5be096"/><stop offset="1" stop-color="#128a45"/></linearGradient><linearGradient id="iGd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c9150"/><stop offset="1" stop-color="#0d5a2f"/></linearGradient><linearGradient id="iB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#78b2ff"/><stop offset="1" stop-color="#1652c9"/></linearGradient><linearGradient id="iBd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d67d8"/><stop offset="1" stop-color="#0f3d9e"/></linearGradient><linearGradient id="iT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e6c0"/><stop offset="1" stop-color="#cfa968"/></linearGradient><linearGradient id="iW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d6dde8"/></linearGradient><linearGradient id="iP" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ec9d66"/><stop offset="1" stop-color="#a4562a"/></linearGradient><linearGradient id="iD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4f0ff"/><stop offset="1" stop-color="#3aa3ff"/></linearGradient>`;
const SH='<ellipse cx="40" cy="59" rx="22" ry="3.5" fill="#0b3b39" opacity=".13"/>';
const HL=(d)=>`<path d="${d}" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".55"/>`;
const ART={
 tumbler:SH+'<path d="M29 15h22l-3 42H32z" fill="url(#iG)"/><rect x="27" y="8" width="26" height="9" rx="3.5" fill="url(#iGd)"/><path d="M40 29c-6 4-6 12 0 16 6-4 6-12 0-16z" fill="#e9fff1"/>'+HL('M33 21l1.6 30'),
 tas:SH+'<path d="M18 22h44l-4 35H22z" fill="url(#iT)"/><path d="M18 22h44v5H18z" fill="#c89f5e" opacity=".55"/><path d="M29 22q0-14 11-14t11 14" stroke="#a07a40" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M40 31c-7 5-7 14 0 18 7-4 7-13 0-18z" fill="url(#iG)"/>'+HL('M23 30l1.6 20'),
 tolak:SH+'<path d="M17 22h31l-3 35H20z" fill="url(#iW)" stroke="#b6c0d2" stroke-width="2"/><path d="M24 22q0-11 9-11t9 11" stroke="#b6c0d2" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="53" cy="40" r="15" fill="#fff" stroke="#d23c3c" stroke-width="4.5"/><path d="M42.5 29.5l21 21" stroke="#d23c3c" stroke-width="4.5" stroke-linecap="round"/>'+HL('M47 31a10 10 0 0 1 6-3'),
 pilah:SH+'<rect x="11" y="22" width="25" height="35" rx="4" fill="url(#iG)"/><rect x="9" y="15" width="29" height="8" rx="3" fill="url(#iGd)"/><rect x="44" y="22" width="25" height="35" rx="4" fill="url(#iB)"/><rect x="42" y="15" width="29" height="8" rx="3" fill="url(#iBd)"/><path d="M23.5 31c-5 3-5 10 0 13 5-3 5-10 0-13z" fill="#e9fff1"/><rect x="51.5" y="31" width="10" height="14" rx="2.5" fill="#e3eeff"/>'+HL('M15 28v22')+HL('M48 28v22'),
 tanam:SH+'<path d="M25 40h30l-4 18H29z" fill="url(#iP)"/><rect x="23" y="35" width="34" height="8" rx="3" fill="#b8653a"/><path d="M40 35V20" stroke="#1d8a44" stroke-width="3" stroke-linecap="round"/><path d="M40 27c-10-1-15-8-13-15 8 0 13 6 13 15zM40 23c9-1 13-7 12-13-8 0-12 5-12 13z" fill="url(#iG)"/><path d="M63 8c-3 5-4.5 7.5-4.5 9.5a4.5 4.5 0 0 0 9 0C67.5 15.5 66 13 63 8z" fill="url(#iD)"/>'+HL('M29 46l1.2 8'),
 jalan:SH+'<circle cx="22" cy="44" r="12" fill="none" stroke="#1f2f3a" stroke-width="4"/><circle cx="58" cy="44" r="12" fill="none" stroke="#1f2f3a" stroke-width="4"/><circle cx="22" cy="44" r="2.5" fill="#1f2f3a"/><circle cx="58" cy="44" r="2.5" fill="#1f2f3a"/><path d="M22 44l12-18h16l8 18M34 26l6 18H22M46 17h8" stroke="#007573" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 20h11" stroke="#1f2f3a" stroke-width="4" stroke-linecap="round"/>'+HL('M14 38a10 10 0 0 1 5-4')};
$('#bdefs').innerHTML=BIBU_DEFS+ILLO_DEFS;
const T=id=>TILES.find(t=>t.id===id);
const illo=id=>`<svg class="illo" viewBox="0 0 80 64" aria-hidden="true"><circle cx="40" cy="34" r="30" fill="${CATS[T(id).cat].bg}"/>${ART[id]}</svg>`;
const hills=`<svg class="hills" viewBox="0 0 400 84" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 84V48l44-16 34 10 50-30 42 24 30-8 56 26 44-22 50 18 50-12v54z" style="fill:var(--tint)"/><g style="fill:var(--tint2)"><path d="M318 70l5-42 5 42z"/><rect x="312" y="68" width="22" height="5" rx="2"/></g><path d="M0 84V62q60-20 120-6t130-6 150-4v38z" style="fill:var(--tint)" opacity=".6"/><g style="fill:var(--tint2)" opacity=".8"><circle cx="36" cy="66" r="9"/><circle cx="50" cy="69" r="7"/><circle cx="372" cy="66" r="8"/></g><path d="M0 84V76q200-14 400 0v8z" style="fill:var(--bg)"/></svg>`;

const REW=[];
let WEEK=1;
const DAYS=['Sen','Sel','Rab','Kam','Jum','Sab','Min'],today=()=>DAYS[(new Date().getDay()+6)%7];
const STG=[[0,'Bibu Kecil'],[250,'Bibu Ceria'],[600,'Bibu Pemberani'],[1000,'Bibu Penjaga Laut']];
const users=[];
const acts=[],trx=[];

const dashboardRole=document.body.dataset.dashboardRole||null;
const dashboardLabels={admin:'Petugas iLitterless',bi:'Bank Indonesia',peserta:'Warga',superadmin:'Super Admin'};
const dashboardPaths={admin:'/petugas/',bi:'/bank-indonesia/',peserta:'/warga/',superadmin:'/super-admin/'};
const S={role:'peserta',account:null,community:[],me:null,auth:'email',tab:'home',form:{email:'',password:'',name:'',loc:'',err:''},busy:false,ready:false,c:null,sheet:null,wa:[],big:false,atab:'antrian',rej:null,speaking:false,help:{q:'',uid:null,tile:null,photo:null},gain:0,biLoc:'all',biWeek:1,offline:false,loading:false};
S.residentFilters=emptyResidentFilters();
S.articles=[];S.articleDraft={body:'',participants:'',occurredOn:'',photo:null,err:''};
async function sync(){
 const data=await api('/bootstrap');S.account=data.account;S.me=data.account.role==='peserta'?data.account.id:null;
 if(data.locations)LOCS=data.locations;if(data.reportLocations)REPORT_LOCS=data.reportLocations;
 const presentation=new Map(users.map(u=>[u.id,{shown:u.shown,lastStg:u.lastStg}]));
 users.splice(0,users.length,...data.users.map(u=>({...u,...presentation.get(u.id),ls:new Set(u.ls)})));
 if(S.me)S.big=!!users.find(u=>u.id===S.me)?.big;
 acts.splice(0,acts.length,...data.acts);trx.splice(0,trx.length,...data.trx);
 S.syncedAt=new Date();S.profileRequired=!!data.profileRequired;S.feed=data.feed||[];
 if(S.me&&!S.profileRequired)S.quiz=await api('/quiz');
 S.articles=data.articles||[];S.curationEmail=data.curationEmail;
 if(data.lessons)LES.splice(0,LES.length,...data.lessons);
 REW.splice(0,REW.length,...data.rewards);S.community=data.community;WEEK=data.week;S.biWeek=Math.min(S.biWeek||WEEK,WEEK);
 if(S.me)for(const q of queued(S.me))acts.push({id:q.clientId,uid:S.me,tile:q.tile,cat:T(q.tile).cat,act:T(q.tile).n,week:WEEK,day:today(),status:'outbox',src:'app',photo:q.photo});
}

const U=id=>users.find(u=>u.id===id);
const mine=uid=>acts.filter(a=>a.uid===uid);
const prog=(uid,m)=>new Set(mine(uid).filter(a=>a.week===WEEK&&a.mission===m.id&&a.status==='verified').map(a=>a.date)).size;
const pend=(uid,m)=>mine(uid).filter(a=>a.week===WEEK&&a.mission===m.id&&a.status==='pending').length;
const mDone=uid=>U(uid).prev+MIS.filter(m=>prog(uid,m)>=m.target).length;
const ver=uid=>mine(uid).filter(a=>a.status==='verified').length;
const kg=uid=>Math.round(trx.filter(t=>t.uid===uid).reduce((s,t)=>s+t.kg,0)*10)/10;
const pts=uid=>U(uid)?.points||0;
const saldo=uid=>U(uid)?.balance||0;
const stg=p=>{let i=0;STG.forEach(([t],k)=>{if(p>=t)i=k});return i};
const weeksActive=uid=>new Set(mine(uid).filter(a=>a.status!=='cancelled').map(a=>a.week)).size;
const fmt=n=>String(n).replace('.',',');
const fmtC=n=>(Math.round(n*10)/10).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1});
const carbonNote=`Perkiraan, dihitung dari berat setoran dengan faktor ${CARBON_SOURCE.name}: daur ulang dibandingkan penimbunan di TPA.`;
const carbonRows=cb=>cb.rows.filter(r=>r.kg>0).map(r=>`<div class="row sp" style="padding:8px 0;border-top:1px solid var(--line)"><span><span class="b">${r.mat}</span> <span class="s">${fmtC(r.kg)} kg × ${fmtC(r.perKg)}</span></span><span class="b">${fmtC(r.co2e)} kg CO₂e</span></div>`).join('');
const first=n=>esc(n.split(' ')[0]);
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),3000)};
const ST={verified:['Sudah dicek','check'],pending:['Sedang dicek','clock'],rejected:['Belum diterima','x'],cancelled:['Dibatalkan','x'],outbox:['Menunggu sinyal','clock']};
const pill=s=>`<span class="pill p-${s}">${ic(ST[s][1])}${ST[s][0]}</span>`;
const head=(t,back='home',attr='data-go')=>`<div class="ihead"><button class="back" ${attr}="${back}" aria-label="Kembali">${ic('back')}</button><h3>${t}</h3></div>`;
const waQ=()=>S.me?U(S.me).wa:S.wa;
const confetti=()=>{if(reduce)return;const c=document.createElement('div');c.className='confetti';c.setAttribute('aria-hidden','true');const cols=['#007573','#2bb5b1','#ffc21a','#3aa3ff','#ff7fa0'];
 c.innerHTML=Array.from({length:34},()=>`<i style="left:${Math.random()*100}%;background:${cols[Math.floor(Math.random()*5)]};animation-delay:${Math.random()*.4}s;animation-duration:${1.3+Math.random()*.9}s"></i>`).join('');$('#phone').append(c);setTimeout(()=>c.remove(),2600)};

/* ---------- sign-in ---------- */
function authScr(){const f=S.form;
 if(S.auth==='verify'||S.auth==='sent')return `<div class="screen">${head('Periksa email Anda','email','data-auth')}<div class="pad"><p>${S.auth==='verify'?'Buka tautan verifikasi pada email Anda untuk mengaktifkan akun. Jika belum menerima, isi email lalu kirim ulang tautan.':'Jika alamat terdaftar, tautan pemulihan dikirim ke email Anda.'} Periksa juga folder spam. Tautan berlaku 15 menit.</p><label class="fld">Alamat email<input type="email" id="aEmail" autocomplete="email" value="${esc(f.email)}"></label>${f.err?`<p class="err" role="alert">${esc(f.err)}</p>`:''}</div><div class="dock"><button type="button" class="btn n w" data-resend ${S.busy?'disabled':''}>${S.busy?'Mengirim…':'Kirim ulang tautan'}</button><button type="button" class="btn link w" data-auth="email">Kembali ke login</button></div></div>`;
 if(S.auth==='forgot'||S.auth==='reset')return `<form class="screen" id="authForm">${head(S.auth==='reset'?'Kata sandi baru':'Lupa kata sandi','email','data-auth')}<div class="pad">${S.auth==='forgot'?`<label class="fld">Alamat email<input type="email" id="aEmail" required autocomplete="email" value="${esc(f.email)}"></label><p class="s">Kami akan mengirim tautan untuk membuat kata sandi baru.</p>`:`<label class="fld">Kata sandi baru<input id="aPassword" type="password" required minlength="10" maxlength="128" autocomplete="new-password"></label><p class="s">Minimal 10 karakter. Setelah berhasil, masuk kembali dengan kata sandi baru.</p>`}${f.err?`<div class="err" role="alert">${esc(f.err)}</div>`:''}</div><div class="dock"><button class="btn n w" type="submit" ${S.busy?'disabled':''}>${S.busy?'Mohon tunggu…':S.auth==='reset'?'Simpan kata sandi':'Kirim tautan pemulihan'}</button></div></form>`;
 const registration=!dashboardRole&&S.auth==='reg';
 return `<form class="screen" id="authForm">${registration?head('Daftar warga','email','data-auth'):`<div class="hero auth-hero"><div class="auth-mascot">${bibu('wave')}</div><h2 class="t1">${dashboardRole?'Masuk '+dashboardLabels[dashboardRole]:'Selamat datang di COBI'}</h2>${!dashboardRole?'<p class="brand-tagline">Community Base Of iLitterless Indonesia</p>':''}<p>${dashboardRole?'Gunakan email dan kata sandi akun '+dashboardLabels[dashboardRole]+'.':'Masuk dengan email untuk mencatat aksi baik Anda.'}</p></div>`}
 <div class="pad">
 ${registration?`<label class="fld">Nama Anda<input id="aName" autocomplete="name" required minlength="2" maxlength="60" value="${esc(f.name)}"></label>`:''}
 <label class="fld">Alamat email<input type="email" id="aEmail" autocomplete="email" required maxlength="254" placeholder="nama@email.com" value="${esc(f.email)}"></label>
 <label class="fld">Kata sandi<input type="password" id="aPassword" autocomplete="${registration?'new-password':'current-password'}" required ${registration?'minlength="10" aria-describedby="passwordHint"':''} maxlength="128" value="${esc(f.password)}"></label>
 ${registration?'<p class="s" id="passwordHint" style="margin:0">Minimal 10 karakter. Setelah mendaftar, verifikasi akun melalui tautan di email Anda.</p>':''}
 ${registration?`<label class="fld">Kelurahan<select id="aLoc" required><option value="">Pilih kelurahan</option>${LOCS.map(l=>`<option ${f.loc===l?'selected':''}>${l}</option>`).join('')}</select></label>`:''}
 ${f.err?`<div class="err" role="alert">${esc(f.err)}</div>`:''}
 </div><div class="dock"><button type="submit" class="btn y w" ${S.busy?'disabled':''}>${S.busy?'Mohon tunggu…':registration?'Daftar akun':'Masuk dengan email'}</button>${dashboardRole?'<p class="s">Akun dashboard diberikan oleh pengelola iLitterless.</p>':`<button type="button" class="btn link w" data-auth="${registration?'email':'reg'}" ${S.busy?'disabled':''}>${registration?'Sudah punya akun? Masuk':'Belum punya akun? Daftar'}</button>`}${registration?'':`<div class="auth-secondary"><button type="button" class="btn link" data-auth="forgot">Lupa kata sandi?</button>${dashboardRole?'':'<button type="button" class="btn link" data-auth="verify">Kirim ulang verifikasi</button>'}</div>`}</div></form>`;
}

function articleCard(article,admin=false){
 const labels={pending:'Menunggu kurasi',verified:'Lolos kurasi',rejected:'Belum diterima'};
 return `<article class="card article-card"><div class="row sp"><span class="pill p-${article.status}">${labels[article.status]}</span><span class="s">${article.status==='verified'?'+'+ARTICLE_POINTS+' poin':''}</span></div>
 ${admin?`<h3>${esc(U(article.uid)?.name||'Warga')}</h3>`:''}<img class="article-proof" src="${esc(article.photo)}" alt="Foto kegiatan untuk kurasi" loading="lazy">
 <p class="s">Tanggal kegiatan: ${esc(article.occurredOn)}</p><details><summary>Baca tulisan dan pihak yang terlibat</summary><p class="article-copy">${esc(article.body)}</p><h3>Pihak yang terlibat</h3><p class="article-copy">${esc(article.participants)}</p></details>
 <p class="s">${article.emailStatus==='sent'?'Email terkirim ke tim iLitterless.':article.emailStatus==='sending'?'Email sedang dikirim.':'Email belum terkirim; pengajuan sudah tersimpan.'}</p>
 ${article.emailStatus!=='sent'?`<button class="btn o sm" data-article-send="${article.id}">Kirim ulang email ke tim</button>`:''}
 ${article.reason?`<p class="err">${esc(article.reason)}</p>`:''}
 ${admin&&article.status==='pending'?`<button class="btn n" data-article-ok="${article.id}" ${article.emailStatus==='sent'?'':'disabled'}>Setujui artikel · +${ARTICLE_POINTS} poin</button><form data-article-review="${article.id}" class="article-form"><label>Alasan penolakan<textarea name="reason" required maxlength="500" rows="2"></textarea></label><button class="btn rd" type="submit">Tolak dengan alasan</button></form>`:''}</article>`;
}
function communityRankingList(groups,ownName){const format=value=>new Intl.NumberFormat('id-ID').format(value);return `<ol class="community-standings">${groups.map(group=>`<li class="community-standing ${group.l.toLowerCase()===ownName.toLowerCase()?'is-own':''}" data-community="${esc(group.l)}"><span class="community-rank" aria-label="${group.rank?'Peringkat '+group.rank:'Belum berperingkat'}">${group.rank||'·'}</span><div><h3>${esc(group.l)}</h3>${group.l.toLowerCase()===ownName.toLowerCase()?'<span class="community-own-label">Komunitas Anda</span>':''}<p class="s">${group.members} anggota · ${group.verified} aksi disetujui</p></div><div class="community-points"><strong>${format(group.points)}</strong><span class="s">poin</span></div></li>`).join('')}</ol>`;}

/* ---------- resident screens ---------- */
const SCR={
home(){const u=U(S.me),p=pts(S.me),i=stg(p),nx=STG[i+1],sd=saldo(S.me),g=S.gain;
 const pose=g>0?'proud':u.mood==='cheer'?'cheer':'wave';
 const say=g>0?`Hore! Poin Anda bertambah ${g}. Terima kasih!`:u.mood==='cheer'?'Tidak apa-apa. Coba foto ulang ya, saya tunggu!':'Yuk, lakukan aksi baik hari ini.';
 return `<div class="hero">${hills}<div class="hrow"><span class="app-wordmark"><strong class="logo">COBI</strong><small>Community Base Of iLitterless Indonesia</small></span><button class="help" data-help>${ic('help')}Bantuan</button></div>
 <div class="hgrid"><div class="txt"><h2 class="t1" style="font-size:var(--fs-xl)">Halo, ${first(u.name)}!</h2><div class="bubble">${say}</div></div><div class="${g>0?'pop':''}">${bibu(pose,{cls:g>0?'':'bob',crown:i>=2})}</div></div></div>
 <div class="pad">
 <button class="mega" data-start><span class="cam">${ic('cam','width:34px;height:34px;color:var(--btn)')}</span><span><span class="h">Catat aksi hari ini</span><small>Foto aksinya, petugas mengecek</small></span></button>
 <div class="card article-entry"><h3>Cerita kegiatan warga</h3><p class="s">Kirim foto dan tulisan ke tim iLitterless. Dapatkan ${ARTICLE_POINTS} poin setelah lolos kurasi.</p><button class="btn o" data-go="artikel">Kirim artikel kegiatan</button></div>
 <div class="pcard"><div class="row sp" style="align-items:flex-start;position:relative"><div><div class="lbl">Poin Anda</div><div class="num" id="ptsNum">${g>0?sd-g:sd}</div></div><button class="btn ghost sm" data-go="hadiah">${ic('gift')}Tukar hadiah</button></div>${g>0?`<span class="gain">+${g}</span>`:''}
 <div style="margin-top:12px;position:relative"><div class="b">${STG[i][1]}</div><div class="lbl">${nx?`${nx[0]-p} poin lagi, Bibu tumbuh jadi ${STG[i+1][1]}`:'Tahap tertinggi'}</div><div class="bar" style="margin-top:8px"><i style="width:${nx?Math.min(100,(p-STG[i][0])/(nx[0]-STG[i][0])*100):100}%"></i></div></div></div>
 ${u.notes.length?`<div class="sec"><h3>Kabar terbaru</h3>${u.notes.slice(0,2).map(n=>`<div class="wabub"><small>COBI</small>${esc(n)}</div>`).join('')}</div>`:''}
 <section class="card home-quiz" aria-labelledby="homeQuizTitle"><h3 id="homeQuizTitle">Kuis minggu ini</h3><p class="s">10 pertanyaan setiap Minggu. Jawaban hanya sekali; hingga 10 poin per minggu.</p><p>${S.quiz?.answered||0}/10 terjawab${S.quiz?.completed?' · Selesai':''}</p><button class="btn n" data-go="kuis">${S.quiz?.completed?'Lihat hasil kuis':'Buka kuis mingguan'}</button></section>

 <section class="sec home-feed"><h3>Kegiatan warga terbaru</h3>${activityFeed(S.feed||[])}</section></div>`},
profil(){return profileForm(U(S.me),S.profileRequired)},
kuis(){return quizScreen(S.quiz)},

catat(){const c=S.c;
 if(c.step===1)return `<div class="screen">${head('Aksi apa yang Anda lakukan?')}<div class="pad"><div class="row"><div style="width:72px;flex:none">${bibu('cool')}</div><p style="margin:0" class="s">Poin diberikan setelah disetujui, satu kali per jenis aksi per hari.</p></div><div class="tiles">${TILES.map(t=>`<button class="tile" data-tile="${t.id}">${illo(t.id)}${t.n}<small class="s">+${DAILY_POINTS[t.id]} poin</small></button>`).join('')}</div></div></div>`;
 const t=T(c.tile);
 if(c.step===2)return `<div class="screen">${head('Foto buktinya',1,'data-step')}<div class="pad">
 <div class="row">${illo(t.id)}<span class="b" style="font-size:var(--fs-l)">${t.n}</span></div>
 <p class="s">Foto kegiatan yang disetujui petugas dapat tampil di Beranda dan kegiatan terbaru.</p>
 <div class="shot">${c.photo?`<img src="${c.photo}" alt="Foto bukti">`:`<div><span class="cam">${ic('cam','width:46px;height:46px')}</span><div class="b" style="font-size:var(--fs-l)">Ketuk untuk memotret</div><div class="s" style="padding:0 16px">${t.hint}</div></div>`}<input type="file" accept="image/*" capture="environment" id="fPhoto" aria-label="Ambil foto bukti"></div>
 ${c.photo?'':`<details class="faq"><summary>Kamera tidak mau terbuka?</summary><ol style="margin:8px 0 0;padding-inline-start:20px;display:grid;gap:6px"><li>Saat HP bertanya izin kamera, pilih <b>Izinkan</b>.</li><li>Jika terlanjur menolak: buka Pengaturan HP, pilih Aplikasi, pilih browser Anda, lalu Izin, Kamera, Izinkan.</li><li>Atau pilih foto yang sudah ada di galeri.</li><li>Tidak bisa juga? Tunjukkan Kartu Bibu ke petugas agar aksi dicatatkan.</li></ol></details>`}</div>
 ${c.photo?(c.sending!=null?`<div class="dock"><div class="b" role="status">Mengirim foto…</div><div class="s">Tunggu sampai server mengonfirmasi penyimpanan.</div></div>`:`<div class="dock"><button class="btn y w" data-submit>${S.offline?'Simpan, kirim saat ada sinyal':'Kirim ke petugas'}</button><button class="btn link w" data-retake>Foto ulang</button></div>`):''}</div>`;
 return `<div class="screen"><div class="pad" style="text-align:center;padding-top:32px"><div style="width:210px;margin:0 auto" class="pop">${bibu('proud')}</div><h2 class="t1">Terima kasih!</h2>
 <p style="font-size:var(--fs-m);margin:0">${c.queued?`Aksi <b>${t.n}</b> tersimpan di perangkat. Buka aplikasi saat koneksi kembali untuk mengirimkannya.`:`Aksi <b>${t.n}</b> sudah tersimpan di server dan menunggu pemeriksaan petugas. Hasilnya muncul di riwayat dan kabar terbaru.`}</p></div>
 <div class="dock"><button class="btn y w" data-go="home">Kembali ke beranda</button><button class="btn link w" data-start>Catat aksi lain</button></div></div>`},
belajar(){const u=U(S.me);return head('Belajar')+`<div class="pad"><div class="row" style="border:1px solid var(--line);border-radius:var(--r-m);padding:12px"><div style="width:100px;flex:none">${bibu('read')}</div><div><div class="b" style="font-size:var(--fs-l)">${LES.filter(lesson=>u.ls.has(lesson.id)).length} dari ${LES.length} materi selesai</div><div class="s">Modul pembelajaran dari tim iLitterless. Kuis mingguan tersedia di menu Kuis.</div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100,LES.filter(lesson=>u.ls.has(lesson.id)).length/Math.max(1,LES.length)*100)}%"></i></div></div></div>
 <div class="list">${LES.map(L=>{const d=u.ls.has(L.id);return `<div style="padding:12px 0;border-top:1px solid var(--line)" class="lrow"><div class="row" style="align-items:flex-start"><span class="cic" style="background:var(--sea)">${ic(L.i)}</span><div style="flex:1"><div class="b" style="font-size:var(--fs-m)">${esc(L.t)}</div><div class="s">${d?'Sudah selesai':L.q?'Modul teks':({video:'Video',powerpoint:'PowerPoint',module:'Modul',text:'Teks manual'}[L.kind]||'Materi')}</div></div>${d?pill('verified').replace('Sudah dicek','Selesai'):''}</div>
 <div class="row" style="margin-top:8px">${!L.kind||L.kind==='text'?`<button class="btn n sm" style="flex:1" data-les="${L.id}" data-listen>${ic('sound')}Dengarkan</button>`:''}<button class="btn o sm" style="flex:1" data-les="${L.id}">${ic('book')}Buka materi</button></div></div>`}).join('').replace('border-top:1px solid var(--line)','border-top:0')}</div></div>`},
hadiah(){const u=U(S.me),sd=saldo(S.me);return head('Tukar hadiah')+`<div class="pad"><div class="pcard" style="display:grid;grid-template-columns:1fr 90px;align-items:center"><div style="position:relative"><div class="lbl">Poin yang bisa ditukar</div><div class="num">${sd}</div><div class="lbl" style="margin-top:4px">Menukar poin tidak mengurangi pertumbuhan Bibu.</div></div>${bibu('happy')}</div>
 <div class="list">${REW.map(r=>`<div class="rw"><span class="cic" style="background:var(--btn);width:56px;height:56px">${ic('gift','width:28px;height:28px')}</span><div><div class="b" style="font-size:var(--fs-m)">${esc(r.n)}</div><div class="s">${r.p} poin · Stok ${r.stock}</div></div><button class="btn ${sd>=r.p&&r.stock?'n':'o'} sm" data-rew="${r.id}" ${sd>=r.p&&r.stock?'':'disabled'}>${!r.stock?'Stok habis':sd>=r.p?'Tukar':`Kurang ${r.p-sd}`}</button></div>`).join('')}</div>
 ${u.vouchers.length?`<div class="sec"><h3>Kupon saya</h3>${u.vouchers.map(v=>`<div class="vch"><div class="s">${esc(v.n)} · ${v.redeemed?'Sudah digunakan':'Tunjukkan ke petugas'}</div><div class="code">${v.code}</div></div>`).join('')}</div>`:''}
 <p class="s" style="margin:0">Hadiah dapat ditukar selama stok tersedia. Petugas memverifikasi kupon saat pengambilan.</p></div>`},
artikel(){
 const draft=S.articleDraft,todayDate=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
 return head('Artikel kegiatan')+`<div class="pad article-layout"><form id="articleForm" class="card article-form">
 <div class="row"><div style="width:72px;flex:none">${bibu('idea')}</div><h2>Ceritakan kegiatan Anda</h2></div><p class="s">Foto dan tulisan dikirim ke ${esc(S.curationEmail||'tim iLitterless')} untuk dikurasi. ${ARTICLE_POINTS} poin diberikan setelah artikel disetujui.</p>
 <label class="fld">Foto kegiatan<input id="articlePhoto" type="file" accept="image/jpeg,image/png,image/webp" ${draft.photo?'':'required'}></label>${draft.photo?`<img class="article-proof" src="${draft.photo}" alt="Foto kegiatan yang akan dikirim">`:''}
 <label class="fld">Tulisan kegiatan<textarea id="articleBody" minlength="50" maxlength="12000" rows="7" required placeholder="Ceritakan kegiatan dan dampaknya, minimal 50 karakter.">${esc(draft.body)}</textarea></label>
 <label class="fld">Pihak yang terlibat<textarea id="articleParticipants" maxlength="2000" rows="3" required placeholder="Warga, komunitas, organisasi, atau pihak lain yang terlibat.">${esc(draft.participants)}</textarea></label>
 <label class="fld">Kapan kegiatan terjadi?<input id="articleDate" type="date" max="${todayDate}" required value="${esc(draft.occurredOn)}"></label>
 ${draft.err?`<p class="err" role="alert">${esc(draft.err)}</p>`:''}<button class="btn n" type="submit" ${draft.busy?'disabled':''}>${draft.busy?'Mengirim ke tim…':'Kirim ke tim iLitterless'}</button>
 </form><section class="sec"><h2>Pengajuan saya</h2>${S.articles.length?S.articles.slice().reverse().map(article=>articleCard(article)).join(''):'<p class="card s">Belum ada artikel yang diajukan. Lengkapi formulir untuk mengirim cerita kegiatan pertama Anda.</p>'}</section></div>`;
},
komunitas(){
 const user=U(S.me),own=S.community.find(group=>group.l.toLowerCase()===communityOf(user).toLowerCase());
 if(!own)return head('Komunitas')+'<div class="pad"><p role="status">Data komunitas belum tersedia. Muat ulang halaman untuk mencoba lagi.</p></div>';
 const format=value=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(value);
 const contribution=pts(S.me),percent=own.points?contribution/own.points*100:0;
 const latest=(S.feed||[]).filter(item=>item.community?.toLowerCase()===own.l.toLowerCase());
 return head('Komunitas')+`<div class="pad community-layout">
 <section class="community-welcome" aria-labelledby="communityWelcomeTitle"><div><span class="community-eyebrow">Bergerak bersama</span><h2 id="communityWelcomeTitle">Hai, ${first(user.name)}. Aksimu berarti bagi komunitas.</h2><p>${contribution?`${format(contribution)} poin Anda ikut membangun pencapaian ${esc(own.l)}.`:'Mulai satu aksi hari ini. Kontribusi Anda akan menambah poin bersama.'}</p><div class="community-pulse"><span>${ic('community')} ${format(own.members)} anggota</span><span>${ic('check')} ${format(own.verified)} aksi disetujui</span></div></div><div class="community-greeting-mascot">${bibu(contribution?'proud':'wave')}</div></section>
 <section class="card community-overview" aria-labelledby="myCommunityTitle">
  <div class="community-card-heading"><div><div class="s">Komunitas Anda</div><h2 id="myCommunityTitle">${esc(own.l)}</h2></div><span class="community-position">${own.rank?'#'+own.rank:'Mulai bersama'}</span></div>
  <p class="s">Komunitas mengikuti asal yang Anda isi pada profil. Kelompok kelurahan tetap tersedia untuk peserta yang belum mencantumkan komunitas.</p>
  <div class="community-score" data-community-score>${format(own.points)}</div><div class="b">Total poin bersama</div>
  <div class="community-meta"><span>${own.members} anggota</span><span>${own.rank?'Peringkat '+own.rank:'Belum berperingkat'}</span></div>
  <div class="community-contribution"><div class="row sp"><span class="b">Kontribusi Anda</span><span data-community-contribution>${format(contribution)} poin</span></div><div class="bar"><i style="width:${Math.min(100,percent)}%"></i></div><p class="s">${format(percent)}% dari total poin komunitas.</p></div>
  <button class="btn n w" data-start>Tambah kontribusi lewat aksi</button>
 </section>
 <section class="sec community-leaderboard" aria-labelledby="communityRankingTitle">
  <h2 id="communityRankingTitle">Peringkat komunitas</h2><p class="s">Akumulasi poin yang diperoleh seluruh anggota sejak awal program.</p>
  ${communityRankingList(S.community,communityOf(user))}
  ${S.community.every(group=>!group.points)?'<p class="community-empty" role="status">Belum ada poin komunitas. Mulai dari satu aksi atau selesaikan materi belajar untuk berkontribusi.</p>':''}
  <p class="s">Poin bertambah dari aksi harian, belajar, setoran, kuis mingguan, dan artikel yang lolos kurasi. Penukaran hadiah tidak mengurangi total ini. Poin sama mendapat peringkat sama; komunitas tanpa poin belum berperingkat. Nama dan email anggota lain tidak ditampilkan.</p>
 </section>
 <section class="community-activity-section"><div class="home-ranking-heading"><div><h2>Aksi terbaru komunitas</h2><p class="s">${S.syncedAt?'Diperbarui '+new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(S.syncedAt)+' WIB.':'Kegiatan yang telah diperiksa petugas.'}</p></div><button type="button" class="btn o sm" data-refresh-community>Perbarui komunitas</button></div>${latest.length?activityFeed(latest):`<div class="card community-first-action"><div class="community-small-mascot">${bibu('idea')}</div><div><h3>Setiap aksi punya tempat di sini.</h3><p class="s">Belum ada aksi ${esc(own.l)} di daftar kegiatan terbaru. Aksi yang disetujui petugas bisa tampil pada daftar ini.</p><button class="btn n sm" data-start>Catat aksi bersama Bibu</button></div></div>`}</section></div>`;
},
saya(){const u=U(S.me),p=pts(S.me),my=mine(S.me).slice().reverse();
 const community=S.community.find(group=>group.l.toLowerCase()===communityOf(u).toLowerCase());
 const B=[['Langkah pertama',ver(S.me)>=1,'leaf'],['Rajin belajar',LES.length>0&&LES.every(lesson=>u.ls.has(lesson.id)),'book'],['Konsisten 3 minggu',weeksActive(S.me)>=3,'clock'],['Aktif beraksi',ver(S.me)>=3,'trophy']];
 return head('Saya')+`<div class="pad profile-layout"><div class="profile-primary"><div class="idcard"><div style="align-self:start"><div class="row" style="gap:4px"><span class="mini">${bibu('happy',{crown:stg(p)>=2})}</span><span style="font-size:var(--fs-s);opacity:.9">Kartu Bibu</span></div><div class="b" style="font-size:var(--fs-l);line-height:1.2;margin-top:2px">${esc(u.name)}</div><div style="opacity:.85;font-size:var(--fs-s)">${esc(u.loc)}</div><div class="id" style="margin-top:8px">${u.bibu}</div></div><div class="qr" id="qr" aria-label="Kode QR Kartu Bibu"></div></div>
 <p class="s" style="margin:-4px 0 0">Tunjukkan kartu ini ke petugas agar aksi Anda bisa dicatatkan.</p>
<section class="card profile-details"><div class="row sp"><h3>Profil lengkap</h3><button class="btn o sm" data-go="profil">Edit profil</button></div><dl><div><dt>Asal</dt><dd>${esc(originLabels[u.profile?.originType]||'Belum diisi')}</dd></div><div><dt>Nama asal</dt><dd>${esc(u.profile?.originName||'—')}</dd></div><div><dt>No. WhatsApp</dt><dd>${esc(u.profile?.whatsapp||u.phone||'—')}</dd></div><div><dt>Kecamatan</dt><dd>${esc(u.profile?.district||'—')}</dd></div><div><dt>Kota / Kabupaten</dt><dd>${esc(u.profile?.city||'—')}</dd></div></dl></section> <div class="card"><div class="b">Komunitas ${esc(communityOf(u))}</div><p class="s">${community?.points||0} poin bersama · ${community?.rank?'Peringkat '+community.rank:'Belum berperingkat'}</p><button class="btn o sm" data-go="komunitas">Lihat komunitas</button></div>
 ${(()=>{const T=trx.filter(t=>t.uid===S.me);if(!T.length)return '';const cb=carbonByMaterial(T);return `<div class="sec"><h3>Dampak setoran Anda <small>${fmtC(cb.kg)} kg</small></h3><div class="card"><div class="s">Emisi yang dihindari</div><div class="b" style="font-size:var(--fs-2xl);color:var(--sea)">${fmtC(cb.total)} <span class="s">kg CO₂e</span></div>${carbonRows(cb)}<p class="s" style="margin:8px 0 0">${carbonNote}</p></div></div>`})()}
</div><div class="profile-secondary"> <div class="sec"><h3>Riwayat aksi <small>${my.length} aksi</small></h3><div class="list">${my.length?my.slice(0,6).map(a=>`<div class="ch">${illo(a.tile)}<span><span class="b" style="display:block;font-size:var(--fs-m)">${a.act}</span><span class="s" style="display:block">Minggu ${a.week} · ${a.day}${a.src==='petugas'?' · dicatat petugas':''}${a.reason?` · ${esc(a.reason)}`:''}</span><span style="display:block;margin-top:4px">${pill(a.status)}</span></span><span></span></div>`).join(''):'<div class="s" style="padding:12px 0">Belum ada aksi. Yuk mulai dari tombol hijau besar di beranda.</div>'}</div></div>
 <div class="sec"><h3>Lencana</h3><div class="bdg">${B.map(([n,ok,ii])=>`<div class="bd ${ok?'':'lk'}"><span class="m">${ic(ii,'width:26px;height:26px')}</span>${n}</div>`).join('')}</div></div>

 <div class="sec"><h3>Ukuran tulisan</h3><div class="seg"><button data-size="0" class="${S.big?'':'on'}">Normal</button><button data-size="1" class="${S.big?'on':''}" style="font-size:var(--fs-l)">Besar</button></div></div>
</div><div class="profile-actions"><button class="btn wa" data-help>${ic('chat')}Tanya petugas</button><button class="btn o" data-logout>Keluar</button></div></div>`}};

function videoWatchURL(embed){try{const url=new URL(embed);if(url.hostname==='www.youtube-nocookie.com')return 'https://www.youtube.com/watch?v='+encodeURIComponent(url.pathname.split('/').at(-1));if(url.hostname==='player.vimeo.com')return 'https://vimeo.com/'+encodeURIComponent(url.pathname.split('/').at(-1));}catch{}return '#';}
function sheet(){const sh=S.sheet;if(!sh)return '';
 if(sh.t==='grow')return `<div class="sheet"><div style="text-align:center"><div style="width:190px;margin:0 auto" class="pop">${bibu('proud',{crown:sh.i>=2})}</div><h2 class="t1">Bibu tumbuh!</h2><p>Sekarang Bibu menjadi <b>${STG[sh.i][1]}</b>${sh.i>=2?' dan mendapat mahkota daun':''}. Terima kasih sudah rajin beraksi.</p><button class="btn y w" data-close>Lanjut</button></div></div>`;
 if(sh.t==='help')return `<div class="sheet" data-bg><div><div class="row sp"><h2 class="t1" style="font-size:var(--fs-xl)">Bantuan</h2><button class="back" data-close aria-label="Tutup">${ic('x')}</button></div>
 <div class="row" style="border:1px solid var(--line);border-radius:var(--r-m);padding:8px"><div style="width:80px;flex:none">${bibu('happy')}</div><p style="font-size:var(--fs-m)">Butuh bantuan? Datangi petugas COBI di kelurahan Anda. Tunjukkan Kartu Bibu agar petugas dapat membantu pencatatan.</p></div>
 <div>${[['Bagaimana cara mencatat aksi?','Tekan "Catat aksi hari ini", pilih gambar aksi, lalu unggah foto.'],['Di mana hasil pemeriksaan?','Lihat Riwayat aksi di menu Saya atau Kabar terbaru di Beranda.'],['Saya tidak bisa memotret. Bagaimana?','Tunjukkan Kartu Bibu di menu Saya ke petugas. Petugas akan mencatatkan aksi Anda.'],['Poin bisa ditukar dengan apa?','Buka Hadiah. Kupon yang didapat ditunjukkan ke petugas saat pengambilan.']].map(([q,a])=>`<details class="faq"><summary>${q}</summary><p style="margin-top:4px;font-size:var(--fs-m)">${a}</p></details>`).join('')}</div></div></div>`;
 if(sh.t==='rew'){const r=REW.find(x=>x.id===sh.id);return `<div class="sheet" data-bg><div>${sh.code?`<div style="width:130px;margin:0 auto" class="pop">${bibu('proud')}</div><h2 class="t1" style="font-size:var(--fs-xl);text-align:center">Kupon berhasil dibuat</h2><div class="vch"><div class="s">${r.n}</div><div class="code">${sh.code}</div></div><p>Tunjukkan kode ini ke petugas atau toko mitra. Kupon tersimpan di halaman Tukar hadiah.</p><button class="btn n w" data-close>Selesai</button>`
  :`<h2 class="t1" style="font-size:var(--fs-xl)">Tukar ${r.p} poin dengan ${r.n}?</h2><p>Sisa poin Anda nanti: <b>${saldo(S.me)-r.p}</b>.</p><button class="btn y w" data-redeem="${r.id}">Ya, tukar</button><button class="btn link w" data-close>Batal</button>`}</div></div>`}
 const L=LES.find(l=>l.id===sh.id),q=L.q,pdf=isPDFMaterial(L);
 return `<div class="sheet ${pdf?'lesson-pdf':''}" data-bg><div><div class="row sp"><span class="s">Materi iLitterless</span><button class="back" data-close aria-label="Tutup">${ic('x')}</button></div><h2 class="t1" style="font-size:var(--fs-xl)">${esc(L.t)}</h2>
 ${pdf?pdfReaderUI(L):L.kind==='video'?(L.videoEmbed?`<iframe class="lesson-video" referrerpolicy="strict-origin-when-cross-origin" src="${esc(L.videoEmbed)}" title="${esc(L.t)}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`:`<video class="lesson-video" src="/api/material-files/${L.fileId}" controls preload="metadata"></video>`):L.fileId?`<a class="btn n" href="/api/material-files/${L.fileId}" target="_blank" rel="noopener">Buka / unduh ${L.kind==='powerpoint'?'PowerPoint':'modul'}: ${esc(L.fileName)}</a>`:`<button class="btn ${S.speaking?'rd':'n'} w" data-speak="${L.id}">${ic('sound')}${S.speaking?'Berhenti':'Dengarkan materi'}</button>`}
 ${L.videoEmbed?`<p><a class="btn o sm" href="${esc(videoWatchURL(L.videoEmbed))}" target="_blank" rel="noopener">${L.videoEmbed.includes('youtube-nocookie.com')?'Tonton di YouTube':'Tonton di Vimeo'}</a></p>`:''}
 ${L.body.map(p=>`<p class="article-copy">${esc(p)}</p>`).join('')}
 ${q?`<div style="border:1px solid var(--line);border-radius:var(--r-m);padding:12px"><div class="b" style="font-size:var(--fs-m)">${esc(q.q)}</div>${q.o.map((o,oi)=>{let c=sh.ans===oi?'sel':'';if(sh.checked&&sh.ans===oi)c=oi===q.a?'ok':'bad';return `<button class="opt ${c}" data-ans="${oi}">${esc(o)}</button>`}).join('')}</div>
 ${sh.checked&&!sh.pass?'<div class="err">Belum tepat. Coba pilih jawaban lain.</div>':''}
 <button class="btn y w" data-check ${sh.ans==null?'disabled':''}>Periksa jawaban</button>`:`<button class="btn n" data-complete="${L.id}" ${U(S.me).ls.has(L.id)?'disabled':''}>${U(S.me).ls.has(L.id)?'Materi sudah selesai':'Sudah saya pelajari · +20 poin'}</button>`}</div></div>`}

function countUp(el,from,to){if(reduce||!el){if(el)el.textContent=to;return}const t0=performance.now(),d=1000;
 const step=t=>{const k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3);el.textContent=Math.round(from+(to-from)*e);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
function renderP(){pdfCleanup();pdfCleanup=()=>{};if(S.me&&S.profileRequired)S.tab='profil';const ph=$('#phone');
 ph.dataset.screen=S.tab;
 $('#scr').dataset.screen=S.tab;
 document.body.classList.toggle('resident-signed-in',!!S.me);
 const welcome=$('#desktop-bibu');if(welcome&&!welcome.firstChild)welcome.innerHTML=bibu('wave');
ph.classList.toggle('noauth',!S.me);ph.classList.toggle('big',S.big);
 if(!S.me){$('#scr').innerHTML=authScr();$('#tabbar').innerHTML='';$('#sheet').innerHTML=''}
 else{const u=U(S.me),sd=saldo(S.me),i=stg(pts(S.me));
  if(u.shown==null)u.shown=sd;if(u.lastStg==null)u.lastStg=i;
  S.gain=S.tab==='home'&&sd>u.shown?sd-u.shown:0;
  if(!S.sheet&&i>u.lastStg&&S.tab==='home'){u.lastStg=i;S.sheet={t:'grow',i}}
  if(S.loading){$('#scr').innerHTML=`<div class="pad" aria-busy="true" aria-label="Memuat"><div class="sk" style="height:24px;width:40%"></div><div class="sk" style="height:40px;width:70%"></div><div class="sk" style="height:100px"></div><div class="sk" style="height:150px"></div><div class="sk" style="height:200px"></div></div>`;$('#sheet').innerHTML='';$('#tabbar').innerHTML='';netBar();return}
  $('#scr').innerHTML=SCR[S.tab]();$('#sheet').innerHTML=sheet();
  const reader=$('[data-pdf-reader]');if(reader)import('./pdf-reader.js').then(({mountPDF})=>{if(reader.isConnected)pdfCleanup=mountPDF(reader);}).catch(()=>{if(reader.isConnected)reader.querySelector('[data-pdf-status]').textContent='Pembaca PDF tidak dapat dimuat. Buka berkas melalui tombol di bawah.';});
  {const sh=$('#sheet .sheet');if(sh){sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');const h=sh.querySelector('h2');if(h){h.id='shT';h.tabIndex=-1;sh.setAttribute('aria-labelledby','shT');if(S.focused!==S.sheet){S.focused=S.sheet;h.focus({preventScroll:true})}}}}
  if(S.gain>0){countUp($('#ptsNum'),sd-S.gain,sd);confetti();u.mood=null}
  if(S.tab==='home')u.shown=sd;
  const tabs=[['home','home','Beranda'],['belajar','book','Belajar'],['komunitas','community','Komunitas'],['hadiah','gift','Hadiah'],['saya','user','Saya']];
  $('#tabbar').hidden=!!S.profileRequired;$('#tabbar').innerHTML=S.profileRequired?'':tabs.map(([k,ii,n])=>`<button data-go="${k}" class="${S.tab===k||(['catat','artikel'].includes(S.tab)&&k==='home')||(S.tab==='profil'&&k==='saya')?'on':''}" ${S.tab===k?'aria-current="page"':''}>${ic(ii)}${n}</button>`).join('');
  const q=$('#qr');
  if(q){
   const canvas=document.createElement('canvas');q.append(canvas);
   QRCode.toCanvas(canvas,u.bibu,{width:160,margin:2,color:{dark:'#11181c',light:'#ffffff'}})
    .catch(()=>{q.textContent=u.bibu;});
  }}
 netBar();const wq=waQ();$('#wa').innerHTML=wq.length?`<button class="wa-b" data-wab><span class="wi">${ic('chat')}</span><span><small>WhatsApp · COBI · baru saja</small><span>${esc(wq[0])}</span></span></button>`:''}

/* ---------- staff ---------- */
function renderA(){const q=acts.filter(a=>a.status==='pending'),tot=Math.round(trx.reduce((s,t)=>s+t.kg,0)*10)/10,h=S.help;
 let body='';
 if(S.atab==='antrian')body=q.length?`<div class="q">${q.map(a=>`<article class="card"><img src="${a.photo}" alt="Bukti ${a.act}"><div class="row sp"><span class="b">${esc(U(a.uid).name)}</span>${pill('pending')}</div><div class="s">${U(a.uid).bibu} · ${U(a.uid).loc} · Minggu ${a.week} · ${a.day}</div>
  <div class="row">${illo(a.tile)}<div><div class="b">${a.act}</div><div class="s">${a.mission?'Tantangan: '+MIS.find(m=>m.id===a.mission).t:'Aksi bebas'}</div></div></div>
  ${S.rej===a.id?`<label>Alasan penolakan<select id="rej-${a.id}"><option>Foto kurang jelas</option><option>Foto tidak sesuai aksi</option><option>Foto sama dengan laporan lain</option></select></label><div class="row"><button class="btn rd sm" style="flex:1" data-no="${a.id}">Ya, tolak</button><button class="btn o sm" style="flex:1" data-rejc>Batal</button></div>`
   :`<div class="row"><button class="btn gr sm" style="flex:1" data-ok="${a.id}">${ic('check')}Setujui</button><button class="btn o sm" style="flex:1" data-rej="${a.id}">Tolak…</button></div>`}</article>`).join('')}</div>`:'<div class="card empty">Semua aksi sudah dicek. Antrian kosong.</div>';
 if(S.atab==='bantu'){const sel=h.uid&&U(h.uid);
  body=`<div class="two"><div class="card" style="display:grid;gap:12px;align-content:start"><div class="b" style="font-size:var(--fs-m)">1. Pilih warga</div>
  <p class="s" style="margin:0">Cari warga menggunakan nama atau ID pada Kartu Bibu.</p>
  <label>Atau cari nama / Bibu ID<input type="search" id="hq" value="${esc(h.q)}" placeholder="Contoh: Ayu atau BIBU-LWK-0002"></label><div class="who" id="who"></div>
  ${sel?`<div class="row" style="background:var(--soft);border-radius:var(--r-s);padding:8px 12px">${ic('user','width:28px;height:28px')}<div><div class="b">${esc(sel.name)}</div><div class="s">${sel.bibu} · ${sel.loc}</div></div></div>`:'<div class="s">Belum ada warga dipilih.</div>'}</div>
  <div class="card" style="display:grid;gap:12px;align-content:start"><div class="b" style="font-size:var(--fs-m)">2. Aksi yang dilakukan warga</div><div class="tiles">${TILES.map(t=>`<button class="tile ${h.tile===t.id?'on':''}" data-htile="${t.id}">${illo(t.id)}${t.n}</button>`).join('')}</div>
  <label>3. Foto (opsional)<input type="file" accept="image/*" capture="environment" id="hPhoto"></label>
  <button class="btn gr" data-hsave ${sel&&h.tile?'':'disabled'}>${ic('check')}Simpan sebagai sudah dicek</button>
  <div class="s">Aksi yang dicatat petugas langsung dianggap sudah dicek dan ditandai "dibantu petugas" di laporan, terpisah dari catatan mandiri warga.</div></div></div>`}
 if(S.atab==='trx')body=`<div class="two"><form class="card" id="trxf" style="display:grid;gap:12px;align-content:start"><div class="b" style="font-size:var(--fs-m)">Catat setoran Bank Sampah (BSIL)</div>
  <label>Warga<select id="tU">${users.filter(user=>!user.deletedAt).map(x=>`<option value="${x.id}">${x.bibu} · ${esc(x.name)}</option>`).join('')}</select></label>
  <label>Material<select id="tM"><option>Plastik</option><option>Kertas</option><option>Logam</option><option>Kaca</option></select></label>
  <label>Berat (kg)<input type="number" id="tK" min="0.1" max="100" step="0.1" value="1.0"></label>
  <div class="s" id="tCO2" aria-live="polite">Perkiraan emisi dihindari: <b>${fmtC(co2e('Plastik',1))} kg CO₂e</b></div>
  <button class="btn n sm" type="submit">Simpan setoran</button><div class="s">+30 poin per setoran untuk warga.</div></form>
  <div class="card"><div class="b" style="margin-bottom:4px">Setoran terbaru</div><div class="scroll"><table class="stack"><thead><tr><th>Warga</th><th>Material</th><th>Minggu</th><th class="r">Berat</th><th class="r">CO₂e dihindari</th></tr></thead><tbody>${trx.slice(-10).reverse().map(t=>`<tr><td>${esc(U(t.uid).name)}</td><td>${t.mat}</td><td>${t.week}</td><td class="r">${fmt(t.kg)} kg</td><td class="r">${fmtC(co2e(t.mat,t.kg))} kg</td></tr>`).join('')}</tbody></table></div></div></div>`;
 if(S.atab==='peserta')body=`<form id="residentForm" class="card" style="display:grid;gap:12px;margin-bottom:24px"><h2>Daftar warga tanpa akun</h2><p class="s">Untuk warga yang dibantu petugas. Profil ini tidak memiliki login email.</p><label>Nama warga<input name="name" minlength="2" maxlength="60" required></label><label>Kelurahan<select name="loc">${LOCS.map(l=>`<option>${l}</option>`).join('')}</select></label><button class="btn n" type="submit">Daftarkan warga</button></form><div class="card">${residentFiltersUI(users.filter(user=>!user.deletedAt),S.residentFilters)}<div class="scroll" style="margin-top:8px"><table class="stack"><thead><tr><th>Bibu ID</th><th>Nama</th><th>Asal</th><th>Kecamatan</th><th>Kota / Kabupaten</th><th>Kelurahan</th><th class="r">Poin</th><th class="r">Sudah dicek</th><th class="r">Dibantu petugas</th><th class="r">BSIL</th><th class="r">Minggu aktif</th></tr></thead><tbody id="ptab"></tbody></table></div></div>`;
 if(S.atab==='hadiah')body=`<div class="two"><div class="card"><h2>Stok hadiah</h2><p class="s">Aktifkan stok hanya untuk hadiah yang tersedia.</p>${REW.map(r=>`<form class="stock-form row" data-stock="${r.id}" style="margin-top:16px"><label style="flex:1">${esc(r.n)} · ${r.p} poin<input name="stock" aria-label="Stok ${esc(r.n)}" type="number" min="0" max="100000" value="${r.stock}" required></label><button class="btn n sm" type="submit">Simpan</button></form>`).join('')}</div><form class="card" id="voucherForm" style="display:grid;gap:16px;align-content:start"><h2>Serahkan hadiah</h2><label>Kode kupon<input name="code" placeholder="BBB-…" required></label><button class="btn n" type="submit">Tandai kupon digunakan</button><p class="s">Periksa kode kupon dan hadiah sebelum mengonfirmasi penyerahan.</p></form></div>`;
 if(S.atab==='kegiatan')body=activityManagementUI(S);
 if(S.atab==='artikel')body=`<p class="s">Periksa foto, tulisan, pihak terlibat, dan tanggal kejadian. Poin ${ARTICLE_POINTS} hanya untuk artikel yang lolos kurasi.</p><div class="q">${S.articles.length?S.articles.slice().reverse().map(article=>articleCard(article,true)).join(''):'<p class="card s">Belum ada pengajuan artikel.</p>'}</div>`;
 if(S.atab==='kuis')body=quizAdminForm(S.quizAdmin);
 if(S.atab==='belajar')body=`<div class="two"><form id="materialForm" class="card material-form article-form"><h2>Tambah materi belajar</h2><label>Judul materi<input name="title" minlength="3" maxlength="160" required></label><label>Jenis materi<select name="kind" id="materialKind"><option value="text">Teks manual</option><option value="video">Video</option><option value="powerpoint">PowerPoint</option><option value="module">Modul PDF / Word</option></select></label><label>Isi teks / ringkasan<textarea name="body" rows="8" maxlength="30000" minlength="20" required></textarea></label><label data-material-file hidden>Berkas materi (maksimal 50 MB)<input type="file" id="materialFile" accept=".mp4,.ppt,.pptx,.pdf,.doc,.docx"></label><label data-material-url hidden>Tautan video YouTube / Vimeo (jika tidak unggah MP4)<input name="videoUrl" type="url" placeholder="https://…"></label><p class="s">Materi yang diterbitkan langsung tersedia untuk warga. Materi baru dapat ditandai selesai oleh warga; +20 poin hanya sekali.</p><button class="btn n" type="submit">Terbitkan materi</button></form><section class="sec" id="materialManagerPanel">${materialManagementUI(S)}</section></div>`;
 $('#v-admin').innerHTML=`<section class="band phead"><div class="wrap"><div class="dashboard-intro"><div><span class="chip">Dashboard Petugas iLitterless</span><h1 style="margin-top:8px">${q.length} aksi warga menunggu dicek</h1><p class="s">Kelola verifikasi, kurasi artikel, materi belajar, setoran BSIL, serta hadiah warga.</p></div><div class="dashboard-bibu">${bibu('idea')}</div></div>
 <div class="kpis">${[['Menunggu dicek',q.length],['Warga terdaftar',users.length],['Aksi sudah dicek',acts.filter(a=>a.status==='verified').length],['Dibantu petugas',acts.filter(a=>a.src==='petugas'&&a.status!=='cancelled').length],['Setoran BSIL',fmt(tot)+' kg']].map(([k,v])=>`<div class="card kpi"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div></div></section>
 <section class="band" style="padding-top:16px"><div class="wrap"><div class="tabs">${[['antrian',`Antrian cek (${q.length})`],['kegiatan','Kelola kegiatan'],['artikel','Kurasi artikel'],['kuis','Kelola kuis'],['belajar','Kelola belajar'],['bantu','Bantu catat warga'],['trx','Setoran BSIL'],['peserta','Database warga'],['hadiah','Hadiah & kupon']].map(([k,v])=>`<button data-atab="${k}" class="${S.atab===k?'on':''}">${v}</button>`).join('')}<a class="btn o sm" href="/api/reports/export" download>Unduh laporan CSV</a></div>${body}</div></section>`;
 if(S.atab==='peserta')ptab();if(S.atab==='bantu')who()}
function residentProfileDetails(user){const p=user.profile||{},fields=[['Nama',user.name],['Email',user.email||'Tanpa akun email'],['WhatsApp',p.whatsapp||user.phone||'Belum diisi'],['Jenis asal',originLabels[p.originType]||'Belum diisi'],['Nama asal',p.originName||'Belum diisi'],['Kelurahan',user.loc],['Kecamatan',p.district||'Belum diisi'],['Kota / Kabupaten',p.city||'Belum diisi'],['Status profil',p.completedAt?'Lengkap':'Belum lengkap']];return `<details class="resident-profile-details"><summary>Lihat profil</summary><dl>${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></details>`;}
function ptab(query){if(query!==undefined)S.residentFilters.q=query;const filtered=filterResidents(users,S.residentFilters);$('#residentFilterCount').textContent=`Menampilkan ${filtered.length} dari ${users.filter(user=>!user.deletedAt).length} warga`;
 $('#ptab').innerHTML=filtered.map(u=>`<tr><td>${esc(u.bibu)}</td><td>${esc(u.name)}${residentProfileDetails(u)}</td><td>${esc(originLabels[u.profile?.originType]||'Belum diisi')}${u.profile?.originName?`<br><span class="s">${esc(u.profile.originName)}</span>`:''}</td><td>${esc(u.profile?.district||'—')}</td><td>${esc(u.profile?.city||'—')}</td><td>${esc(u.loc)}</td><td class="r">${pts(u.id)}</td><td class="r">${ver(u.id)}</td><td class="r">${mine(u.id).filter(a=>a.src==='petugas'&&a.status!=='cancelled').length}</td><td class="r">${fmt(kg(u.id))} kg</td><td class="r">${weeksActive(u.id)}</td></tr>`).join('')||'<tr><td colspan="11">Tidak ada warga yang sesuai filter. Ubah pilihan atau reset filter.</td></tr>';
}

function who(){const f=S.help.q.trim().toLowerCase();$('#who').innerHTML=f?users.filter(u=>!u.deletedAt&&(u.name+u.bibu).toLowerCase().includes(f)).slice(0,6).map(u=>`<button data-huser="${u.id}" class="${S.help.uid===u.id?'on':''}"><span>${esc(u.name)}</span><span class="s">${u.bibu}</span></button>`).join('')||'<div class="s">Tidak ditemukan.</div>':''}

/* ---------- Bank Indonesia ---------- */
const pc=(a,b)=>b?Math.round(a/b*100):0;
const inLoc=uid=>S.biLoc==='all'||U(uid).loc===S.biLoc;
function wk(w){const US=users.filter(u=>inLoc(u.id)),reg=US.filter(u=>u.reg<=w),A=acts.filter(a=>a.week<=w&&inLoc(a.uid)&&a.status!=='outbox'&&a.status!=='cancelled'),TR=trx.filter(t=>t.week<=w&&inLoc(t.uid)),act=reg.filter(u=>A.some(a=>a.uid===u.id));
 const V=A.filter(a=>a.status==='verified').length,R=A.filter(a=>a.status==='rejected').length;
 const cons=act.filter(u=>new Set(A.filter(a=>a.uid===u.id).map(a=>a.week)).size>=2).length;
 return{reach:reg.length,act:pc(act.length,reg.length),actN:act.length,eng:new Set(acts.filter(a=>a.week===w&&inLoc(a.uid)&&a.status!=='outbox'&&a.status!=='cancelled').map(a=>a.uid)).size,ver:pc(V,V+R),V,P:A.filter(a=>a.status==='pending').length,cons:pc(cons,act.length),consN:cons,kg:Math.round(TR.reduce((s,t)=>s+t.kg,0)*10)/10,trx:TR.length,A,TR}}
const spark=(vals,sel)=>{const mx=Math.max(...vals),mn=Math.min(...vals),r=mx-mn||1,pt=vals.map((v,i)=>[i*100/Math.max(1,vals.length-1),26-(v-mn)/r*22]);
 return `<svg class="spk" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pt.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--sea)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>${pt.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${i===sel?3.2:2}" fill="${i===sel?'var(--sea)':'var(--card)'}" stroke="var(--sea)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`};
const delta=(d,unit,first)=>{if(first)return '<span class="dl">Minggu pertama pilot</span>';const r=Math.round(d*10)/10;return r>0?`<span class="dl up">${ic('up')}+${fmt(r)}${unit} dari minggu lalu</span>`:r<0?`<span class="dl dn">${ic('down')}${fmt(r)}${unit} dari minggu lalu</span>`:'<span class="dl">Sama dengan minggu lalu</span>'};
const stamp=()=>new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(/\./g,'.')+' WIB';
function biSummary(){const w=S.biWeek,c=wk(w),where=S.biLoc==='all'?REPORT_LOCS.length+' kelurahan':'Kelurahan '+S.biLoc;
 return `Ringkasan pilot COBI, ${where}, Minggu ${w} (data per ${stamp()})
- Reach: ${c.reach} dari ${S.biLoc==='all'?60:20} warga target terdaftar
- Activation: ${c.act}% (${c.actN} warga sudah beraksi)
- Engagement: ${c.eng} warga aktif di minggu ${w}
- Verification: ${c.ver}% aksi disetujui (${c.P} menunggu)
- Consistency: ${c.cons}% warga aktif 2 minggu atau lebih
- Output BSIL: ${fmt(c.kg)} kg dari ${c.trx} setoran
- Emisi dihindari (perkiraan, ${CARBON_SOURCE.name}): ${fmtC(carbonByMaterial(c.TR).total)} kg CO₂e
Sumber: database COBI.`}
function renderB(){const w=S.biWeek,Wk=Array.from({length:WEEK},(_,i)=>wk(i+1)),c=Wk[w-1],p=Wk[w-2],tgt=S.biLoc==='all'?60:20;
 const VA=c.A.filter(a=>a.status==='verified'&&a.src==='app').length,VP=c.A.filter(a=>a.src==='petugas').length;
 const assistedOnly=users.filter(u=>inLoc(u.id)&&c.A.some(a=>a.uid===u.id)&&c.A.filter(a=>a.uid===u.id).every(a=>a.src==='petugas')).length;
 const K=[['Reach',`${c.reach}/${tgt}`,`${pc(c.reach,tgt)}% target warga terdaftar`,'reach',' warga'],['Activation',c.act+'%',`${c.actN} warga sudah beraksi`,'act',' poin %'],['Engagement',c.eng,`warga aktif minggu ${w}`,'eng',' warga'],['Verification',c.ver+'%',`${c.V} disetujui · ${c.P} menunggu`,'ver',' poin %'],['Consistency',c.cons+'%',`${c.consN} warga aktif ≥2 minggu`,'cons',' poin %'],['Output BSIL',fmt(c.kg)+' kg',`${c.trx} setoran tercatat`,'kg',' kg']];
 const W=Array.from({length:WEEK},(_,i)=>i+1).map(x=>{const A=acts.filter(a=>a.week===x&&inLoc(a.uid));return{w:x,v:A.filter(a=>a.status==='verified').length,p:A.filter(a=>a.status==='pending').length,r:A.filter(a=>a.status==='rejected').length}}),mx=Math.max(...W.map(x=>x.v+x.p+x.r),1);
 const loc=REPORT_LOCS.map(l=>{const us=users.filter(u=>u.loc===l&&u.reg<=w),A=acts.filter(a=>a.week<=w&&U(a.uid).loc===l);return{l,n:us.length,a:us.filter(u=>A.some(a=>a.uid===u.id)).length,v:A.filter(a=>a.status==='verified').length,k:Math.round(trx.filter(t=>t.week<=w&&U(t.uid).loc===l).reduce((s,t)=>s+t.kg,0)*10)/10,c:us.filter(u=>new Set(A.filter(a=>a.uid===u.id).map(a=>a.week)).size>=2).length}});
 const cat=Object.entries(CATS).map(([k,cc])=>({n:cc.n,c:k==='plastic'?'var(--sea)':k==='waste'?'var(--navy)':'var(--mute)',v:c.A.filter(a=>a.cat===k&&a.status==='verified').length})),cm=Math.max(...cat.map(x=>x.v),1);
 const mats=['Plastik','Kertas','Logam','Kaca'].map(m=>({m,k:Math.round(c.TR.filter(t=>t.mat===m).reduce((s,t)=>s+t.kg,0)*10)/10})),mm=Math.max(...mats.map(x=>x.k),1);
 const src=[['Dicatat warga sendiri',VA,'var(--sea)'],['Dibantu petugas',VP,'var(--mute)'],['Setoran BSIL (transaksi)',c.trx,'var(--navy)']],sm=Math.max(...src.map(x=>x[1]),1);
 const where=S.biLoc==='all'?REPORT_LOCS.length+' kelurahan':'Kelurahan '+S.biLoc;
 $('#v-bi').innerHTML=`<section class="band phead"><div class="wrap"><div class="row sp" style="flex-wrap:wrap;align-items:flex-start"><span class="ro">${ic('shield','width:16px;height:16px')}Read-only · data agregat, tanpa identitas individu</span><button class="btn o sm" data-copysum>${ic('book','width:18px;height:18px')}Salin ringkasan</button></div>
 <div class="dashboard-intro"><h1>${c.actN} dari ${c.reach} warga sudah beraksi; ${c.cons}% di antaranya aktif di 2 minggu atau lebih</h1><div class="dashboard-bibu">${bibu('earth')}</div></div>
 <p class="note" style="font-size:var(--fs-s);margin:0">Pilot COBI · ${where} · Minggu ${w} · data per ${stamp()}</p>
 <a class="btn o sm" href="/api/reports/export" download>Unduh laporan CSV</a>
 <div class="filt" role="group" aria-label="Saring data"><span class="s b">Kelurahan</span><div class="tabs">${['all',...REPORT_LOCS].map(l=>`<button data-biloc="${l}" class="${S.biLoc===l?'on':''}" aria-pressed="${S.biLoc===l}">${l==='all'?'Semua':l}</button>`).join('')}</div><span class="s b">Minggu</span><div class="tabs">${Array.from({length:WEEK},(_,i)=>i+1).map(x=>`<button data-biweek="${x}" class="${w===x?'on':''}" aria-pressed="${w===x}">${x}</button>`).join('')}</div></div>
 <div class="kpis">${K.map(([k,v,s2,key,unit])=>`<div class="card kpi"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s2}</div>${delta(p?c[key]-p[key]:0,unit,!p)}${spark(Wk.map(x=>x[key]),w-1)}</div>`).join('')}</div>
 <p class="s" style="margin:0">Garis kecil menunjukkan minggu program; titik penuh menandai minggu yang dipilih. "Poin %" berarti selisih persentase.</p></div></section>
 <section class="band"><div class="wrap"><div class="two">
 <div class="card"><div class="b" style="font-size:var(--fs-m)">Aksi per minggu menurut status pengecekan</div><div class="lg" style="margin:8px 0"><span style="--c:var(--sea)">Disetujui</span><span style="--c:var(--mute)">Menunggu</span><span style="--c:var(--reject)">Ditolak</span></div>
 ${W.map(x=>`<div class="hb" style="${x.w===w?'':'opacity:.55'}"><span class="b">Minggu ${x.w}</span>${x.w>WEEK?'<span class="s">Belum berjalan</span>':`<div class="tr"><i style="width:${x.v/mx*100}%;background:var(--sea)"></i><i style="width:${x.p/mx*100}%;background:var(--mute)"></i><i style="width:${x.r/mx*100}%;background:var(--reject)"></i></div>`}<span class="b" style="text-align:right">${x.v+x.p+x.r||''}</span></div>`).join('')}
 <div class="b" style="font-size:var(--fs-m);margin-top:16px">Sumber pencatatan (s.d. minggu ${w})</div>${src.map(([n,v,cc])=>`<div class="hb"><span class="b" style="font-size:var(--fs-xs)">${n}</span><div class="tr"><i style="width:${v/sm*100}%;background:${cc}"></i></div><span class="b" style="text-align:right">${v}</span></div>`).join('')}
 <p class="s">${assistedOnly} warga hanya tercatat lewat bantuan petugas, tanpa memakai aplikasi sendiri. Tanpa Mode Dibantu Petugas, mereka tidak akan masuk hitungan Activation.</p></div>
 <div class="card"><div class="b" style="font-size:var(--fs-m)">Aksi disetujui per kategori (s.d. minggu ${w})</div>${cat.map(x=>`<div class="hb"><span class="b">${x.n}</span><div class="tr"><i style="width:${x.v/cm*100}%;background:${x.c}"></i></div><span class="b" style="text-align:right">${x.v}</span></div>`).join('')}
 <div class="b" style="font-size:var(--fs-m);margin-top:16px">Material BSIL (kg)</div>${mats.map(x=>`<div class="hb"><span class="b">${x.m}</span><div class="tr"><i style="width:${x.k/mm*100}%;background:var(--sea)"></i></div><span class="b" style="text-align:right">${fmt(x.k)}</span></div>`).join('')}
 ${(()=>{const cb=carbonByMaterial(c.TR);return `<div class="b" style="font-size:var(--fs-m);margin-top:16px">Emisi dihindari dari setoran (s.d. minggu ${w})</div><div class="b" style="font-size:var(--fs-2xl);color:var(--sea)">${fmtC(cb.total)} <span class="s">kg CO₂e</span></div>${cb.kg?carbonRows(cb):'<p class="s">Belum ada setoran.</p>'}`})()}</div></div>
 <div class="card"><div class="b" style="font-size:var(--fs-m);margin-bottom:4px">Capaian per kelurahan (s.d. minggu ${w})</div><div class="scroll"><table class="stack"><thead><tr><th>Kelurahan</th><th class="r">Terdaftar</th><th class="r">Sudah beraksi</th><th class="r">Aksi disetujui</th><th class="r">Aktif ≥2 minggu</th><th class="r">BSIL</th></tr></thead><tbody>${loc.map(l=>`<tr style="${S.biLoc!=='all'&&S.biLoc!==l.l?'opacity:.5':''}"><td class="b">${l.l}</td><td class="r">${l.n} / 20</td><td class="r">${l.a} (${pc(l.a,l.n)}%)</td><td class="r">${l.v}</td><td class="r">${l.c}</td><td class="r">${fmt(l.k)} kg</td></tr>`).join('')}</tbody></table></div></div>
 <p class="note">Angka dihitung dari catatan pada database server. Laporan CSV mencakup seluruh periode. Emisi dihindari adalah perkiraan berdasarkan ${CARBON_SOURCE.name} (daur ulang dibanding TPA), memakai kategori Mixed Plastics, Mixed Paper (general), Mixed Metals, dan Glass. Faktornya disusun untuk kondisi TPA Amerika Serikat, jadi angka ini perlu dikalibrasi sebelum dipakai sebagai klaim resmi.</p></div></section>`}

function renderActivityView(){if(S.role==='superadmin')renderSuperadmin();else renderA();}
async function loadActivities(){const request=S.activityRequest=(S.activityRequest||0)+1,params=new URLSearchParams({page:String(S.activityPage||1)});if(S.activityQuery)params.set('q',S.activityQuery);if(S.activityStatus)params.set('status',S.activityStatus);
 try{const data=await api('/activity-management'+(S.activityHistory?'/history':'')+'?'+params);if(request!==S.activityRequest)return;S.activityData=data;S.activityError='';}catch(error){if(request!==S.activityRequest)return;S.activityError=error.message;S.activityData=null;}renderActivityView();}
async function loadAccess(){
 const requestId=S.accessRequestId=(S.accessRequestId||0)+1;S.accessLoading=true;
 const history=S.accessTab==='history',params=new URLSearchParams({page:String(S.accessPage||1)});if(!history&&S.accessQuery)params.set('q',S.accessQuery);
 try{const data=await api('/super-admin/'+(history?'history':S.accessTab==='admin-history'?'admin-history':'users')+'?'+params);if(requestId!==S.accessRequestId)return;S.accessData=data;S.accessError='';}
 catch(error){if(requestId!==S.accessRequestId)return;S.accessError=error.message;S.accessData=null;if([401,403].includes(error.status)){try{const result=await api('/auth/me');S.account=result.account;if(S.account)await sync();}catch{S.account=null;}route();return;}}
 finally{if(requestId===S.accessRequestId)S.accessLoading=false;}
 if(requestId===S.accessRequestId)renderSuperadmin();
}
function refreshAccess(){S.accessData=null;S.accessError='';S.accessLoading=true;renderSuperadmin();return loadAccess();}
async function loadLocations(){try{S.locationData=await api('/super-admin/locations');S.locationError='';}catch(error){S.locationError=error.message;}if(S.accessTab==='locations')renderSuperadmin();}
function renderMaterials(){const focused=document.activeElement?.matches('#materialSearch [name=q]'),caret=focused?document.activeElement.selectionStart:null;if(S.role==='superadmin')renderSuperadmin();else if(S.role==='admin'){const panel=$('#materialManagerPanel');if(panel)panel.innerHTML=materialManagementUI(S);else renderA();}if(focused){const input=$('#materialSearch [name=q]');input?.focus({preventScroll:true});input?.setSelectionRange(caret,caret);}}
async function loadMaterials(){const request=S.materialRequest=(S.materialRequest||0)+1;try{const data=await api('/material-management?'+new URLSearchParams({q:S.materialQuery||'',status:S.materialStatus||'',page:String(S.materialPage||1),history:String(!!S.materialHistory)}));if(request!==S.materialRequest)return;S.materialData=data;S.materialError='';}catch(error){if(request!==S.materialRequest)return;S.materialError=error.message;}if((S.role==='admin'&&S.atab==='belajar')||(S.role==='superadmin'&&S.accessTab==='materials'))renderMaterials();}
function renderSuperadmin(){if(!$('#v-superadmin')||!S.account||S.role!=='superadmin')return;const focused=document.activeElement?.matches('#accessSearch [name=q]'),caret=focused?document.activeElement.selectionStart:null;$('#v-superadmin').innerHTML=accessPage(S)+(S.accessTab==='materials'?'<div class="wrap">'+materialManagementUI(S)+'</div>':S.accessTab==='activities'?'<div class="wrap">'+activityManagementUI(S)+'</div>':S.accessTab==='locations'?'<div class="wrap">'+locationsUI(S)+'</div>':'');if(focused){const input=$('#accessSearch [name=q]');if(input){input.focus({preventScroll:true});input.setSelectionRange(caret,caret);}}if(!['activities','locations','materials'].includes(S.accessTab)&&!S.accessData&&!S.accessError&&!S.accessLoading)loadAccess();}

function render(){
 if(!S.account)S.role='peserta';
 document.body.classList.toggle('staff-app',!!S.account&&S.account.role!=='peserta');
 ['peserta','admin','bi','superadmin'].forEach(r=>{const view=$('#v-'+r);if(view)view.hidden=S.role!==r});
 const accountMenu=$('#accountMenu');if(accountMenu){
  accountMenu.hidden=!S.account;
  const roleLinks='';
  accountMenu.innerHTML=S.account?`${dashboardRole?`<details class="account-profile"><summary><span>${esc(S.account.name)}</span><small>Profil</small></summary><section class="account-profile-panel"><h2>Profil akun</h2><p>${esc(S.account.email)}</p><p class="s">${dashboardLabels[S.account.role]}</p>${roleLinks?`<h3>Pindah halaman</h3>${roleLinks}`:''}</section></details>`:`<button type="button" class="account-profile-link" data-go="saya" aria-label="Buka profil ${esc(S.account.name)}">${esc(S.account.name)}<small>Profil</small></button>`}<button type="button" class="btn o sm" data-logout>Keluar</button>`:'';
 }

 let access=$('#dashboardAccess');
 if(S.role==='denied'){
  if(!access){access=document.createElement('section');access.id='dashboardAccess';access.className='dashboard-access';$('#v-peserta').before(access);}
  access.hidden=false;access.innerHTML=`<h1>Dashboard ini khusus ${dashboardLabels[dashboardRole]}</h1><p>Anda masuk dengan akun ${dashboardLabels[S.account.role]}. Gunakan akun yang sesuai untuk membuka dashboard ini.</p><div class="row"><a class="btn n" href="${dashboardPaths[S.account.role]}">Buka halaman ${dashboardLabels[S.account.role]}</a><button class="btn o" data-logout>Keluar dan masuk akun lain</button></div>`;return;
 }
 if(access)access.hidden=true;
 document.querySelectorAll('[data-role]').forEach(b=>b.classList.toggle('on',b.dataset.role===S.role));
 ({peserta:renderP,admin:renderA,bi:renderB,superadmin:renderSuperadmin})[S.role]()}
const residentPage=location.pathname.startsWith('/warga');
const route=()=>{
 S.role=S.account?.role||'peserta';
 if(S.account&&(!dashboardRole&&!residentPage||residentPage&&S.role!=='peserta')){location.replace(dashboardPaths[S.role]+location.hash);return;}
 if(dashboardRole&&S.account&&S.role!==dashboardRole)S.role='denied';
 if(S.role==='admin'&&location.hash==='#artikel')S.atab='artikel';
 render();scrollTo(0,0);
};
addEventListener('hashchange',route);
const top0=()=>{$('#scr').scrollTop=0};
function netBar(){const ph=$('#phone');ph.classList.toggle('off',!!S.offline);$('#net').innerHTML=S.offline?`${ic('x','width:18px;height:18px')}<span>Tidak ada sinyal. Aksi tetap bisa dicatat dan terkirim otomatis nanti.</span>`:'';const demoNet=$('#demoNet');if(demoNet)demoNet.textContent=S.offline?'Simulasi sinyal kembali':'Simulasi sinyal hilang'}
async function setNet(off){S.offline=off;if(!off&&S.me){await flushQueue(S.me);await sync();}render();}
const stopSpeak=()=>{try{speechSynthesis.cancel()}catch(x){}S.speaking=false};
const speak=id=>{try{const ss=speechSynthesis;if(S.speaking){stopSpeak();return}const L=LES.find(l=>l.id===id),u=new SpeechSynthesisUtterance([L.t,...L.body].join('. '));u.lang='id-ID';u.rate=.95;u.onend=()=>{S.speaking=false;renderP()};ss.cancel();ss.speak(u);S.speaking=true}catch(e){toast('Suara belum tersedia di perangkat ini.')}};
document.addEventListener('click',async e=>{const profile=document.querySelector('.account-profile[open]');if(profile&&!profile.contains(e.target))profile.open=false;const t=e.target.closest('button,[data-bg]');if(!t)return;const d=t.dataset;
 try {
 if(t.id==='demoNet'){setNet(!S.offline);return}
 if(d.bg!==undefined){if(e.target===t){S.sheet=null;stopSpeak();renderP()}return}
 if(d.role){if(d.role==='peserta'){location.assign('/warga/');return}location.hash=d.role;return}
 if(d.wab!==undefined){waQ().shift();return renderP()}
 if(d.auth){e.preventDefault();S.auth=d.auth;S.form.err='';return renderP()}
 if(d.resend!==undefined){if(S.busy)return;S.busy=true;renderP();try{await api('/auth/'+(S.auth==='verify'?'resend':'forgot'),{email:S.form.email});toast('Permintaan tautan diproses. Periksa email Anda.');}catch(error){S.form.err=error.message;}finally{S.busy=false;renderP();}return;}
 if(d.loc){S.form.loc=d.loc;return renderP()}
 if(d.refreshCommunity!==undefined){t.disabled=true;try{await sync();renderP();toast('Data komunitas diperbarui.');}finally{t.disabled=false;}return;}
 if(d.activityEdit!==undefined){S.activityEdit={id:d.activityEdit,operation:d.operation,visible:d.visible==='true'};renderActivityView();const form=$('#activityDecision');form?.scrollIntoView({block:'center',behavior:reduce?'instant':'smooth'});form?.querySelector('textarea')?.focus({preventScroll:true});return;}
 if(d.activityDismiss!==undefined){S.activityEdit=null;return renderActivityView();}
 if(d.activityTab!==undefined){S.activityHistory=d.activityTab==='history';S.activityPage=1;S.activityEdit=null;S.activityData=null;renderActivityView();return loadActivities();}
 if(d.activityPage!==undefined){S.activityPage=Number(d.activityPage);S.activityEdit=null;S.activityData=null;renderActivityView();return loadActivities();}
 if(d.activityCleanup!==undefined){t.disabled=true;try{const result=await api('/activity-management/cleanup/'+d.activityCleanup,{});await loadActivities();toast(result.cleanupStatus==='pending'?'Pembersihan belum berhasil. Coba lagi nanti.':'Status foto diperbarui.');}finally{t.disabled=false;}return;}
 if(d.userOperation!==undefined){const user=S.accessData?.users?.find(user=>user.id===d.userId);if(!user)return;S.userDecision={...user,operation:d.userOperation};renderSuperadmin();$('#accountDecision').scrollIntoView({block:'center'});$('#accountDecision textarea, #accountDecision [type=submit]')?.focus({preventScroll:true});return;}
 if(d.accountDismiss!==undefined){S.userDecision=null;return renderSuperadmin();}
 if(d.materialEdit!==undefined){const lesson=S.materialData?.rows.find(row=>row.id===d.materialEdit);if(!lesson)return;S.materialEdit={id:lesson.id,title:lesson.t,operation:d.operation};renderMaterials();$('#materialDecision').scrollIntoView({block:'center'});$('#materialDecision textarea').focus({preventScroll:true});return;}
 if(d.materialDismiss!==undefined){S.materialEdit=null;return renderMaterials();}
 if(d.materialView!==undefined){S.materialHistory=d.materialView==='history';S.materialPage=1;S.materialEdit=null;S.materialData=null;renderMaterials();return loadMaterials();}
 if(d.materialPage!==undefined){S.materialPage=Number(d.materialPage);S.materialEdit=null;return loadMaterials();}
 if(d.materialCleanup!==undefined){t.disabled=true;try{const result=await api('/material-management/cleanup/'+d.materialCleanup,{});await loadMaterials();toast(result.cleanupStatus==='done'?'Berkas dibersihkan.':'Pembersihan belum berhasil. Coba lagi nanti.');}finally{t.disabled=false;}return;}
 if(d.locationPage!==undefined){S.locationPage=Number(d.locationPage);return renderSuperadmin();}
 if(d.locationPreview!==undefined){S.locationDraft=$('#locationImport [name=text]').value;return renderSuperadmin();}
 if(d.locationToggle!==undefined){t.disabled=true;try{await api('/super-admin/locations/status',{name:d.locationToggle,active:d.active==='true'});await loadLocations();toast('Status kelurahan diperbarui.');}catch(error){S.locationError=error.message;renderSuperadmin();}return;}
 if(d.accessTab!==undefined){S.accessRequestId=(S.accessRequestId||0)+1;S.accessLoading=false;S.userDecision=null;S.accessTab=d.accessTab;S.accessPage=1;if(d.accessTab==='materials'){S.materialEdit=null;S.materialData=null;renderSuperadmin();return loadMaterials();}if(d.accessTab==='locations'){S.locationData=null;renderSuperadmin();return loadLocations();}if(d.accessTab==='activities'){S.activityData=null;S.activityEdit=null;loadActivities();return renderSuperadmin();}return refreshAccess()}
 if(d.accessPage!==undefined){S.accessPage=Number(d.accessPage);return refreshAccess()}
 if(d.resetResidentFilters!==undefined){S.residentFilters=emptyResidentFilters();return renderA()}
 if(d.logout!==undefined){await api('/auth/logout',{});S.materialRequest=(S.materialRequest||0)+1;S.materialData=null;S.materialEdit=null;S.materialQuery='';S.materialHistory=false;S.materialStatus='';S.materialPage=1;S.materialError='';S.userDecision=null;S.locationData=null;S.locationDraft='';S.locationQuery='';S.locationPage=1;S.locationError='';S.accessRequestId=(S.accessRequestId||0)+1;S.accessLoading=false;S.activityRequest=(S.activityRequest||0)+1;S.activityData=null;S.activityEdit=null;S.activityQuery='';S.activityHistory=false;S.activityPage=1;S.accessData=null;S.accessQuery='';S.accessTab='users';S.accessPage=1;S.accessError='';S.account=null;S.me=null;S.auth='email';S.form={email:'',password:'',name:'',loc:'',err:''};S.wa=[];S.sheet=null;users.length=acts.length=trx.length=0;return route()}
 if(d.go){S.tab=d.go;renderP();top0();return}
 if(d.start!==undefined){S.c=d.start?{step:2,tile:d.start,photo:null}:{step:1,tile:null,photo:null};S.tab='catat';renderP();top0();return}
 if(d.tile){S.c={step:2,tile:d.tile,photo:null};renderP();top0();return}
 if(d.step){S.c.step=+d.step;S.c.photo=null;return renderP()}
 if(d.retake!==undefined){S.c.photo=null;return renderP()}
 if(d.submit!==undefined){
  if(!S.c?.photo||S.c.sending!=null)return;
  const action={tile:S.c.tile,photo:S.c.photo,clientId:S.c.clientId||(S.c.clientId=crypto.randomUUID())};
  S.c.sending=0;renderP();
  try{await api('/actions',action);await sync();S.c.step=3;S.c.queued=false;}
  catch(error){if(!error.network)throw error;enqueue(S.me,action);S.c.step=3;S.c.queued=true;}
  finally{S.c.sending=null;renderP();}
  top0();return;
 }
 if(d.help!==undefined){S.sheet={t:'help'};return renderP()}
 if(d.les){S.sheet={id:d.les,ans:null};renderP();if(d.listen!==undefined){speak(d.les);renderP()}return}
 if(d.speak){speak(d.speak);return renderP()}
 if(d.ans!==undefined){S.sheet.ans=+d.ans;S.sheet.checked=false;return renderP()}
 if(d.check!==undefined){const result=await api('/lessons/'+S.sheet.id+'/answer',{answer:S.sheet.ans});S.sheet.checked=true;S.sheet.pass=result.correct;
  if(result.correct){await sync();S.sheet=null;stopSpeak();toast(result.awarded?'Benar! +20 poin':'Materi sudah pernah selesai.');if(result.awarded)confetti()}return renderP()}
 if(d.complete){t.disabled=true;try{const result=await api('/lessons/'+d.complete+'/complete',{});await sync();S.sheet=null;stopSpeak();renderP();toast(result.awarded?'Materi selesai. +20 poin.':'Materi sudah pernah selesai.');}finally{t.disabled=false;}return;}
 if(d.close!==undefined){S.sheet=null;stopSpeak();return renderP()}
 if(d.rew){S.sheet={t:'rew',id:d.rew};return renderP()}
 if(d.redeem){if(S.sheet.busy)return;S.sheet.busy=true;try{const result=await api('/rewards/'+d.redeem+'/redeem',{clientId:S.sheet.clientId||(S.sheet.clientId=crypto.randomUUID())});await sync();S.sheet={t:'rew',id:d.redeem,code:result.voucher.code};renderP();confetti();}finally{if(S.sheet)S.sheet.busy=false;}return}
 if(d.size){await api('/preferences',{big:d.size==='1'});await sync();return renderP()}
 if(d.biloc){S.biLoc=d.biloc;return renderB()}
 if(d.biweek){S.biWeek=+d.biweek;return renderB()}
 if(d.copysum!==undefined){const txt=biSummary();(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Ringkasan tersalin. Tempel di WhatsApp atau email.'),()=>{S.sheetTxt=txt;toast('Gagal menyalin otomatis. Blok teks ringkasan lalu salin manual.');const n=document.createElement('textarea');n.value=txt;n.style.cssText='width:100%;min-height:180px;margin-top:8px';$('#v-bi .phead .wrap').append(n);n.select()});return}
 if(d.atab){S.atab=d.atab;S.rej=null;if(d.atab==='kuis')S.quizAdmin=await api('/admin/quiz');if(d.atab==='belajar'){S.materialEdit=null;S.materialData=null;loadMaterials();}if(d.atab==='kegiatan'){S.activityEdit=null;S.activityData=null;loadActivities();}return renderA()}
 if(d.rej){S.rej=+d.rej;return renderA()}
 if(d.rejc!==undefined){S.rej=null;return renderA()}
 if(d.huser){S.help.uid=d.huser;return renderA()}
 if(d.htile){S.help.tile=d.htile;return renderA()}
 if(d.hsave!==undefined){const h=S.help;await api('/actions',{uid:h.uid,tile:h.tile,photo:h.photo,clientId:h.clientId||(h.clientId=crypto.randomUUID())});await sync();S.help={q:'',uid:null,tile:null,photo:null};toast('Aksi warga tersimpan.');return renderA()}
 if(d.articleSend){t.disabled=true;try{const result=await api('/articles/'+d.articleSend+'/send',{});await sync();toast(result.article.emailStatus==='sent'?'Email terkirim ke tim.':'Email belum terkirim. Silakan coba lagi.');render();}finally{t.disabled=false;}return;}
 if(d.articleOk){t.disabled=true;try{await api('/articles/'+d.articleOk+'/review',{status:'verified'});await sync();renderA();toast('Artikel disetujui. +50 poin untuk warga.');}finally{t.disabled=false;}return;}
 if(d.ok||d.no){await api('/actions/'+(d.ok||d.no)+'/review',{status:d.ok?'verified':'rejected',reason:d.no?$('#rej-'+d.no).value:''});await sync();S.rej=null;toast('Keputusan tersimpan.');return renderA()}
 } catch(error){toast(error.message);if(error.status===401){S.account=null;S.me=null;route();}}
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){const profile=document.querySelector('.account-profile[open]');if(profile){profile.open=false;profile.querySelector('summary').focus();return;}}
 if(e.key==='Tab' && S.sheet && S.role==='peserta'){
  const dialog=document.querySelector('#sheet .sheet>div');
  const focusable=dialog ? [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, a[href], summary, [tabindex="0"]')] : [];
  const first=focusable[0],last=focusable.at(-1);
  if(first && e.shiftKey && (document.activeElement===first || document.activeElement.id==='shT')){e.preventDefault();last.focus();}
  else if(first && !e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
 }
 if(e.key==='Escape'&&S.sheet&&S.role==='peserta'){S.sheet=null;stopSpeak();renderP()}});
document.addEventListener('change',async e=>{const id=e.target.id,f=e.target.files&&e.target.files[0];
 if (!f || !['fPhoto', 'hPhoto','articlePhoto'].includes(id)) return;
 try {
  const photo = await readPhoto(f);
  if (id === 'fPhoto' && S.c) { S.c.photo = photo; renderP(); }
  if (id === 'hPhoto') { S.help.photo = photo; toast('Foto bukti terpasang.'); }
  if (id === 'articlePhoto') { S.articleDraft.photo=photo;renderP(); }
 } catch (error) { toast(error.message); }});
const updCO2=()=>{const o=$('#tCO2'),m=$('#tM'),k=$('#tK');if(o&&m&&k)o.innerHTML=`Perkiraan emisi dihindari: <b>${fmtC(co2e(m.value,parseFloat(k.value)||0))} kg CO₂e</b> <span class="s">(${fmtC(factorPerKg(m.value))} kg CO₂e per kg ${m.value.toLowerCase()})</span>`};
document.addEventListener('input',e=>{if(e.target.id==='tK')updCO2()});document.addEventListener('change',e=>{if(e.target.id==='tM')updCO2()});
document.addEventListener('input',e=>{const id=e.target.id,v=e.target.value;
 if(e.target.matches('#materialSearch [name=q]'))S.materialQuery=v;
 if(e.target.matches('#locationImport [name=text]'))S.locationDraft=v;
 if(e.target.matches('#activitySearch [name=q]'))S.activityQuery=v;
 if(e.target.matches('#accessSearch [name=q]'))S.accessQuery=v;
 if(id==='aEmail')S.form.email=v;if(id==='aPassword')S.form.password=v;if(id==='aName')S.form.name=v;if(id==='aLoc')S.form.loc=v;
 if(id==='articleBody')S.articleDraft.body=v;if(id==='articleParticipants')S.articleDraft.participants=v;if(id==='articleDate')S.articleDraft.occurredOn=v;
 if(id==='q')ptab(v);if(id==='hq'){S.help.q=v;who()}});
document.addEventListener('submit',async e=>{
 if(e.target.id==='materialSearch'){e.preventDefault();const values=Object.fromEntries(new FormData(e.target));S.materialQuery=values.q;S.materialStatus=values.status;S.materialPage=1;S.materialEdit=null;return loadMaterials();}
 if(e.target.id==='materialDecision'){e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),box=form.querySelector('[data-material-error]');if(button.disabled)return;button.disabled=true;box.hidden=true;try{const edit=S.materialEdit,result=await api('/materials/'+edit.id+'/'+edit.operation,Object.fromEntries(new FormData(form)));S.materialEdit=null;await sync();await loadMaterials();toast(result.cleanupStatus==='pending'?'Materi dihapus; coba pembersihan berkas lewat riwayat.':'Perubahan materi tersimpan.');}catch(error){box.hidden=false;box.textContent=error.message;button.disabled=false;}return;}
 if(e.target.id==='locationSearch'){e.preventDefault();S.locationQuery=new FormData(e.target).get('q');S.locationPage=1;renderSuperadmin();return;}
 if(e.target.id==='locationImport'){e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),box=form.querySelector('[data-location-error]');if(button.disabled)return;button.disabled=true;box.hidden=true;try{const result=await api('/super-admin/locations/import',{text:new FormData(form).get('text')});S.locationDraft='';await loadLocations();await sync();toast(`${result.added.length} kelurahan ditambah; ${result.skipped.length} dilewati.`);}catch(error){box.hidden=false;box.textContent=error.message;button.disabled=false;}return;}
 if(e.target.id==='accountDecision'){e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),box=form.querySelector('[data-account-error]');if(button.disabled)return;button.disabled=true;box.hidden=true;try{const edit=S.userDecision,result=await api('/super-admin/users/'+edit.id+'/'+edit.operation,Object.fromEntries(new FormData(form)));S.userDecision=null;await loadAccess();toast(result.message||'Akses login dihapus; riwayat tetap tersimpan.');}catch(error){box.hidden=false;box.textContent=error.message;button.disabled=false;}return;}
 if(e.target.id==='activitySearch'){e.preventDefault();const values=Object.fromEntries(new FormData(e.target));S.activityQuery=values.q.trim();S.activityStatus=values.status;S.activityPage=1;S.activityEdit=null;loadActivities();return;}
 if(e.target.id==='activityDecision'){e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),errorBox=form.querySelector('[data-activity-error]');if(button.disabled)return;button.disabled=true;errorBox.hidden=true;
  try{const edit={...S.activityEdit},result=await api('/actions/'+edit.id+'/'+edit.operation,{...Object.fromEntries(new FormData(form)),visible:edit.visible});S.activityEdit=null;await sync();await loadActivities();toast(result.cleanupStatus==='pending'?'Catatan dihapus; pembersihan foto perlu dicoba lagi pada riwayat.':result.changed?'Perubahan kegiatan tersimpan.':'Tidak ada perubahan.');}catch(error){errorBox.hidden=false;errorBox.textContent=error.message;button.disabled=false;}return;
 }

 if(e.target.id==='accessSearch'){e.preventDefault();S.accessQuery=new FormData(e.target).get('q').trim();S.accessPage=1;refreshAccess();return;}
 if(e.target.matches('[data-role-user]')){
  e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),box=form.querySelector('[data-access-error]');if(button.disabled)return;button.disabled=true;box.hidden=true;
  try{const roles=new FormData(form).getAll('roles');if(!roles.length)throw Error('Pilih minimal satu role.');const result=await api('/super-admin/users/'+form.dataset.roleUser+'/roles',{roles});if(result.user.id===S.account.id&&!result.user.roles.includes('superadmin')){location.assign(dashboardPaths[result.user.role]);return;}if(result.user.id===S.account.id)S.account.roles=result.user.roles;await loadAccess();toast(result.user.changed?'Akses pengguna diperbarui.':'Tidak ada perubahan akses.');}catch(error){box.hidden=false;box.textContent=error.message;button.disabled=false;}return;
 }

 if(e.target.id==='profileForm'||e.target.id==='quizAdminForm'||e.target.matches('[data-quiz-question]')){
  e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
  try{
   if(form.id==='profileForm'){await api('/profile',Object.fromEntries(new FormData(form)));S.profileRequired=false;await sync();S.tab='home';render();toast('Profil lengkap tersimpan.');}
   else if(form.id==='quizAdminForm'){const questions=[...form.querySelectorAll('[data-question-index]')].map(field=>({text:field.querySelector('[name=text]').value,options:[...field.querySelectorAll('[name=option]')].map(input=>input.value),answer:Number(field.querySelector('[name=answer]').value),explanation:field.querySelector('[name=explanation]').value}));await api('/admin/quiz',{week:new FormData(form).get('week'),questions});S.quizAdmin=await api('/admin/quiz');renderA();toast('Kuis mingguan diterbitkan.');}
   else{const result=await api('/quiz/answer',{week:S.quiz.key,id:form.dataset.quizQuestion,selected:Number(new FormData(form).get('selected'))});S.quiz=result.quiz;await sync();renderP();toast(result.correct?'Benar! +1 poin.':'Jawaban tersimpan.');}
  }catch(error){const box=form.querySelector('[data-form-error]');if(box){box.hidden=false;box.textContent=error.message;}else toast(error.message);button.disabled=false;}return;
 }

 if(e.target.id==='materialForm'){
  e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;button.textContent='Menerbitkan…';
  try{const data=Object.fromEntries(new FormData(form)),file=form.querySelector('#materialFile').files[0];if(file&&!form.dataset.fileId){const uploaded=await uploadMaterial(file);form.dataset.fileId=uploaded.id;}await api('/materials',{...data,fileId:form.dataset.fileId||'',clientId:form.dataset.clientId||(form.dataset.clientId=crypto.randomUUID())});await sync();await loadMaterials();renderA();toast('Materi diterbitkan untuk warga.');}catch(error){toast(error.message);button.disabled=false;button.textContent='Terbitkan materi';}return;
 }
 if(e.target.id==='articleForm'){
  e.preventDefault();const draft=S.articleDraft;if(draft.busy)return;draft.busy=true;draft.err='';renderP();
  try{const result=await api('/articles',{...draft,clientId:draft.clientId||(draft.clientId=crypto.randomUUID())});await sync();S.articleDraft={body:'',participants:'',occurredOn:'',photo:null,err:''};toast(result.article.emailStatus==='sent'?'Artikel terkirim ke tim untuk kurasi.':'Artikel tersimpan, email belum terkirim. Gunakan kirim ulang.');}catch(error){draft.err=error.message;}finally{draft.busy=false;renderP();}return;
 }
 if(e.target.matches('[data-article-review]')){e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{await api('/articles/'+e.target.dataset.articleReview+'/review',{status:'rejected',reason:new FormData(e.target).get('reason')});await sync();renderA();toast('Hasil kurasi tersimpan.');}catch(error){toast(error.message);button.disabled=false;}return;}
 if(e.target.id==='authForm'){
  e.preventDefault();if(S.busy)return;S.form.loc=$('#aLoc')?.value||S.form.loc;S.busy=true;S.form.err='';renderP();
  try{
   if(S.auth==='forgot'){await api('/auth/forgot',{email:S.form.email});S.auth='sent';S.busy=false;renderP();return;}
   if(S.auth==='reset'){await api('/auth/reset',{token:S.resetToken,password:S.form.password});S.resetToken=null;S.form.password='';S.auth='email';S.busy=false;renderP();toast('Kata sandi diperbarui. Silakan masuk.');return;}
   const result=await api('/auth/'+(S.auth==='reg'?'register':'login'),S.form);S.form.password='';
   if(result.needsVerification){S.auth='verify';S.busy=false;renderP();return;}
   S.account=result.account;await sync();S.tab='home';S.biWeek=WEEK;S.busy=false;route();
  }
  catch(error){S.form.err=error.message;S.form.password='';S.busy=false;if(error.verificationRequired||(error.status===503&&S.auth==='reg'))S.auth='verify';renderP();}return;
 }
 if(e.target.matches('.stock-form,#voucherForm,#residentForm')){
  e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;const values=Object.fromEntries(new FormData(form));
  try{if(form.matches('.stock-form'))await api('/rewards/'+form.dataset.stock+'/stock',{stock:Number(values.stock)});else if(form.id==='voucherForm')await api('/vouchers/fulfill',values);else await api('/residents',values);await sync();toast('Data tersimpan.');renderA();}catch(error){toast(error.message);button.disabled=false;}return;
 }
 if(e.target.id!=='trxf')return;e.preventDefault();const k=Math.round(parseFloat($('#tK').value)*10)/10;
 if(!(k>0&&k<=100)){toast('Isi berat antara 0,1 dan 100 kg.');return}
 const uid=$('#tU').value,m=$('#tM').value,button=e.target.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
 try{await api('/transactions',{uid,mat:m,kg:k,clientId:crypto.randomUUID()});await sync();toast(`Setoran ${fmt(k)} kg tersimpan.`);renderA();}catch(error){toast(error.message);button.disabled=false;}
});
document.addEventListener('change',e=>{
 if(e.target.id==='locationFile'){const file=e.target.files[0];if(!file)return;if(file.size>150000){toast('Berkas maksimal 150 KB.');return;}file.text().then(text=>{if(S.accessTab!=='locations')return;S.locationDraft=text;renderSuperadmin();}).catch(()=>toast('Berkas tidak dapat dibaca.'));return;}
 if(e.target.matches('[data-resident-filter]')){const key=e.target.dataset.residentFilter;S.residentFilters[key]=e.target.value;if(key==='type')S.residentFilters.origin='';if(key==='city')S.residentFilters.district='';renderA();return;}
 if(e.target.id==='quizWeekSelect'){S.quizAdmin.editWeek=e.target.value;renderA();return;}
 if(e.target.id==='aLoc')S.form.loc=e.target.value;
 if(e.target.id==='materialFile')e.target.form.dataset.fileId='';
 if(e.target.id==='materialKind'){
  const form=e.target.form,kind=e.target.value,file=form.querySelector('#materialFile');form.dataset.fileId='';file.value='';file.required=['powerpoint','module'].includes(kind);file.accept={video:'.mp4',powerpoint:'.ppt,.pptx',module:'.pdf,.doc,.docx',text:''}[kind];
  form.querySelector('[data-material-file]').hidden=kind==='text';form.querySelector('[data-material-url]').hidden=kind!=='video';const videoUrl=form.querySelector('[name=videoUrl]');videoUrl.disabled=kind!=='video';if(kind!=='video')videoUrl.value='';form.querySelector('[name=body]').required=kind==='text';form.querySelector('[name=body]').minLength=kind==='text'?20:0;
 }
});
async function initialize(){
 $('#scr').innerHTML='<div class="pad" role="status">Menghubungkan ke server…</div>';
 try{
  const locationData=await api('/locations');LOCS=locationData.locations.map(row=>row.name);
  const query=new URLSearchParams(location.search),token=query.get('token'),mode=query.get('mode');
  if(mode==='register'&&!dashboardRole)S.auth='reg';
  if(token&&['verify','reset'].includes(mode)){
   history.replaceState(null,'',location.pathname);
   if(mode==='reset'){S.resetToken=token;S.auth='reset';S.ready=true;route();return;}
   const result=await api('/auth/verify',{token});S.account=result.account;await sync();S.biWeek=WEEK;S.ready=true;route();return;
  }
  const {account}=await api('/auth/me');S.account=account;if(account){await sync();S.biWeek=WEEK;if(S.me)await flushQueue(S.me).then(sync).catch(()=>{});}S.ready=true;route();
 }
 catch(error){S.form.err=error.message;S.ready=true;route();}
}
addEventListener('online',()=>setNet(false).catch(error=>toast(error.message)));
addEventListener('offline',()=>{S.offline=true;netBar();});
addEventListener('focus',()=>{if(S.account&&S.role!=='superadmin'&&!S.sheet&&!['catat','artikel','profil','kuis'].includes(S.tab)&&(S.account.role!=='admin'||S.atab==='antrian'))sync().then(render).catch(error=>{if(error.status===401){S.account=null;S.me=null;route();}});});
setInterval(()=>{if(S.me&&S.quiz&&Date.now()>=Date.parse(S.quiz.resetsAt)){sync().then(render).catch(()=>{});return;}if(S.account&&S.role!=='superadmin'&&!S.sheet&&!S.busy&&!['catat','artikel','profil','kuis'].includes(S.tab)&&(S.account.role!=='admin'||S.atab==='antrian'))sync().then(render).catch(()=>{});},30000);
initialize();
