import {test} from 'node:test';import assert from 'node:assert/strict';
import {sourceBounds,resizeSource} from '../public/source-transform.js';
const base={aspect:'16:9',size:.5,stretchX:1,stretchY:1,posX:0,posY:0,rotation:0};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('corner scaling preserves proportions and opposite anchor',()=>{
 const b=sourceBounds(base,2),anchor=[b.cx-b.w/2,b.cy-b.h/2];
 const n=resizeSource(base,2,'ne',[(anchor[0]+b.w*2)/b.ax,(anchor[1]+b.h*2)/b.ay]),v=sourceBounds(n,2);
 near(n.size,1);near(v.cx-v.w/2,anchor[0]);near(v.cy-v.h/2,anchor[1]);near(v.w/v.h,2);
});
test('side handles stretch one axis and preserve the opposite edge',()=>{
 const b=sourceBounds(base,2),n=resizeSource(base,2,'e',[(b.cx+b.w)/b.ax,b.cy/b.ay]),v=sourceBounds(n,2);
 near(n.stretchX,1.5);near(n.stretchY,1);near(v.cx-v.w/2,b.cx-b.w/2);near(v.cy,b.cy);
});
test('rotated resize works in local graphic axes',()=>{
 const s={...base,rotation:90},b=sourceBounds(s,1);
 const n=resizeSource(s,1,'e',[b.cx/b.ax,(b.cy+b.w)/b.ay]),v=sourceBounds(n,1);
 near(n.stretchX,1.5);near(v.cy-v.w/2,b.cy-b.w/2);near(v.cx,b.cx);
});
test('selection follows visible geometry and excludes empty space and holes',async()=>{
 const {hitSource}=await import('../public/source-transform.js');const mask=new Uint8Array(100);
 for(let y=2;y<8;y++)for(let x=2;x<8;x++)mask[y*10+x]=1;mask[5*10+5]=0;
 const field={mask,width:10,height:10};assert.equal(hitSource(field,[.25,.75]),true);assert.equal(hitSource(field,[.55,.45]),false);assert.equal(hitSource(field,[.05,.95]),false);assert.equal(hitSource(field,[-.1,.5]),false);
});

test('Shift scales all handles uniformly from the centre, including rotated stretched graphics',()=>{
 for(const handle of ['ne','sw','n','e','s','w'])for(const rotation of [0,37,90]){
  const s={...base,posX:23,posY:-14,rotation,stretchX:1.8,stretchY:.6},b=sourceBounds(s,2);
  const hx=handle.includes('e')?1:handle.includes('w')?-1:0,hy=handle.includes('n')?1:handle.includes('s')?-1:0;
  const x=hx*b.w,y=hy*b.h,point=[(b.cx+x*Math.cos(b.angle)-y*Math.sin(b.angle))/b.ax,(b.cy+x*Math.sin(b.angle)+y*Math.cos(b.angle))/b.ay];
  const n=resizeSource(s,2,handle,point,true),v=sourceBounds(n,2);
  near(n.size,s.size*2);near(v.cx,b.cx);near(v.cy,b.cy);near(v.w,b.w*2);near(v.h,b.h*2);near(n.stretchX,s.stretchX);near(n.stretchY,s.stretchY);
 }
});
