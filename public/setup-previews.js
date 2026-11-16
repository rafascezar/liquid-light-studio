import {LightEngine} from './engine.js?v=radial-core-62';
import {makeSourceField} from './geometry.js?v=trim-42';
import {fitOpticalSetup} from './optical-fit.js?v=geometry-12';
// A single isolated low-resolution renderer: thumbnails never reset the user's live flow.
export function setupStartingPointPreviews({makeSnapshot,setups}){
 const gallery=document.getElementById('startingPointsUI');if(!gallery)return;
 let engine,canvas,generation=0,running=false,unavailable=false;const pending=new Set(),cache=new Map();
 const cards=[...gallery.querySelectorAll('[data-setup]')],byId=new Map(setups.map(s=>[s.id,s]));
 const yieldUI=()=>new Promise(r=>setTimeout(r,12));
 function dispose(){try{engine?.gl.getExtension('WEBGL_lose_context')?.loseContext();}catch{}engine=null;canvas=null;}
 async function drain(){
  if(running||unavailable)return;running=true;
  try{
   if(!engine){canvas=document.createElement('canvas');engine=new LightEngine(canvas);}
   while(pending.size&&gallery.open){
    const card=pending.values().next().value;pending.delete(card);if(card.hidden)continue;
    const version=generation,setup=byId.get(card.dataset.setup);if(!setup)continue;
    const snapshot=makeSnapshot(setup),key=setup.id+JSON.stringify(snapshot);let url=cache.get(key);
    if(!url){
     const [rw,rh]=snapshot.aspect.split(':').map(Number),ratio=rw/rh;
     engine.configure(ratio,128);
     const source=await makeSourceField(snapshot,Math.round(ratio>=1?384:384*ratio),Math.round(ratio>=1?384/ratio:384));
     if(version!==generation||!gallery.open)continue;
     engine.setSource(source);
     if(setup.geometryFit){Object.assign(snapshot,fitOpticalSetup(engine.source.metrics,setup.geometryFit));if(snapshot.innerEnabled)snapshot.innerDepth=Math.max(.002,engine.source.metrics.depth*.95);}
     if(snapshot.renderMode==='optical')engine.step(snapshot,1.5);else for(let i=0;i<45;i++){engine.step(snapshot,1/30);if(i%5===0){await yieldUI();if(version!==generation||!gallery.open)break;}}
     if(version!==generation||!gallery.open)continue;
     const w=Math.round(ratio>=1?320:320*ratio),h=Math.round(ratio>=1?320/ratio:320),frame=engine.capturePixels(snapshot,w,h,snapshot.bgAlpha),output=document.createElement('canvas');output.width=w;output.height=h;output.getContext('2d').putImageData(new ImageData(frame.pixels,w,h),0,0);url=output.toDataURL('image/webp',.78);cache.set(key,url);
     if(cache.size>100)cache.delete(cache.keys().next().value);
    }
    if(version===generation){const art=card.querySelector('.setup-art');let img=art.querySelector('img');if(!img){img=document.createElement('img');img.alt='';art.append(img);}img.src=url;card.dataset.preview='rendered';}
    await yieldUI();
   }
  }catch(error){unavailable=true;dispose();console.info('Starting point artwork previews unavailable:',error.message);}
  finally{running=false;}
 }
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&gallery.open){pending.add(entry.target);}drain();},{root:gallery,rootMargin:'100px'});cards.forEach(c=>observer.observe(c));
 function refresh(){generation++;pending.clear();if(!gallery.open)return;cards.forEach(c=>{if(!c.hidden){const r=c.getBoundingClientRect(),g=gallery.getBoundingClientRect();if(r.bottom>=g.top&&r.top<=g.bottom+100)pending.add(c);}});drain();}
 gallery.addEventListener('toggle',()=>{refresh();if(!gallery.open){generation++;pending.clear();}});
 gallery.addEventListener('input',refresh);gallery.addEventListener('change',refresh);gallery.querySelectorAll('[data-gallery-mode]').forEach(b=>b.addEventListener('click',refresh));
 window.addEventListener('pagehide',dispose,{once:true});
}
