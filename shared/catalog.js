export const LOCS = ['Tlogomas', 'Dinoyo', 'Mojolangu'];
export const TILES = [
 {id:'tumbler',n:'Bawa tumbler',cat:'plastic',hint:'Foto tumbler yang Anda bawa hari ini.'},
 {id:'tas',n:'Pakai tas kain',cat:'plastic',hint:'Foto tas kain yang Anda pakai berbelanja.'},
 {id:'tolak',n:'Tolak kantong atau sedotan plastik',cat:'plastic',hint:'Foto belanjaan Anda tanpa kantong plastik.'},
 {id:'pilah',n:'Pilah sampah',cat:'waste',hint:'Foto tempat sampah yang sudah dipilah.'},
 {id:'tanam',n:'Rawat tanaman',cat:'green',hint:'Foto tanaman yang Anda tanam atau siram.'},
 {id:'jalan',n:'Jalan kaki atau bersepeda',cat:'green',hint:'Foto sepeda atau sepatu Anda di perjalanan.'}
];
export const MIS = [{id:'m1',t:'Bawa tumbler 3 hari',tile:'tumbler',target:3},{id:'m2',t:'Pilah sampah 2 kali',tile:'pilah',target:2},{id:'m3',t:'Jalan kaki atau bersepeda 2 kali',tile:'jalan',target:2}];
export const LES = [
 {id:'l1',t:'Apa itu perubahan iklim?',c:'#007573',i:'leaf',body:['Perubahan iklim adalah pergeseran pola suhu dan cuaca dalam waktu lama. Sejak abad ke-19, kegiatan manusia menjadi penyebab utamanya.','Gas seperti karbon dioksida dan metana memerangkap panas di udara. Sumber terbesarnya adalah pembakaran bahan bakar fosil.','Sampah sisa makanan yang menumpuk di TPA menghasilkan gas metana. Jadi, memilah sampah ikut membantu.'],q:{q:'Gas apa yang muncul dari sampah sisa makanan yang menumpuk di TPA?',o:['Oksigen','Metana','Nitrogen'],a:1}},
 {id:'l2',t:'Cara memilah sampah',c:'#178a4a',i:'recycle',body:['Pisahkan sampah menjadi tiga: sisa makanan dan daun, sampah kering seperti plastik, kertas, kaleng, dan kaca, serta sampah berbahaya seperti baterai dan lampu.','Sampah kering yang bersih bisa disetor ke Bank Sampah dan ditimbang petugas.','Sampah berbahaya jangan dicampur, karena bisa mencemari tanah dan air.'],q:{q:'Baterai bekas sebaiknya dibuang bersama…',o:['Sisa makanan','Sampah berbahaya, dipisah sendiri','Kertas'],a:1}},
 {id:'l3',t:'Mengurangi plastik',c:'#b88600',i:'bag',body:['Kantong, sedotan, dan gelas plastik hanya dipakai sebentar tetapi sulit hancur.','Cara paling mudah: tolak yang tidak perlu, lalu ganti dengan barang yang bisa dipakai lagi.','Tumbler, tas kain, dan wadah makan adalah pengganti yang paling mudah untuk memulai.'],q:{q:'Langkah paling awal untuk mengurangi plastik adalah…',o:['Membakar plastik','Menolak plastik yang tidak perlu','Menimbun di halaman'],a:1}},
 {id:'l4',t:'Sampah kita sampai ke laut',c:'#2c8a2a',i:'leaf',body:['Sungai di Malang mengalir sampai ke laut. Sampah yang dibuang sembarangan bisa terbawa arus.','Di laut, sampah membahayakan hewan seperti paus, teman Bibu.','Aksi kecil yang dilakukan rutin oleh banyak orang adalah inti program ini.'],q:{q:'Bagaimana sampah di darat bisa sampai ke laut?',o:['Terbawa aliran sungai','Dibawa angin','Tidak mungkin sampai'],a:0}}
];
export const DEFAULT_REWARDS = [{id:'r2',n:'Pulsa Rp10.000',p:250,c:'#007573',stock:0},{id:'r1',n:'Beras 1 kg',p:300,c:'#007573',stock:0},{id:'r3',n:'Minyak goreng 1 liter',p:400,c:'#007573',stock:0},{id:'r4',n:'Tumbler COBI',p:500,c:'#007573',stock:0}];
export const DAILY_POINTS = {tolak:1,tas:2,tumbler:3,pilah:5,tanam:5,jalan:10};
export const MISSION_POINTS = 10;
export const ARTICLE_POINTS = 50;
export function completedMissions(state, uid) {
 const verified=state.acts.filter(a=>a.uid===uid&&a.status==='verified');
 return [...new Set(verified.map(a=>a.week))].flatMap(week=>MIS.filter(m=>new Set(verified.filter(a=>a.week===week&&a.tile===m.tile).map(a=>a.date)).size>=m.target).map(m=>({key:uid+':'+week+':'+m.id,week})));
}
export function dailyAward(state, action) {
 return state.acts.some(a=>a.id!==action.id&&a.uid===action.uid&&a.tile===action.tile&&a.date===action.date&&a.status==='verified')?0:DAILY_POINTS[action.tile]||0;
}
export function points(state, uid) {
 const verified=state.acts.filter(a=>a.uid===uid&&a.status==='verified');
 const dates=new Set();
 const actionPoints=verified.reduce((sum,a)=>{const key=a.tile+':'+a.date;const award=a.awardedPoints??(dates.has(key)?0:DAILY_POINTS[a.tile]||0);dates.add(key);return sum+award;},0);
 const missions=state.missionPolicyVersion===2?(state.frozenMissionPoints?.[uid]||0):completedMissions(state,uid).reduce((sum,m)=>sum+(state.legacyMissionKeys?.includes(m.key)?100:MISSION_POINTS),0);
 return (state.quizAttempts||[]).filter(a=>a.uid===uid).reduce((sum,a)=>sum+a.score,0)+actionPoints+state.trx.filter(t=>t.uid===uid).length*30+(state.users.find(u=>u.id===uid)?.ls.length||0)*20+missions+(state.articles||[]).filter(a=>a.uid===uid&&a.status==='verified').length*ARTICLE_POINTS;
}
