export function quizPeriod(now=new Date()){
 const day=new Date(now.getTime()+7*3600000);day.setUTCHours(0,0,0,0);day.setUTCDate(day.getUTCDate()-day.getUTCDay());
 const key=day.toISOString().slice(0,10),next=new Date(day.getTime()+7*86400000).toISOString().slice(0,10);
 return {key,next,resetsAt:next+'T00:00:00+07:00'};
}
export const INITIAL_QUESTIONS=[
 ['Apa yang sebaiknya dilakukan sebelum memilah sampah?',['Mencampur semua sampah','Mengenali jenis sampah','Membakar sampah'],1,'Kenali jenisnya agar sampah dapat dipilah sesuai penanganannya.'],
 ['Barang apa yang dapat membantu mengurangi botol plastik sekali pakai?',['Tumbler yang dipakai berulang','Botol plastik baru setiap hari','Kantong plastik'],0,'Gunakan kembali tumbler untuk mengurangi kebutuhan kemasan sekali pakai.'],
 ['Sampah sisa sayuran dapat dimanfaatkan menjadi apa?',['Kompos dengan pengolahan yang tepat','Baterai','Kaca'],0,'Sisa sayuran merupakan bahan organik yang dapat dikomposkan.'],
 ['Baterai bekas sebaiknya ditangani dengan cara apa?',['Dicampur sisa makanan','Dibuang ke sungai','Dipisah dan dibawa ke pengumpulan limbah yang sesuai'],2,'Pisahkan baterai dari sampah rumah tangga biasa.'],
 ['Apa pilihan yang membantu mengurangi kantong plastik saat belanja?',['Membawa tas pakai ulang','Meminta kantong tambahan','Membuang kantong ke selokan'],0,'Bawa dan gunakan kembali tas belanja yang sudah dimiliki.'],
 ['Mengapa sampah tidak boleh dibuang ke sungai?',['Karena sungai akan mendaur ulangnya','Karena dapat mencemari air dan terbawa ke laut','Karena sampah langsung hilang'],1,'Sampah dapat mencemari aliran air dan membahayakan makhluk hidup.'],
 ['Bagaimana menyiapkan kemasan untuk dikumpulkan ke bank sampah?',['Dibiarkan penuh sisa makanan','Dicampur semua limbah','Dipilah dan dibersihkan sesuai ketentuan penerima'],2,'Ikuti jenis material dan syarat penerimaan bank sampah setempat.'],
 ['Apa arti menggunakan kembali barang?',['Memakai barang yang masih layak untuk fungsi yang sesuai','Selalu membeli barang baru','Langsung membuang semua barang'],0,'Menggunakan kembali memperpanjang masa pakai barang.'],
 ['Apa contoh upaya mengurangi sisa makanan?',['Mengambil makanan melebihi kebutuhan','Mengambil porsi secukupnya','Membuang makanan yang masih layak'],1,'Rencanakan dan ambil porsi sesuai kebutuhan.'],
 ['Apa manfaat mencatat aksi lingkungan di komunitas?',['Mengetahui partisipasi dan perkembangan kegiatan','Membuat sampah hilang otomatis','Menggantikan seluruh kegiatan nyata'],0,'Catatan membantu komunitas mengevaluasi kegiatan dan partisipasi.'],
].map(([text,options,answer,explanation],index)=>({id:'q'+(index+1),text,options,answer,explanation}));
export function quizView(state,uid,now){
 const period=quizPeriod(now),questions=state.quizWeeks?.[period.key]?.questions||[],attempt=state.quizAttempts?.find(attempt=>attempt.uid===uid&&attempt.week===period.key);
 const answers=attempt?.answers||[];
 return {...period,available:questions.length===10,completed:answers.length===10,answered:answers.length,score:attempt?.score||0,questions:questions.map(({answer,explanation,...question})=>{const response=answers.find(a=>a.id===question.id);return {...question,...(response?{selected:response.selected,correct:response.correct,answer,explanation}:{})};})};
}
