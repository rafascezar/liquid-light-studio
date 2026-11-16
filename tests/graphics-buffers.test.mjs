import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LightEngine} from '../public/engine.js';
function graphics({rejectFloat=false,rejectAll=false}={}){
 let format;const allocations=[];
 const gl={TEXTURE_2D:1,TEXTURE_MIN_FILTER:2,TEXTURE_MAG_FILTER:3,NEAREST:4,LINEAR:5,TEXTURE_WRAP_S:6,TEXTURE_WRAP_T:7,CLAMP_TO_EDGE:8,RGBA32F:9,RGBA16F:10,RGBA:11,FLOAT:12,HALF_FLOAT:13,FRAMEBUFFER:14,COLOR_ATTACHMENT0:15,FRAMEBUFFER_COMPLETE:16,
 createTexture:()=>({}),bindTexture(){},texParameteri(){},texImage2D(...args){format=args[2];allocations.push(format);},createFramebuffer:()=>({}),bindFramebuffer(){},framebufferTexture2D(){},checkFramebufferStatus(){return rejectAll||rejectFloat&&format===9?0:16;},deleteTexture(){},deleteFramebuffer(){}};
 const engine=Object.assign(Object.create(LightEngine.prototype),{gl,floatBuffers:true,targets:[],clear(){}});
 return {engine,allocations};
}
test('falls back to a renderable half-float target when full-float allocation fails',()=>{
 const {engine,allocations}=graphics({rejectFloat:true});const target=engine.target(512,288,true);
 assert.deepEqual(allocations,[engine.gl.RGBA32F,engine.gl.RGBA16F]);assert.equal(target.w,512);assert.equal(engine.targets.length,1);
});
test('reports unavailable graphics targets instead of retaining an incomplete framebuffer',()=>{
 const {engine}=graphics({rejectAll:true});assert.throws(()=>engine.target(512,288,true),/Graphics buffer unavailable/);assert.equal(engine.targets.length,0);
});
test('a rejected GPU draw surfaces as an error instead of a successful live frame',()=>{
 let bound=false;
 const engine=Object.assign(Object.create(LightEngine.prototype),{vao:{},programs:{copy:{program:{},uniforms:[]}},gl:{TRIANGLES:4,FRAMEBUFFER:1,NO_ERROR:0,useProgram(){},bindFramebuffer(){},viewport(){},bindVertexArray(){bound=true;},drawArrays(){assert.equal(bound,true);},getError:()=>0x502}});
 assert.throws(()=>engine.draw('copy',null,{},392,221),/copy graphics draw failed \(WebGL 0x502\)/);
 assert.equal(engine.programs.copy.verified,undefined);
});
test('uniform uploads respect the array length exposed by the linked shader',()=>{
 let uploaded;
 const engine=Object.assign(Object.create(LightEngine.prototype),{vao:{},programs:{display:{program:{},uniforms:[{name:'uStops',type:4,size:2,location:{}}]}},gl:{FLOAT_VEC4:4,NO_ERROR:0,TRIANGLES:5,useProgram(){},bindFramebuffer(){},viewport(){},uniform4fv(_,value){uploaded=value;},getError:()=>0,bindVertexArray(){},drawArrays(){}}});
 engine.draw('display',null,{uStops:new Float32Array(40)},392,221);
 assert.equal(uploaded.length,8);assert.equal(engine.programs.display.verified,true);
});
test('a failed default-framebuffer draw retries offscreen and presents the completed image',()=>{
 const calls=[],offscreen={framebuffer:{},w:392,h:221};
 const gl={INVALID_OPERATION:0x502,READ_FRAMEBUFFER:1,DRAW_FRAMEBUFFER:2,FRAMEBUFFER:3,COLOR_BUFFER_BIT:4,NEAREST:5,NO_ERROR:0,bindFramebuffer(...args){calls.push(['bind',...args]);},blitFramebuffer(...args){calls.push(['blit',...args]);},getError:()=>0};
 const engine=Object.assign(Object.create(LightEngine.prototype),{gl,targets:[],target(w,h,full,byte){assert.equal(byte,true);return offscreen;},draw(name,target,values){calls.push(['draw',target,values]);if(!target)throw Object.assign(new Error('Rejected'),{gpuStage:'draw',gpuCode:0x502});}});
 const values={uBackgroundAlpha:.3};engine.presentFluid('display',values,392,221);engine.presentFluid('display',values,392,221);
 assert.equal(calls.filter(c=>c[0]==='draw'&&c[1]===null).length,1);
 assert.equal(calls.filter(c=>c[0]==='draw'&&c[1]===offscreen).length,2);
 assert.equal(calls.filter(c=>c[0]==='blit').length,2);
 assert.ok(calls.filter(c=>c[0]==='draw').every(c=>c[2]===values));
});
test('palette is rebuilt only when its colour inputs change',()=>{
 let bakes=0;const engine=Object.assign(Object.create(LightEngine.prototype),{maxSize:4096,target:(w,h)=>({w,h}),base:()=>({}),draw(){bakes++;}});
 const settings={colourMode:'gradient',stops:[{colour:'#ffffff',position:0}],gradientSmooth:.5};
 engine.preparePalette(settings);engine.preparePalette({...settings,time:1});assert.equal(bakes,1);
 engine.preparePalette({...settings,gradientSmooth:2});assert.equal(bakes,2);
 engine.preparePalette({...settings,stops:[{colour:'#000000',position:0}]});assert.equal(bakes,3);
});
test('Optical independently caches interior and edge ramps and rebakes edited colours',()=>{
 const calls=[];let inner=[1,0,0,0],edge=[0,1,0,0];
 const engine=Object.assign(Object.create(LightEngine.prototype),{maxSize:4096,preparePalette(){},target:(w,h)=>({w,h}),base:()=>({uInnerStops:inner,uInnerCount:1,uInnerSoftness:2,uEdgeStops:edge,uEdgeCount:1,uGradientSmooth:.5}),draw(name,target,values){calls.push({target,values});}});
 engine.prepareOpticalPalettes({});engine.prepareOpticalPalettes({});assert.equal(calls.length,2);
 inner=[0,0,1,0];engine.prepareOpticalPalettes({});assert.equal(calls.length,3);
 assert.equal(calls[2].target,engine.opticalPalettes.inner.target);assert.deepEqual(calls[2].values.uStops,inner);assert.equal(calls[2].values.uGradientSmooth,2);
 edge=[1,1,0,0];engine.prepareOpticalPalettes({});assert.equal(calls.length,4);assert.equal(calls[3].target,engine.opticalPalettes.edge.target);
});
