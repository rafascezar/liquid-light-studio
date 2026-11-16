import {test} from 'node:test';import assert from 'node:assert/strict';
import {opticalLayer,opticalStack} from '../public/optical-layers.js';
const base={pulseStagger:.2,pulseSpeed:.25,pulseEnabled:false,copySpacing:.2,copyOffsetX:.03,copyOffsetY:-.02,copyRotation:10,copyOpacity:.7,layerOpacity:.8,pulseFade:1.4,pulseExpansion:.8,mainPulseInfluence:0,deformOffset:.6,mainInfluence:.25,copyInfluence:.9};
test('copies have independent transforms and preserve main geometry',()=>{
 const main=opticalLayer(base,0,1),copy=opticalLayer(base,3,1);
 assert.equal(main.scale,1);assert.deepEqual(main.offset,[0,0]);assert.equal(main.influence,.25);
 assert.equal(copy.scale,1.6);assert.ok(Math.abs(copy.offset[0]-.09)<1e-8);assert.equal(copy.influence,.9);assert.ok(Math.abs(copy.phase-1.8)<1e-8);
});
test('pulse phases are staggered, deterministic and wrap without non-finite values',()=>{
 const s={...base,pulseEnabled:true};const a=opticalLayer(s,1,1),b=opticalLayer(s,2,1);
 assert.notEqual(a.age,b.age);assert.deepEqual(a,opticalLayer(s,1,1));
 for(const time of [0,.01,3.999,4,4000])for(let i=0;i<=12;i++){
  const v=opticalLayer(s,i,time);assert.ok(Number.isFinite(v.scale));assert.ok(v.opacity>=0&&v.opacity<=1);assert.ok(v.age>=0&&v.age<1);
 }
 assert.equal(opticalLayer(s,1,0).opacity,0);assert.equal(opticalLayer(s,0,1).scale,1);
});

test('axis spread offsets copies in both directions independently and leaves main fixed',()=>{
 const s={...base,copyOffsetX:0,copyOffsetY:0,copySpreadX:.1,copySpreadY:.2};
 assert.deepEqual(opticalLayer(s,0,1).offset,[0,0]);
 for(const [i,factor] of [[1,1],[2,-1],[3,2],[4,-2]]){
  assert.deepEqual(opticalLayer(s,i,1).offset,[.1*factor,.2*factor]);
  assert.equal(opticalLayer({...s,copySpreadX:0},i,1).offset[0],0);
  assert.equal(opticalLayer({...s,copySpreadY:0},i,1).offset[1],0);
 }
 assert.deepEqual(opticalLayer({...s,copyOffsetX:.05,copyOffsetY:.05},2,1).offset,[0,-.1]);
});

test('copy stack can render behind or in front while retaining pulse depth order',()=>{
 for(const pulseEnabled of [false,true]){
  const s={...base,copyCount:4,pulseEnabled};
  const behind=opticalStack(s,1),front=opticalStack({...s,copyOrder:'front'},1);
  assert.equal(behind.at(-1).index,0);assert.equal(front[0].index,0);
  assert.deepEqual(behind.slice(0,-1),front.slice(1));
  assert.equal(new Set(front.map(v=>v.index)).size,5);
 }
});

test('main pulse influence blends expansion and fade with the copy envelope',()=>{
 for(const time of [0,.2,1,3.99,4]){
  const s={...base,pulseEnabled:true,copyCount:4,mainPulseInfluence:1};
  const main=opticalLayer(s,0,time),copy=opticalLayer(s,1,time),steady=opticalLayer({...s,mainPulseInfluence:0},0,time),half=opticalLayer({...s,mainPulseInfluence:.5},0,time);
  assert.equal(main.scale,copy.scale);assert.ok(Math.abs(main.opacity*base.copyOpacity-copy.opacity)<1e-10);
  assert.equal(steady.scale,1);assert.equal(steady.opacity,base.layerOpacity);
  assert.ok(Math.abs(half.opacity-(main.opacity+steady.opacity)/2)<1e-10);
 }
});
test('contour pulses keep main geometry and opacity fixed even when copy pulses are active',()=>{
 const s={...base,pulseEnabled:true,contourPulse:true,mainPulseInfluence:1};
 for(const time of [0,.2,1,3.99,4]){const main=opticalLayer(s,0,time);assert.equal(main.scale,1);assert.equal(main.opacity,base.layerOpacity);assert.deepEqual(main.offset,[0,0]);}
});
