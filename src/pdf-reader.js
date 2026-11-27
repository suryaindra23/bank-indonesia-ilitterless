import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerURL;

export function mountPDF(root){
 let loading,documentPDF,renderTask,disposed=false,page=1,zoom='fit',generation=0,resizeTimer;
 const canvas=root.querySelector('canvas'),viewport=root.querySelector('.pdf-viewport'),status=root.querySelector('[data-pdf-status]'),error=root.querySelector('[data-pdf-error]'),text=root.querySelector('[data-pdf-text]'),input=root.querySelector('[name=page]');
 const controls=[...root.querySelectorAll('[data-pdf-prev],[data-pdf-next],[name=page],[name=zoom],[data-pdf-go]')];
 function update(busy){root.setAttribute('aria-busy',String(busy));controls.forEach(control=>control.disabled=busy||!documentPDF);root.querySelector('[data-pdf-prev]').disabled=busy||!documentPDF||page===1;root.querySelector('[data-pdf-next]').disabled=busy||!documentPDF||page===documentPDF.numPages;}
 function failure(message){if(disposed)return;status.textContent='';error.hidden=false;error.querySelector('span').textContent=message;canvas.hidden=true;root.setAttribute('aria-busy','false');}
 async function render(){
  const current=++generation;renderTask?.cancel();update(true);error.hidden=true;status.textContent='Menyiapkan halaman '+page+'…';
  try{
   const pdfPage=await documentPDF.getPage(page);if(disposed||current!==generation)return;
   const base=pdfPage.getViewport({scale:1}),width=Math.max(160,viewport.clientWidth-24),scale=zoom==='fit'?width/base.width:Number(zoom),view=pdfPage.getViewport({scale});
   const pixelRatio=Math.min(devicePixelRatio||1,2,Math.sqrt(16000000/(view.width*view.height)));
   canvas.width=Math.floor(view.width*pixelRatio);canvas.height=Math.floor(view.height*pixelRatio);canvas.style.width=view.width+'px';canvas.style.height=view.height+'px';canvas.hidden=false;canvas.setAttribute('aria-label','Halaman '+page+' dari '+documentPDF.numPages);
   renderTask=pdfPage.render({canvasContext:canvas.getContext('2d'),viewport:view,transform:pixelRatio===1?null:[pixelRatio,0,0,pixelRatio,0,0]});await renderTask.promise;
   if(disposed||current!==generation)return;input.value=page;input.max=documentPDF.numPages;root.querySelector('[data-pdf-count]').textContent=documentPDF.numPages;status.textContent='Halaman '+page+' dari '+documentPDF.numPages;update(false);viewport.scrollTop=0;
   const content=await pdfPage.getTextContent().catch(()=>null);if(disposed||current!==generation)return;text.textContent=content?.items.map(item=>'str'in item?item.str+(item.hasEOL?'\n':' '):'').join('')||'Teks tidak tersedia untuk halaman ini. Halaman tetap dapat dibaca pada tampilan PDF.';
  }catch(err){if(disposed||current!==generation||err.name==='RenderingCancelledException')return;update(false);failure('Halaman tidak dapat ditampilkan. Coba lagi atau buka berkas di tab baru.');}
 }
 async function load(){
  update(true);error.hidden=true;status.textContent='Memuat PDF…';
  try{
   loading=getDocument({url:root.dataset.url,cMapUrl:'/pdfjs-assets/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs-assets/standard_fonts/',wasmUrl:'/pdfjs-assets/wasm/',isEvalSupported:false,enableXfa:false});
   documentPDF=await loading.promise;if(disposed)return;page=1;await render();
  }catch(err){if(disposed)return;failure(err.name==='PasswordException'?'PDF dilindungi password. Buka berkas di tab baru untuk membacanya.':'PDF belum dapat dibaca. Berkas mungkin rusak atau sesi login berakhir. Coba lagi atau buka berkas di tab baru.');}
 }
 function click(event){if(event.target.closest('[data-pdf-prev]')){page=Math.max(1,page-1);render();}if(event.target.closest('[data-pdf-next]')){page=Math.min(documentPDF.numPages,page+1);render();}if(event.target.closest('[data-pdf-retry]')){if(documentPDF)render();else{loading?.destroy();load();}}}
 function change(event){if(event.target.name==='zoom'){zoom=event.target.value;render();}}
 function jump(event){event.preventDefault();if(!documentPDF)return;const value=Number(input.value);if(!Number.isInteger(value)||value<1||value>documentPDF.numPages){input.reportValidity();return;}page=value;render();}
 root.addEventListener('click',click);root.addEventListener('change',change);root.querySelector('form').addEventListener('submit',jump);
 let previousWidth=0;const observer=new ResizeObserver(([entry])=>{const width=Math.round(entry.contentRect.width);if(width===previousWidth)return;previousWidth=width;if(!documentPDF||zoom!=='fit')return;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!disposed)render();},120);});observer.observe(viewport);
 load();
 return ()=>{disposed=true;generation++;clearTimeout(resizeTimer);observer.disconnect();renderTask?.cancel();loading?.destroy();root.removeEventListener('click',click);root.removeEventListener('change',change);root.querySelector('form').removeEventListener('submit',jump);};
}
