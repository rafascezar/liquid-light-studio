const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rotate=([x,y],a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
export function fieldAspect(aspect){const [w,h]=aspect.split(':').map(Number),r=w/h;return [Math.max(r,1),Math.max(1/r,1)];}
export function fieldToView(point,view){return [(point[0]-view.center[0])*view.scale+.5,(point[1]-view.center[1])*view.scale+.5];}
export function editField(initial,handle,start,point,aspect,uniform=false){
 const out={...initial};if(handle==='move'){out.x=clamp(initial.x+(point[0]-start[0])*100,-200,200);out.y=clamp(initial.y+(point[1]-start[1])*100,-200,200);return out;}
 const a=fieldAspect(aspect),center=[.5+initial.x/100,.5+initial.y/100],delta=p=>[(p[0]-center[0])*a[0],(p[1]-center[1])*a[1]];
 if(handle==='rotate'){const b=delta(start),p=delta(point);let deg=initial.angle+(Math.atan2(p[1],p[0])-Math.atan2(b[1],b[0]))*180/Math.PI;if(uniform)deg=Math.round(deg/15)*15;out.angle=((deg+180)%360+360)%360-180;return out;}
 const p=rotate(delta(point),-initial.angle*Math.PI/180);
 if(handle==='softness'){const radius=initial.type==='linear'?p[0]/initial.width:initial.type==='box'?Math.max(Math.abs(p[0]/initial.width),Math.abs(p[1]/initial.height)):Math.hypot(p[0]/initial.width,p[1]/initial.height);out.softness=clamp(1-radius,0,1);return out;}
 if(handle==='width')out.width=clamp(Math.abs(p[0]),.01,3);
 if(handle==='height')out.height=clamp(Math.abs(p[1]),.01,3);
 if(uniform){const factor=handle==='width'?out.width/initial.width:out.height/initial.height;out.width=clamp(initial.width*factor,.01,3);out.height=clamp(initial.height*factor,.01,3);}
 return out;
}
export function setupFieldOverlay({getSettings,getView,getPoint,panel,onChange,onMode}){
 const frame=document.getElementById('frame'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('field-overlay');svg.setAttribute('aria-label','Edit field position, size, rotation and falloff softness');svg.setAttribute('role','group');svg.tabIndex=0;frame.append(svg);
 const button=document.createElement('button');button.type='button';button.id='editFields';button.className='quiet';button.textContent='Edit fields';button.hidden=true;button.title='Drag the field centre or arrow shaft to move. Drag the wall, falloff line or arrow tip to adjust.';button.setAttribute('aria-pressed','false');document.getElementById('transformSource').after(button);
 let active=false,available=false,drag=null;
 const setDragging=value=>svg.classList.toggle('is-dragging',value);
 function setActive(value){if(!value&&drag){Object.assign(getSettings().fields[drag.index],drag.initial);const id=drag.id;drag=null;setDragging(false);if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);panel.sync();onChange(true);}active=!!value;button.setAttribute('aria-pressed',String(active));panel.setEditing(active);if(active)onMode();sync();}
 button.onclick=()=>setActive(!active);panel.onEdit(()=>setActive(!active));
 document.getElementById('transformSource').addEventListener('click',()=>setActive(false));document.getElementById('panPreview').addEventListener('click',()=>setActive(false));
 const ns='http://www.w3.org/2000/svg',el=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);return n;};
 function sync(){const s=getSettings();svg.hidden=!available||!s.fieldsEnabled;svg.style.display=svg.hidden?'none':'block';if(svg.hidden)return;const rect=frame.getBoundingClientRect(),w=rect.width,h=rect.height;if(!w||!h)return;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.replaceChildren();const aspect=fieldAspect(s.aspect),view=getView(),selected=panel.getSelected();
  const map=(f,x,y)=>{const d=rotate([x,y],f.angle*Math.PI/180),p=fieldToView([.5+f.x/100+d[0]/aspect[0],.5+f.y/100+d[1]/aspect[1]],view);return [p[0]*w,(1-p[1])*h];};
  const line=(a,b,attrs)=>el('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],...attrs});
  s.fields.map((f,i)=>({f,i})).sort((a,b)=>(a.i===selected)-(b.i===selected)).forEach(({f,i})=>{
   if(!f.enabled)return;const current=active&&i===selected,wall=f.width,falloff=f.width*(1-f.softness);
   // Broad shaft target moves the field; wall/falloff targets stay above it.
   if(current){const a=map(f,0,0),b=map(f,(f.invert?-1:1)*f.width,0);line(a,b,{stroke:'transparent','stroke-width':36,'pointer-events':'stroke','data-index':i,'data-handle':'move',class:'field-hit'});}
   const guide=(x,handle,colour,dashed=false)=>{
    const a=map(f,x,-f.height),b=map(f,x,f.height);
    line(a,b,{stroke:'transparent','stroke-width':22,'pointer-events':'stroke','data-index':i,'data-handle':handle,class:'field-hit'});
    line(a,b,{stroke:colour,'stroke-width':1.3,'stroke-dasharray':dashed?'5 4':'none','pointer-events':'none'});
   };
   if(f.type==='linear'){
    guide(wall,current?'width':'move',current?'#caffed':'#8cb6ae60');
    if(current)guide(falloff,'softness',current?'#bcffe9a0':'#8cb6ae70',true);
   }else{
    const c=map(f,0,0),x=map(f,1,0),y=map(f,0,1),transform=`matrix(${x[0]-c[0]} ${x[1]-c[1]} ${y[0]-c[0]} ${y[1]-c[1]} ${c[0]} ${c[1]})`;
    const outline=(scale,handle,colour,dashed=false)=>{
     const shape=f.type==='box'?{x:-f.width*scale,y:-f.height*scale,width:2*f.width*scale,height:2*f.height*scale}:{cx:0,cy:0,rx:f.width*scale,ry:f.height*scale};
     const tag=f.type==='box'?'rect':'ellipse',base={...shape,transform,fill:'none','vector-effect':'non-scaling-stroke'};
     el(tag,{...base,stroke:'transparent','stroke-width':22,'pointer-events':'stroke','data-index':i,'data-handle':handle,class:'field-hit'});
     el(tag,{...base,stroke:colour,'stroke-width':1.3,'stroke-dasharray':dashed?'5 4':'none','pointer-events':'none'});
    };
    outline(1,'move',current?'#caffed':'#8cb6ae60');
    if(current)outline(Math.max(.0001,1-f.softness),'softness',current?'#bcffe9a0':'#8cb6ae70',true);
    if(current)for(const [x,y,handle]of [[f.width,0,'width'],[-f.width,0,'width'],[0,f.height,'height'],[0,-f.height,'height']]){
     const p=map(f,x,y);el('circle',{cx:p[0],cy:p[1],r:13,fill:'transparent','pointer-events':'all','data-index':i,'data-handle':handle,class:'field-hit'});
     el('circle',{cx:p[0],cy:p[1],r:3.5,fill:'#17231f',stroke:'#d2fff1','stroke-width':1.2,'pointer-events':'none'});
    }
   }
   if(!current){const p=map(f,0,0);el('circle',{cx:p[0],cy:p[1],r:22,fill:'transparent','pointer-events':'all','data-index':i,'data-handle':'move',class:'field-hit'});el('circle',{cx:p[0],cy:p[1],r:3,fill:'#a5d8c988','pointer-events':'none'});return;}
   const center=map(f,0,0),direction=f.invert?-1:1,tip=map(f,direction*f.width,0);
   if(f.type!=='linear'){const dx=tip[0]-center[0],dy=tip[1]-center[1],len=Math.hypot(dx,dy)||1;tip[0]+=dx/len*38;tip[1]+=dy/len*38;}
   line(center,tip,{stroke:'#caffed','stroke-width':1.3,'pointer-events':'none'});
   const dx=tip[0]-center[0],dy=tip[1]-center[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
   el('path',{d:`M${tip[0]-ux*9-uy*5} ${tip[1]-uy*9+ux*5}L${tip[0]} ${tip[1]}L${tip[0]-ux*9+uy*5} ${tip[1]-uy*9-ux*5}`,fill:'none',stroke:'#caffed','stroke-width':1.5,'pointer-events':'none'});
   // Invisible arrow hit area rotates the field; centre moves it.
   el('circle',{cx:tip[0],cy:tip[1],r:18,fill:'transparent','pointer-events':'all','data-index':i,'data-handle':'rotate',class:'field-hit'});
   el('circle',{cx:center[0],cy:center[1],r:Math.min(26,Math.max(8,len*.35)),fill:'transparent','pointer-events':'all','data-index':i,'data-handle':'move',class:'field-hit'});
   el('circle',{cx:center[0],cy:center[1],r:5,fill:'#17231f',stroke:'#d2fff1','stroke-width':1.3,'pointer-events':'none'});
  });
 }
 frame.addEventListener('pointerdown',e=>{if(e.button===0&&!e.altKey&&!e.target.closest('.field-hit')&&active)setActive(false);},true);
 const point=e=>{const r=frame.getBoundingClientRect();return getPoint([(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height]);};
 svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.altKey)return;const hit=e.target.closest('[data-index]');if(!hit)return;const i=Number(hit.dataset.index);if(!Number.isInteger(i)||!getSettings().fields[i]?.enabled)return;e.preventDefault();e.stopPropagation();const handle=active&&i===panel.getSelected()?hit.dataset.handle||'move':'move';setActive(true);panel.select(i);const f=getSettings().fields[i];drag={id:e.pointerId,index:i,handle,initial:{...f},start:point(e)};setDragging(true);svg.setPointerCapture(e.pointerId);svg.focus({preventScroll:true});sync();});
 svg.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();const next=editField(drag.initial,drag.handle,drag.start,point(e),getSettings().aspect,e.shiftKey);Object.assign(getSettings().fields[drag.index],next);onChange(false);sync();});
 const end=e=>{if(drag?.id!==e.pointerId)return;drag=null;setDragging(false);if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);panel.sync();onChange(true);sync();};for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,end);
 svg.addEventListener('keydown',e=>{if(e.key==='Escape'){if(drag){Object.assign(getSettings().fields[drag.index],drag.initial);const id=drag.id;drag=null;setDragging(false);if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);panel.sync();onChange(true);}else setActive(false);sync();return;}const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];if(!d)return;e.preventDefault();e.stopPropagation();const f=getSettings().fields[panel.getSelected()];if(!f)return;const step=e.shiftKey?5:.5;f.x=clamp(f.x+d[0]*step,-200,200);f.y=clamp(f.y+d[1]*step,-200,200);panel.sync();onChange(true);sync();});
 new ResizeObserver(sync).observe(frame);sync();return {sync,setAvailable:value=>{available=!!value;if(!available)setActive(false);else sync();},setActive,isActive:()=>active};
}
