// Keep the entire title bar and resize grip reachable after orientation/viewport changes.
export function constrainFloatingRect(rect, viewport){
 const margin=8,left=(viewport.x||0)+margin,top=(viewport.y||0)+margin;
 const maxWidth=Math.max(1,viewport.width-margin*2),maxHeight=Math.max(1,viewport.height-margin*2);
 const width=Math.min(maxWidth,Math.max(Math.min(260,maxWidth),rect.width));
 const height=Math.min(maxHeight,Math.max(Math.min(180,maxHeight),rect.height));
 return {x:Math.min(left+maxWidth-width,Math.max(left,rect.x)),y:Math.min(top+maxHeight-height,Math.max(top,rect.y)),width,height};
}
export function setupFloatingPreview({well,onResize,onDetach}){
 const $=id=>document.getElementById(id),toggle=$('detachPreview');
 const header=document.createElement('div');header.className='floating-preview-header';header.hidden=true;
 header.innerHTML='<button type="button" class="floating-preview-move" aria-label="Move preview window. Arrow keys move it.">⠿ <span>Preview</span></button><button type="button" class="floating-preview-play" aria-label="Pause animation">Ⅱ</button><button type="button" class="floating-preview-max" aria-pressed="false">Maximize</button><button type="button" class="floating-preview-dock">Dock</button>';
 const footer=document.createElement('div');footer.className='floating-preview-footer';footer.hidden=true;
 footer.innerHTML='<span>Drag the header to move</span><button type="button" class="floating-preview-resize" aria-label="Resize preview window. Arrow keys resize it.">Resize ↘</button>';
 well.prepend(header);well.append(footer);
 const move=header.querySelector('.floating-preview-move'),maximize=header.querySelector('.floating-preview-max'),dock=header.querySelector('.floating-preview-dock'),play=header.querySelector('.floating-preview-play'),grip=footer.querySelector('button');
 let floating=false,maximized=false,rect=null,restoreRect=null,gesture=null;
 const viewport=()=>({x:window.visualViewport?.offsetLeft||0,y:window.visualViewport?.offsetTop||0,width:window.visualViewport?.width||window.innerWidth,height:window.visualViewport?.height||window.innerHeight});
 function paint(){
  if(!floating)return;
  const v=viewport();rect=constrainFloatingRect(maximized?{x:v.x,y:v.y,width:v.width,height:v.height}:rect,v);
  Object.assign(well.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
  maximize.textContent=maximized?'Restore':'Maximize';maximize.setAttribute('aria-pressed',String(maximized));
  move.disabled=maximized;grip.disabled=maximized;onResize();
 }
 function setFloating(value){
  if(value===floating)return;
  if(value){
   onDetach();const v=viewport(),aspect=Number($('frame').style.getPropertyValue('--aspect'))||16/9;
   const width=Math.min(640,v.width-24),height=Math.min(v.height-24,width/aspect+78);
   rect=rect||{x:v.x+(v.width-width)/2,y:v.y+Math.min(100,Math.max(8,(v.height-height)/3)),width,height};
  }
  floating=value;maximized=false;gesture=null;
  well.classList.toggle('is-floating',value);document.body.classList.toggle('preview-floating',value);
  header.hidden=footer.hidden=!value;toggle.setAttribute('aria-pressed',String(value));toggle.textContent=value?'Dock preview':'Float preview';
  if(value){paint();move.focus({preventScroll:true});}
  else{for(const key of ['left','top','width','height'])well.style.removeProperty(key);onResize();toggle.focus({preventScroll:true});}
 }
 toggle.addEventListener('click',()=>setFloating(!floating));dock.addEventListener('click',()=>setFloating(false));
 maximize.addEventListener('click',()=>{if(!maximized)restoreRect={...rect};else rect=restoreRect||rect;maximized=!maximized;paint();});
 play.addEventListener('click',()=>{$('pauseBtn').click();});
 function syncPlay(){const label=$('pauseBtn').getAttribute('aria-label')||'Pause animation';play.setAttribute('aria-label',label);play.textContent=label.startsWith('Play')?'▶':'Ⅱ';}
 new MutationObserver(syncPlay).observe($('pauseBtn'),{attributes:true,attributeFilter:['aria-label']});syncPlay();
 for(const [handle,kind] of [[move,'move'],[grip,'resize']]){
  handle.addEventListener('pointerdown',event=>{
   if(event.button!==0||maximized||gesture)return;event.preventDefault();gesture={id:event.pointerId,kind,x:event.clientX,y:event.clientY,rect:{...rect}};handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove',event=>{
   if(!gesture||gesture.id!==event.pointerId)return;event.preventDefault();const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,start=gesture.rect;
   if(kind==='move')rect={...start,x:start.x+dx,y:start.y+dy};
   else{const v=viewport();rect={...start,width:Math.min(start.width+dx,v.x+v.width-8-start.x),height:Math.min(start.height+dy,v.y+v.height-8-start.y)};}
   paint();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,event=>{if(gesture?.id===event.pointerId){gesture=null;if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);}});
  handle.addEventListener('keydown',event=>{
   if(maximized)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!delta)return;event.preventDefault();const step=event.shiftKey?30:10;
   rect=kind==='move'?{...rect,x:rect.x+delta[0]*step,y:rect.y+delta[1]*step}:{...rect,width:rect.width+delta[0]*step,height:rect.height+delta[1]*step};paint();
  });
 }
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&floating&&!document.querySelector('dialog[open]')){if(maximized){rect=restoreRect||rect;maximized=false;paint();}else setFloating(false);}});
 window.addEventListener('resize',paint);window.visualViewport?.addEventListener('resize',paint);window.visualViewport?.addEventListener('scroll',paint);
 return {dock:()=>setFloating(false),isFloating:()=>floating,chromeHeight:()=>floating?header.offsetHeight+footer.offsetHeight:0};
}
