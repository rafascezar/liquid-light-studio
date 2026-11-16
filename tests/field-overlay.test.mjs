import {test} from 'node:test';import assert from 'node:assert/strict';
import {editField,fieldToView,fieldAspect} from '../public/field-overlay.js';import {newField,fieldUniforms} from '../public/effect-fields.js';
test('field screen mapping follows the same pan and zoom as the artwork',()=>{assert.deepEqual(fieldToView([.6,.4],{scale:2,center:[.6,.4]}),[.5,.5]);assert.deepEqual(fieldAspect('9:16'),[1,16/9]);});
test('dragging moves field coordinates independently of source geometry',()=>{const f=newField();const moved=editField(f,'move',[.5,.5],[.7,.3],'16:9');assert.ok(Math.abs(moved.x-20)<1e-8);assert.ok(Math.abs(moved.y+20)<1e-8);assert.equal(moved.width,f.width);assert.equal(f.x,0);});
test('resizing uses aspect and local rotation, with Shift preserving proportions',()=>{const f={...newField(),angle:90,width:.2,height:.4};const width=editField(f,'width',[.5,.7],[.5,.8],'16:9',true);assert.ok(Math.abs(width.width-.3)<1e-8);assert.ok(Math.abs(width.height-.6)<1e-8);});
test('field rotation snaps and remains finite when dragging across angle seam',()=>{const f=newField();const n=editField(f,'rotate',[.6,.5],[.5,.7],'1:1',true);assert.equal(n.angle,90);});
test('Colour target is opt-in and independently selectable from deformation',()=>{const s={fieldsEnabled:true,fields:[newField()],fieldTargets:{colour:true,deformation:false}};const u=fieldUniforms(s);assert.equal(u.uFieldTargets&32,32);assert.equal(u.uFieldTargets&1,0);assert.equal(fieldUniforms({...s,fieldTargets:{}}).uFieldTargets&32,0);});
test('falloff handle changes softness without moving or resizing the field',()=>{const f={...newField('linear'),width:.4};const soft=editField(f,'softness',[.7,.5],[.6,.5],'1:1');assert.ok(Math.abs(soft.softness-.75)<1e-9);assert.equal(soft.width,.4);assert.equal(soft.x,0);assert.equal(editField(f,'softness',[.7,.5],[.5,.5],'1:1').softness,1);assert.equal(editField(f,'softness',[.7,.5],[1,.5],'1:1').softness,0);});
test('falloff handle follows field rotation and canvas aspect',()=>{const f={...newField('linear'),angle:90,width:.4};const next=editField(f,'softness',[.5,.9],[.5,.7],'16:9');assert.ok(Math.abs(next.softness-.5)<1e-9);});
test('falloff line responds only along the field direction',()=>{for(const type of ['linear']){const f={...newField(type),width:.4,height:.2};const n=editField(f,'softness',[.7,.5],[.6,.6],'1:1');assert.ok(Math.abs(n.softness-.75)<1e-9);assert.equal(n.width,.4);assert.equal(n.height,.2);}});

test('radial falloff follows an elliptical contour on every side',()=>{const f={...newField('radial'),width:.4,height:.2};for(const p of [[.7,.5],[.3,.5],[.5,.6],[.5,.4]])assert.ok(Math.abs(editField(f,'softness',[.5,.5],p,'1:1').softness-.5)<1e-9);});
test('box falloff follows rectangular sides and corners under rotation',()=>{const f={...newField('box'),width:.4,height:.2,angle:90};for(const p of [[.4,.7],[.6,.3],[.5,.7]])assert.ok(Math.abs(editField(f,'softness',[.5,.5],p,'1:1').softness-.5)<1e-9);});

test('preview field outlines select directly, respect navigation and hide handles on click-away',async()=>{
 const {setupFieldOverlay}=await import('../public/field-overlay.js');
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.listeners={};this.style={};const classes=new Set();this.classList={add:v=>classes.add(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)};}
  setAttribute(k,v){this.attrs[k]=v;if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}
  append(n){this.children.push(n);}after(){}replaceChildren(){this.children=[];}addEventListener(k,fn){this.listeners[k]=fn;}
  getBoundingClientRect(){return {left:0,top:0,width:800,height:450};}closest(s){return s==='[data-index]'&&this.dataset.index!==undefined||s==='.field-hit'&&this.attrs.class==='field-hit'?this:null;}
  setPointerCapture(){}hasPointerCapture(){return false;}focus(){}
 }
 const oldDocument=globalThis.document,oldObserver=globalThis.ResizeObserver,nodes={frame:new Node('frame'),transformSource:new Node('button'),panPreview:new Node('button')};
 globalThis.document={getElementById:id=>nodes[id],createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag)};
 globalThis.ResizeObserver=class{observe(){}};
 try{
  const settings={fieldsEnabled:true,aspect:'16:9',fields:[newField('radial'),newField('box'),newField('linear')]};let selected=0,activated=0;
  const overlay=setupFieldOverlay({getSettings:()=>settings,getView:()=>({scale:1,center:[.5,.5]}),getPoint:p=>p,panel:{getSelected:()=>selected,select:i=>{selected=i;},setEditing(){},sync(){},onEdit(){}},onChange(){},onMode:()=>activated++});
  const svg=nodes.frame.children[0];assert.equal(overlay.isActive(),false);assert.equal(svg.hidden,true);overlay.setAvailable(true);assert.equal(svg.hidden,false);
  assert.ok(svg.children.some(n=>n.tag==='ellipse'));assert.ok(svg.children.some(n=>n.tag==='rect'));assert.ok(svg.children.some(n=>n.tag==='line'));
  assert.ok(!svg.children.some(n=>n.dataset.handle==='rotate'));
  const hit=svg.children.find(n=>n.tag==='ellipse'&&n.dataset.index==='0');const down={button:0,target:hit,pointerId:1,clientX:600,clientY:225,preventDefault(){},stopPropagation(){}};
  svg.listeners.pointerdown({...down,altKey:true});assert.equal(activated,0);
  svg.listeners.pointerdown(down);assert.equal(activated,1);assert.equal(overlay.isActive(),true);assert.ok(svg.children.some(n=>n.dataset.handle==='rotate'));
  svg.listeners.pointermove({...down,clientX:640});assert.ok(Math.abs(settings.fields[0].x-5)<1e-8);svg.listeners.pointerup(down);
  nodes.frame.listeners.pointerdown({button:0,target:new Node('canvas')});assert.equal(overlay.isActive(),false);assert.ok(!svg.children.some(n=>n.dataset.handle==='rotate'));overlay.setAvailable(false);assert.equal(svg.hidden,true);
 }finally{globalThis.document=oldDocument;globalThis.ResizeObserver=oldObserver;}
});

test('mask preview dragging keeps the initial grab offset and clamps field position',async()=>{const {moveFieldInMask}=await import('../public/fields-panel.js');const initial={x:20,y:-10,width:.4};const p=moveFieldInMask(initial,[.7,.3],[.75,.4]);assert.ok(Math.abs(p.x-25)<1e-9);assert.ok(Math.abs(p.y)<1e-9);assert.equal(p.width,.4);assert.equal(initial.x,20);assert.equal(moveFieldInMask(initial,[0,0],[10,-10]).x,200);assert.equal(moveFieldInMask(initial,[0,0],[10,-10]).y,-200);});
