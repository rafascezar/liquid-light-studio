import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeTrimField,trimPhase} from '../public/trim-path.js';
test('trim follows separate outer contours and holes with outward normals',()=>{
 const w=32,h=32,mask=new Uint8Array(w*h);
 for(let y=4;y<28;y++)for(let x=4;x<28;x++)mask[y*w+x]=!(x>=12&&x<20&&y>=12&&y<20);
 const field=makeTrimField(mask,w,h);assert.equal(field.contours,2);
 assert.ok(field.data.every(Number.isFinite));assert.ok(field.atlas.every(Number.isFinite));
 for(let row=0;row<2;row++){
  const [x,y,nx,ny]=field.atlas.slice(row*512*4,row*512*4+4);
  const inside=(u,v)=>mask[Math.max(0,Math.min(h-1,Math.floor((1-v)*h)))*w+Math.max(0,Math.min(w-1,Math.floor(u*w)))];
  assert.equal(inside(x+nx*.06,y+ny*.06),0);assert.equal(inside(x-nx*.06,y-ny*.06),1);
 }
});
test('offset wraps in both directions and reveal preserves full, empty and crossing ranges',()=>{
 assert.equal(trimPhase({trimIn:0,trimOut:100},0).span,1);
 assert.equal(trimPhase({trimIn:25,trimOut:25},0).span,0);
 assert.ok(Math.abs(trimPhase({trimIn:75,trimOut:25},0).span-.5)<1e-8);
 assert.equal(trimPhase({trimIn:0,trimOut:25,trimAnimate:true,trimVelocity:-90},1).start,.75);
 assert.equal(trimPhase({trimOut:100,trimReveal:'pingpong',trimDuration:4},2).span,1);
 assert.equal(trimPhase({trimOut:100,trimReveal:'pingpong',trimDuration:4},0).span,0);
});
test('empty source yields finite inert contour textures',()=>{
 const field=makeTrimField(new Uint8Array(16),4,4);assert.equal(field.contours,0);assert.ok(field.data.every(v=>v===0));
});
