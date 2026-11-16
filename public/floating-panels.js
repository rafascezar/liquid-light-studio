// Positioning is UI-only: the original sections and their control listeners move intact.
export function clampPanelPosition(x,y,width,viewport){
 return {x:Math.max(8,Math.min(Number(x)||8,Math.max(8,viewport.width-width-8))),y:Math.max(60,Math.min(Number(y)||60,Math.max(60,viewport.height-96)))};
}
export function setupFloatingPanels({sections,panel,utilities}){
 const key='liquid-light-studio-2-floating-panels',layer=document.createElement('div');layer.className='floating-panels';document.querySelector('.workspace').append(layer);
 let positions={};try{const value=JSON.parse(localStorage.getItem(key)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))positions=value;}catch{}
 const homes=new Map(),buttons=new Map();let drag=null,z=30,suppress=null;
 const viewport=()=>({width:innerWidth,height:innerHeight});
 function save(){try{localStorage.setItem(key,JSON.stringify(positions));}catch{}}
 function place(section,x,y){const p=clampPanelPosition(x,y,section.getBoundingClientRect().width||320,viewport());section.style.left=p.x+'px';section.style.top=p.y+'px';section.style.setProperty('--floating-top',p.y+'px');positions[section.id]=p;}
 function float(section){
  if(homes.has(section))return;
  const rect=section.getBoundingClientRect(),home=document.createComment(section.id+' dock');section.before(home);homes.set(section,home);
  section.style.width=Math.min(rect.width||320,innerWidth-16)+'px';layer.append(section);section.classList.add('floating-control-panel');buttons.get(section).hidden=false;place(section,rect.left,rect.top);
 }
 function dock(section){const home=homes.get(section);if(!home)return;home.replaceWith(section);homes.delete(section);section.classList.remove('floating-control-panel');for(const prop of ['left','top','width','z-index','--floating-top'])section.style.removeProperty(prop);buttons.get(section).hidden=true;delete positions[section.id];save();}
 function finish(cancel=false){if(!drag)return;const d=drag;drag=null;if(d.moved){suppress=d.section;if(cancel){if(d.wasFloating)place(d.section,d.original.x,d.original.y);else dock(d.section);}save();setTimeout(()=>{if(suppress===d.section)suppress=null;},0);}d.header.classList.remove('moving-panel');if(d.header.hasPointerCapture?.(d.id))d.header.releasePointerCapture(d.id);}
 for(const section of sections){
  const header=section.querySelector(':scope > summary'),grip=header.querySelector('.panel-grip');if(grip){grip.draggable=false;grip.title='Drag to move · Arrow keys move floating panels';}
  header.title='Drag to move this panel';
  const dockButton=document.createElement('button');dockButton.type='button';dockButton.className='dock-control-panel';dockButton.textContent='↩';dockButton.title='Return to stack';dockButton.setAttribute('aria-label','Return '+(header.querySelector('span')?.textContent||'panel')+' to stack');dockButton.hidden=true;header.querySelector('.section-summary-actions')?.prepend(dockButton);if(!dockButton.parentNode)header.append(dockButton);buttons.set(section,dockButton);
  dockButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();dock(section);});
  header.addEventListener('click',e=>{if(suppress===section){e.preventDefault();e.stopImmediatePropagation();suppress=null;}},true);
  header.addEventListener('pointerdown',e=>{
   if(e.button!==0||e.target.closest('button,input,select,a')&&!e.target.closest('.panel-grip'))return;
   const r=section.getBoundingClientRect();drag={section,header,id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false,wasFloating:homes.has(section),original:{x:r.left,y:r.top}};header.setPointerCapture(e.pointerId);
  });
  header.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||drag.section!==section)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<5)return;if(!drag.moved){drag.moved=true;float(section);header.setPointerCapture(e.pointerId);section.style.zIndex=String(++z);header.classList.add('moving-panel');}e.preventDefault();place(section,drag.left+dx,drag.top+dy);});
  header.addEventListener('pointerup',()=>finish());header.addEventListener('pointercancel',()=>finish(true));header.addEventListener('lostpointercapture',()=>finish());
  header.addEventListener('keydown',e=>{if(!homes.has(section)||!e.target.matches('.panel-grip'))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dock(section);return;}const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();e.stopPropagation();const p=positions[section.id],step=e.shiftKey?30:10;place(section,p.x+delta[0]*step,p.y+delta[1]*step);save();}},true);
  section.addEventListener('pointerdown',()=>{if(homes.has(section))section.style.zIndex=String(++z);});
 }
 const restored={...positions};positions={};for(const s of sections){const p=restored[s.id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){float(s);place(s,p.x,p.y);}}
 window.addEventListener('resize',()=>{for(const s of homes.keys()){s.style.width=Math.min(320,innerWidth-16)+'px';const p=positions[s.id];place(s,p.x,p.y);}save();});
 const reset=document.createElement('button');reset.type='button';reset.textContent='Reset panel positions';reset.onclick=()=>{for(const s of [...homes.keys()])dock(s);};utilities.append(reset);
 return {dockAll:()=>reset.click()};
}
