import {setupFloatingPreview} from './floating-preview.js?v=floating-40';
import {sourceUV,zoomView,panView,artboardBounds} from './view.js?v=artboard-24';
// View sizing is independent of the artwork and export dimensions.
export function setupWorkspace(onResize=()=>{}){
 const $=id=>document.getElementById(id),root=$('workspace'),divider=$('panelDivider'),well=$('stageWell'),frame=$('frame');
 let floatingPreview;
 const overlay=document.body.classList.contains('studio-v2');const layoutKey=overlay?'liquid-light-overlay-layout-v1':'liquid-light-layout-v1';let panelWidth=overlay?320:340,drag=null,expanded=false,fitPending=false;
 try{const saved=Number(localStorage.getItem(layoutKey));if(saved>=260&&saved<=560)panelWidth=saved;}catch{}
 const limits=()=>({min:260,max:Math.max(260,Math.min(560,root.clientWidth-330))});
 function saveLayout(){try{localStorage.setItem(layoutKey,String(panelWidth));}catch{}}
 function setPanelWidth(value,persist=false){
  const {min,max}=limits();panelWidth=Math.round(Math.max(min,Math.min(max,value)));
  root.style.setProperty('--panel-width',`${panelWidth}px`);divider.setAttribute('aria-valuenow',String(panelWidth));divider.setAttribute('aria-valuemin',String(min));divider.setAttribute('aria-valuemax',String(max));
  if(persist)saveLayout();scheduleFit();
 }
 function fitFrame(aspect=Number(frame.style.getPropertyValue('--aspect'))||16/9){
  const css=getComputedStyle(well),width=well.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),height=well.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-(floatingPreview?.chromeHeight()||0);
  if(width<=0||height<=0)return;
  const w=Math.max(1,Math.min(width,height*aspect));frame.style.width=`${w}px`;frame.style.height=`${w/aspect}px`;onResize();
 }
 function scheduleFit(){if(fitPending)return;fitPending=true;requestAnimationFrame(()=>{fitPending=false;fitFrame();});}
 function setExpanded(value){
  if(value)floatingPreview?.dock();
  expanded=value;document.body.classList.toggle('preview-expanded',expanded);$('expandPreview').textContent=expanded?'Restore view':'Expand preview';$('expandPreview').setAttribute('aria-pressed',String(expanded));scheduleFit();
 }
 function endDrag(event){
  if(!drag||event.pointerId!==drag.id)return;const id=drag.id;drag=null;
  document.body.classList.remove('resizing-panels');if(divider.hasPointerCapture?.(id))divider.releasePointerCapture(id);saveLayout();
 }
 divider.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;event.preventDefault();drag={id:event.pointerId,x:event.clientX,width:panelWidth};divider.setPointerCapture(event.pointerId);document.body.classList.add('resizing-panels');
 });
 divider.addEventListener('pointermove',event=>{if(drag&&event.pointerId===drag.id)setPanelWidth(drag.width+drag.x-event.clientX);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])divider.addEventListener(type,endDrag);
 divider.addEventListener('dblclick',()=>setPanelWidth(340,true));
 divider.addEventListener('keydown',event=>{
  const {min,max}=limits(),next={ArrowLeft:panelWidth+20,ArrowRight:panelWidth-20,Home:min,End:max,Enter:340}[event.key];
  if(next!==undefined){event.preventDefault();setPanelWidth(next,true);}
 });
 $('expandPreview').addEventListener('click',()=>setExpanded(!expanded));
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded&&!document.querySelector('dialog[open]'))setExpanded(false);});
 window.addEventListener('resize',()=>setPanelWidth(panelWidth));
 new ResizeObserver(scheduleFit).observe(well);
 floatingPreview=setupFloatingPreview({well,onResize:scheduleFit,onDetach:()=>setExpanded(false)});

 let view={scale:1,center:[.5,.5]},panMode=false,viewDrag=null;
 const canvas=$('canvas'),zoomInput=$('previewZoom');
 const boundary=overlay?document.createElement('div'):null;
 if(boundary){boundary.className='artboard-boundary';boundary.setAttribute('aria-hidden','true');frame.append(boundary);}
 function syncBoundary(){
  if(!boundary)return;frame.classList.toggle('view-scaled',Math.abs(view.scale-1)>.000001);
  const bounds=artboardBounds(view);for(const key of ['left','top','width','height'])boundary.style[key]=`${bounds[key]*100}%`;
 }
 // Pasteboard clicks never edit the artwork; zoom and pan remain available.
 frame.addEventListener('pointerdown',event=>{
  if(!boundary||panMode||event.altKey||event.button===1)return;
  const r=canvas.getBoundingClientRect(),uv=sourceUV(view,[(event.clientX-r.left)/r.width,1-(event.clientY-r.top)/r.height]);
  if(uv.some(n=>n<0||n>1)){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 function syncView(){syncBoundary();zoomInput.value=Math.round(view.scale*100);canvas.classList.toggle('pan-mode',panMode);$('panPreview').setAttribute('aria-pressed',String(panMode));onResize();}
 function setZoom(percent,anchor=[.5,.5]){view=zoomView(view,Number(percent)/100,anchor);syncView();}
 function resetView(){view={scale:1,center:[.5,.5]};panMode=false;syncView();}
 zoomInput.addEventListener('change',()=>setZoom(zoomInput.value));
 $('zoomIn').addEventListener('click',()=>setZoom(view.scale*200));$('zoomOut').addEventListener('click',()=>setZoom(view.scale*50));$('fitPreview').addEventListener('click',resetView);
 $('panPreview').addEventListener('click',()=>{panMode=!panMode;syncView();});
 frame.addEventListener('wheel',event=>{event.preventDefault();const rect=canvas.getBoundingClientRect();setZoom(view.scale*100*Math.exp(-Math.max(-200,Math.min(200,event.deltaY))*.004),[(event.clientX-rect.left)/rect.width,1-(event.clientY-rect.top)/rect.height]);},{passive:false});
 frame.addEventListener('pointerdown',event=>{
  if(!(panMode||event.altKey||event.button===1))return;
  event.preventDefault();event.stopImmediatePropagation();viewDrag={id:event.pointerId,x:event.clientX,y:event.clientY,view:{scale:view.scale,center:[...view.center]}};frame.setPointerCapture(event.pointerId);canvas.classList.add('panning');
 },true);
 frame.addEventListener('pointermove',event=>{
  if(!viewDrag||event.pointerId!==viewDrag.id)return;event.preventDefault();event.stopImmediatePropagation();const rect=canvas.getBoundingClientRect();view=panView(viewDrag.view,(event.clientX-viewDrag.x)/rect.width,(event.clientY-viewDrag.y)/rect.height);syncView();
 },true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])frame.addEventListener(type,event=>{if(viewDrag?.id===event.pointerId){viewDrag=null;canvas.classList.remove('panning');}},true);

 const imageViewport=$('pngViewport'),img=$('pngPreview'),imageSteps=[25,50,100,200,400,800,1600,3200,6400];let imageZoom='fit',imageDrag=null;
 function setImageZoom(value,anchor){
  const rect=imageViewport.getBoundingClientRect(),point=anchor||[rect.width/2,rect.height/2],nw=img.naturalWidth||1,nh=img.naturalHeight||1;
  const oldScale=imageZoom==='fit'?Math.min(rect.width/nw,rect.height/nh):Number(imageZoom)/100;
  const ox=imageZoom==='fit'?(rect.width-nw*oldScale)/2:0,oy=imageZoom==='fit'?(rect.height-nh*oldScale)/2:0;
  const source=[(imageViewport.scrollLeft+point[0]-ox)/oldScale,(imageViewport.scrollTop+point[1]-oy)/oldScale];
  imageZoom=value==='fit'?'fit':String(Math.max(25,Math.min(6400,Number(value)||100)));
  imageViewport.classList.toggle('is-actual',imageZoom!=='fit');$('imageZoom').value=imageZoom;
  $('fitImage').setAttribute('aria-pressed',String(imageZoom==='fit'));$('actualImage').setAttribute('aria-pressed',String(imageZoom==='100'));
  if(imageZoom==='fit'){img.style.removeProperty('width');img.style.removeProperty('height');imageViewport.scrollLeft=0;imageViewport.scrollTop=0;}
  else{const scale=Number(imageZoom)/100;img.style.width=`${nw*scale}px`;img.style.height=`${nh*scale}px`;imageViewport.scrollLeft=source[0]*scale-point[0];imageViewport.scrollTop=source[1]*scale-point[1];}
 }
 $('fitImage').addEventListener('click',()=>setImageZoom('fit'));$('actualImage').addEventListener('click',()=>setImageZoom('100'));$('imageZoom').addEventListener('change',()=>setImageZoom($('imageZoom').value));
 imageViewport.addEventListener('wheel',event=>{
  event.preventDefault();const rect=imageViewport.getBoundingClientRect(),current=imageZoom==='fit'?Math.min(rect.width/(img.naturalWidth||1),rect.height/(img.naturalHeight||1))*100:Number(imageZoom);
  const next=event.deltaY<0?(imageSteps.find(step=>step>current+.01)||6400):([...imageSteps].reverse().find(step=>step<current-.01)||25);
  setImageZoom(String(next),[event.clientX-rect.left,event.clientY-rect.top]);
 },{passive:false});
 imageViewport.addEventListener('pointerdown',event=>{if(imageZoom==='fit'||event.button>1)return;event.preventDefault();imageDrag={id:event.pointerId,x:event.clientX,y:event.clientY,left:imageViewport.scrollLeft,top:imageViewport.scrollTop};imageViewport.setPointerCapture(event.pointerId);imageViewport.classList.add('panning');});
 imageViewport.addEventListener('pointermove',event=>{if(imageDrag?.id===event.pointerId){imageViewport.scrollLeft=imageDrag.left+imageDrag.x-event.clientX;imageViewport.scrollTop=imageDrag.top+imageDrag.y-event.clientY;}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])imageViewport.addEventListener(type,()=>{imageDrag=null;imageViewport.classList.remove('panning');});
 img.addEventListener('load',()=>setImageZoom('fit'));
 const dialogs=[['exportDialog','expandExport'],['animationDialog','expandAnimation']];
 function expandDialog(dialog,button,value){dialog.classList.toggle('is-expanded',value);button.setAttribute('aria-pressed',String(value));button.textContent=value?'Restore size':'Expand';}
 for(const [id,buttonId]of dialogs){
  const dialog=$(id),button=$(buttonId);
  button.addEventListener('click',()=>expandDialog(dialog,button,!dialog.classList.contains('is-expanded')));
  dialog.addEventListener('close',()=>expandDialog(dialog,button,false));
 }
 function reset(){
  floatingPreview.dock();setExpanded(false);setPanelWidth(340,true);resetView();setImageZoom('fit');
  for(const [id,buttonId]of dialogs){const dialog=$(id);dialog.style.removeProperty('width');dialog.style.removeProperty('height');expandDialog(dialog,$(buttonId),false);}
 }
 setPanelWidth(panelWidth);setImageZoom('fit');syncView();scheduleFit();
 return {disablePan:()=>{panMode=false;syncView();},fitFrame,fitImage:()=>setImageZoom('fit'),getView:()=>({scale:view.scale,center:[...view.center]}),sourcePoint:point=>sourceUV(view,point),reset};
}
