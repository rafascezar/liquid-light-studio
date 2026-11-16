const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rotate=([x,y],a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
export function sourceBounds(s,shapeRatio=1){
 const r=Number(s.aspect.split(':')[0])/Number(s.aspect.split(':')[1]),ax=Math.max(r,1),ay=Math.max(1/r,1);
 return {ax,ay,cx:(.5+s.posX/100)*ax,cy:(.5+s.posY/100)*ay,w:s.size*Math.min(shapeRatio,1)*(s.stretchX??1),h:s.size*Math.min(1/shapeRatio,1)*(s.stretchY??1),angle:s.rotation*Math.PI/180};
}
export function resizeSource(s,shapeRatio,handle,point,fromCenter=false){
 const b=sourceBounds(s,shapeRatio),hx=handle.includes('e')?1:handle.includes('w')?-1:0,hy=handle.includes('n')?1:handle.includes('s')?-1:0;
 if(fromCenter){
  const local=rotate([point[0]*b.ax-b.cx,point[1]*b.ay-b.cy],-b.angle);
  const factor=hx&&hy?2*(local[0]*hx*b.w+local[1]*hy*b.h)/(b.w*b.w+b.h*b.h):hx?2*local[0]*hx/b.w:2*local[1]*hy/b.h;
  return {...s,size:clamp(s.size*Math.max(.01,factor),.01,10)};
 }
 const offset=rotate([hx*b.w/2,hy*b.h/2],b.angle),anchor=[b.cx-offset[0],b.cy-offset[1]];
 const local=rotate([point[0]*b.ax-anchor[0],point[1]*b.ay-anchor[1]],-b.angle);
 let size=s.size,sx=s.stretchX??1,sy=s.stretchY??1;
 if(hx&&hy){const factor=Math.max(.01,(local[0]*hx*b.w+local[1]*hy*b.h)/(b.w*b.w+b.h*b.h));size=clamp(s.size*factor,.01,10);}
 else if(hx)sx=clamp(sx*local[0]*hx/b.w,.02,10);
 else sy=clamp(sy*local[1]*hy/b.h,.02,10);
 const next={...s,size,stretchX:sx,stretchY:sy},n=sourceBounds(next,shapeRatio),delta=rotate([hx*n.w/2,hy*n.h/2],b.angle);
 return {...next,posX:clamp(((anchor[0]+delta[0])/b.ax-.5)*100,-200,200),posY:clamp(((anchor[1]+delta[1])/b.ay-.5)*100,-200,200)};
}
export function hitSource(field,point,tolerance=[0,0]){
 if(!field?.mask)return false;
 const x=point[0]*field.width,y=(1-point[1])*field.height;
 for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){
  if(i*i+j*j>4)continue;
  const px=Math.floor(x+i*tolerance[0]/2),py=Math.floor(y+j*tolerance[1]/2);
  if(px>=0&&py>=0&&px<field.width&&py<field.height&&field.mask[py*field.width+px])return true;
 }
 return false;
}
export function setupSourceTransform({getSettings,getView,getPoint,onChange,onMode,onSelect}){
 const frame=document.getElementById('frame'),canvas=document.getElementById('canvas'),toggle=document.getElementById('transformSource'),box=document.createElement('div');
 box.className='source-transform-box';box.tabIndex=0;box.setAttribute('role','group');box.setAttribute('aria-label','Graphic transform. Drag to move; corner handles scale; side handles stretch. Hold Shift to scale proportionally from the centre. Arrow keys nudge.');
 const handles=['nw','n','ne','e','se','s','sw','w','rotate'];
 for(const handle of handles){const el=document.createElement('button');el.type='button';el.className='source-handle handle-'+handle;el.dataset.handle=handle;el.setAttribute('aria-label',handle==='rotate'?'Rotate graphic':(handle.length===2?'Scale':'Stretch')+' graphic '+handle);box.append(el);}
 frame.append(box);let active=false,selected=false,shapeRatio=1,drag=null,sourceField=null;
 function sync(){const s=getSettings(),b=sourceBounds(s,shapeRatio),v=getView();
  box.hidden=!active||!selected;toggle.setAttribute('aria-pressed',String(active));canvas.classList.toggle('transform-source-active',active);
  box.style.left=((b.cx/b.ax-v.center[0])*v.scale+.5)*100+'%';box.style.top=(.5-(b.cy/b.ay-v.center[1])*v.scale)*100+'%';box.style.width=b.w/b.ax*v.scale*100+'%';box.style.height=b.h/b.ay*v.scale*100+'%';box.style.transform=`translate(-50%,-50%) rotate(${-s.rotation}deg)`;
 }
 function setActive(value){if(!value&&drag){const initial=drag.settings,id=drag.id;drag=null;box.classList.remove('is-dragging');if(frame.hasPointerCapture(id))frame.releasePointerCapture(id);onChange(initial,true);}active=value;if(!value)selected=false;onMode?.(value);sync();}
 document.getElementById('panPreview').addEventListener('click',()=>setActive(false));
 const point=e=>{const rect=canvas.getBoundingClientRect();return getPoint([(e.clientX-rect.left)/rect.width,1-(e.clientY-rect.top)/rect.height]);};
 frame.addEventListener('pointerdown',e=>{
  if(!active||e.button!==0||e.altKey)return;
  if(e.target!==canvas&&!box.contains(e.target))return;
  onSelect?.();e.preventDefault();e.stopImmediatePropagation();const p=point(e),s=structuredClone(getSettings());
  const view=getView(),rect=canvas.getBoundingClientRect();
  const tolerance=sourceField?[5*sourceField.width/rect.width/view.scale,5*sourceField.height/rect.height/view.scale]:[0,0];
  if(!e.target.dataset.handle&&!hitSource(sourceField,p,tolerance)){selected=false;sync();return;}
  selected=true;sync();
  drag={id:e.pointerId,start:p,settings:s,handle:e.target.dataset.handle||'move'};frame.setPointerCapture(e.pointerId);box.focus({preventScroll:true});box.classList.add('is-dragging');
 },true);
 frame.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;e.preventDefault();e.stopImmediatePropagation();const p=point(e),s=drag.settings;let next;
  if(drag.handle==='move')next={...s,posX:clamp(s.posX+(p[0]-drag.start[0])*100,-200,200),posY:clamp(s.posY+(p[1]-drag.start[1])*100,-200,200)};
  else if(drag.handle==='rotate'){
   const b=sourceBounds(s,shapeRatio),angle=q=>Math.atan2(q[1]*b.ay-b.cy,q[0]*b.ax-b.cx);let deg=s.rotation+(angle(p)-angle(drag.start))*180/Math.PI;
   if(e.shiftKey)deg=Math.round(deg/15)*15;next={...s,rotation:((deg+180)%360+360)%360-180};
  }else next=resizeSource(s,shapeRatio,drag.handle,p,e.shiftKey);
  onChange(next,false);sync();
 },true);
 function end(e){if(!drag||e.pointerId!==drag.id)return;drag=null;box.classList.remove('is-dragging');if(frame.hasPointerCapture(e.pointerId))frame.releasePointerCapture(e.pointerId);onChange(getSettings(),true);sync();}
 for(const event of ['pointerup','pointercancel','lostpointercapture'])frame.addEventListener(event,end,true);
 box.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&drag){const initial=drag.settings;drag=null;box.classList.remove('is-dragging');onChange(initial,true);sync();return;}
  if(e.key==='Escape'){selected=false;sync();return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];if(!delta)return;e.preventDefault();const s=getSettings(),step=e.shiftKey?5:.5;onChange({...s,posX:clamp(s.posX+delta[0]*step,-200,200),posY:clamp(s.posY+delta[1]*step,-200,200)},true);sync();
 });
 new ResizeObserver(sync).observe(frame);sync();
 return {sync,setActive,deselect:()=>{selected=false;sync();},setSource:field=>{sourceField=field;shapeRatio=field.shapeRatio||1;sync();},setRatio:value=>{shapeRatio=value||1;sync();},isActive:()=>active};
}
