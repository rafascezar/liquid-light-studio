import {test} from 'node:test';import assert from 'node:assert/strict';import {constrainView,zoomView,panView,sourceUV} from '../public/view.js';
test('preview zoom supports 10 percent through 6400 percent',()=>{const view={scale:1,center:[.5,.5]};assert.deepEqual(zoomView(view,.5),{scale:.5,center:[.5,.5]});assert.equal(zoomView(view,.01).scale,.1);assert.equal(zoomView(view,100).scale,64);});
test('zooming below 100 percent keeps the point beneath the cursor anchored',()=>{const view={scale:1,center:[.5,.5]},anchor=[.7,.6],next=zoomView(view,.5,anchor);const a=sourceUV(view,anchor),b=sourceUV(next,anchor);for(let i=0;i<2;i++)assert.ok(Math.abs(a[i]-b[i])<1e-9);});
test('zoomed-out pan bounds remain ordered and permit movement on both axes',()=>{const view={scale:.5,center:[.5,.5]},p=panView(view,.1,.1);assert.ok(p.center[0]<.5&&p.center[1]>.5);assert.deepEqual(constrainView({scale:.5,center:[-100,100]}).center,[0,1]);assert.deepEqual(constrainView({scale:2,center:[-100,100]}).center,[.25,.75]);});
test('finite artboard boundaries match renderer source edges during zoom and pan',async()=>{
 const {artboardBounds}=await import('../public/view.js');
 for(const view of [{scale:.1,center:[.5,.5]},{scale:.5,center:[.3,.7]},{scale:1,center:[.5,.5]},{scale:4,center:[.125,.875]}]){
  const b=artboardBounds(view);
  for(const [css,expected] of [[[b.left,b.top],[0,1]],[[b.left+b.width,b.top+b.height],[1,0]]]){
   const uv=sourceUV(view,[css[0],1-css[1]]);uv.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<1e-9));
  }
 }
 assert.deepEqual(artboardBounds({scale:.5,center:[.5,.5]}),{left:.25,top:.25,width:.5,height:.5});
});
