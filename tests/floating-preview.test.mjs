import {test} from 'node:test';
import assert from 'node:assert/strict';
import {constrainFloatingRect} from '../public/floating-preview.js';
test('a floating window remains fully reachable when a phone rotates',()=>{
 const portrait=constrainFloatingRect({x:20,y:510,width:370,height:300},{width:390,height:844});
 const landscape=constrainFloatingRect(portrait,{width:844,height:390});
 assert.ok(landscape.y>=8);assert.ok(landscape.y+landscape.height<=382);
 const back=constrainFloatingRect({...landscape,width:800},{width:390,height:844});
 assert.ok(back.x>=8);assert.ok(back.x+back.width<=382);
});
test('keyboard and zoom viewport offsets keep the drag bar on screen',()=>{
 const v={x:100,y:200,width:320,height:250};
 const rect=constrainFloatingRect({x:-500,y:-500,width:600,height:600},v);
 assert.deepEqual(rect,{x:108,y:208,width:304,height:234});
});
test('minimum window dimensions yield to a smaller available viewport',()=>{
 const rect=constrainFloatingRect({x:0,y:0,width:1,height:1},{width:200,height:150});
 assert.deepEqual(rect,{x:8,y:8,width:184,height:134});
});
