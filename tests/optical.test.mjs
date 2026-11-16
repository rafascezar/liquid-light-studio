import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {newField,cleanFields} from '../public/effect-fields.js';
import {LightEngine} from '../public/engine.js';
import {setups} from '../public/setups.js';
const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8').split('let settings=structuredClone(defaults)')[0].replace(/^import .*$/gm,'');
const context=vm.createContext({structuredClone,newField,cleanFields,sanitiseSVG:s=>s,organizePanel:()=>{}});
vm.runInContext(script+'\nglobalThis.validate=validateSettings;globalThis.initial=defaults;globalThis.defs=definitions;',context);
test('older projects default to Fluid and Optical settings survive save/open validation',()=>{
 assert.equal(context.validate({shape:'circle'}).renderMode,'fluid');
 const settings=context.validate({renderMode:'optical',shape:'svg',svg:'<svg/>',opticalStretch:1.2,opticalAngle:270,opticalInside:.25,opticalExposure:1.4});
 const reopened=context.validate(JSON.parse(JSON.stringify(settings)));
 for(const key of ['renderMode','svg','opticalStretch','opticalAngle','opticalInside','opticalExposure'])assert.equal(reopened[key],settings[key]);
 assert.equal(context.validate({opticalStretch:999}).opticalStretch,2);
});
test('all Optical controls have matching GPU uniforms and setup values stay in bounds',()=>{
 const settings=structuredClone(context.initial);settings.renderMode='optical';
 const base=LightEngine.prototype.base.call({source:{w:512,h:512},width:512,height:512,h:1/512,time:0,pointer:[0,0]},settings);
 for(const key of Object.keys(context.defs).filter(k=>k.startsWith('optical'))){const uniform=key==='opticalExposure'?'uExposure':'u'+key[0].toUpperCase()+key.slice(1);assert.equal(typeof base[uniform],'number',uniform);assert.ok(Number.isFinite(base[uniform]),uniform);}
 for(const setup of setups)for(const [key,value]of Object.entries(setup.values)){const def=context.defs[key];if(def)assert.ok(value>=def[1]&&value<=def[2],setup.id+': '+key);}
});

test('Optical setups stay near the geometry and tighten around thin marks',async()=>{
 const {fitOpticalSetup,measureSilhouette}=await import('../public/optical-fit.js');
 for(const setup of setups.filter(s=>s.geometryFit)){
  const small=fitOpticalSetup({span:.4,depth:.02},setup.geometryFit);
  const large=fitOpticalSetup({span:.8,depth:.04},setup.geometryFit);
  assert.ok(Math.abs(large.opticalOuter/small.opticalOuter-2)<.001);
  assert.ok(small.opticalOuter<=.08);
  assert.ok(small.opticalStretch<=.03);
  const thin=fitOpticalSetup({span:.4,depth:.005},setup.geometryFit);
  assert.ok(thin.opticalOuter<=.01101);
 }
 const shape=measureSilhouette({data:new Float32Array([1,1,1,1,1,-.1,-.1,1,1,-.1,-.1,1,1,1,1,1]),width:4,height:4});
 assert.equal(shape.span,.5);assert.ok(Math.abs(shape.depth-.25)<.001);
});
test('zero optical reach and edge width survive session validation',()=>{
 const s=context.validate({renderMode:'optical',opticalInner:0,opticalOuter:0,opticalStretch:0,opticalBend:0,opticalEdgeWidth:0});
 for(const key of ['opticalInner','opticalOuter','opticalStretch','opticalBend','opticalEdgeWidth'])assert.equal(s[key],0,key);
});
test('ten-stop Blue Mix survives validation and reaches the GPU without truncation',()=>{
 const settings=context.validate({preset:'blue-mix-10',stops:Array.from({length:10},(_,i)=>({colour:'#0543e6',position:i/9}))});
 assert.equal(settings.stops.length,10);
 const base=LightEngine.prototype.base.call({source:{w:512,h:512},width:512,height:512,h:1/512,time:0,pointer:[0,0]},settings);
 assert.equal(base.uStopCount,10);assert.equal(base.uStops.length,40);assert.equal(base.uStops[39],1);
});
test('each Optical starting point includes a curated palette and active motion',()=>{
 for(const setup of setups.filter(s=>s.values.renderMode==='optical')){
  assert.ok(setup.look,setup.id);
  assert.ok(setup.values.trimEnabled&&(setup.values.trimAnimate&&setup.values.trimVelocity!==0||['draw','pingpong'].includes(setup.values.trimReveal))||setup.values.opticalOrbit>0&&setup.values.opticalOrbitSpeed!==0||setup.values.opticalBreathe>0&&setup.values.opticalBreatheSpeed>0||setup.values.opticalRipple>0&&setup.values.opticalRippleSpeed!==0,setup.id);
 }
});
test('Optical collision saves independently of Fluid collision',()=>{
 const s=context.validate({renderMode:'optical',opticalCollision:true,collision:false});
 assert.equal(s.opticalCollision,true);assert.equal(context.validate(JSON.parse(JSON.stringify(s))).opticalCollision,true);
 const mock={source:{w:512,h:512},width:512,height:512,h:1/512,time:0,pointer:[0,0]};
 assert.equal(LightEngine.prototype.base.call(mock,s).uCollision,1);
 s.renderMode='fluid';assert.equal(LightEngine.prototype.base.call(mock,s).uCollision,0);
});
test('strong gradient blur survives project validation',()=>{
 const s=context.validate({gradientSmooth:5});assert.equal(s.gradientSmooth,5);assert.equal(context.validate(JSON.parse(JSON.stringify(s))).gradientSmooth,5);
});
test('source position and non-uniform scale survive cloud/project validation',()=>{
 const s=context.validate({posX:125,posY:-90,stretchX:2.4,stretchY:.35});
 const n=context.validate(JSON.parse(JSON.stringify(s)));assert.equal(n.posX,125);assert.equal(n.posY,-90);assert.equal(n.stretchX,2.4);assert.equal(n.stretchY,.35);
 const old=context.validate({shape:'svg'});assert.equal(old.stretchX,1);assert.equal(old.stretchY,1);
});
test('layer stacks, influence values and independent palettes survive save/open',()=>{
 const input={renderMode:'optical',copyCount:6,copyOffsetX:.08,pulseEnabled:true,mainInfluence:.35,copyInfluence:.8,deformType:'noise',blendMode:'screen',glassStrength:.5,innerEnabled:true,innerMapping:'inset',innerStops:[{colour:'#112233',position:0},{colour:'#abcdef',position:1}],edgeEnabled:true,edgeStops:[{colour:'#ffcc88',position:0},{colour:'#6699ff',position:1}]};
 const result=context.validate(JSON.parse(JSON.stringify(context.validate(input))));
 for(const [key,value] of Object.entries(input))assert.equal(JSON.stringify(result[key]),JSON.stringify(value),key);
 const old=context.validate({});assert.equal(old.copyCount,0);assert.equal(old.mainInfluence,0);assert.equal(old.deformAmount,0);assert.equal(old.innerEnabled,false);assert.equal(old.glassStrength,0);
});

test('Looks update Exterior, Interior and Edge palettes without sharing mutable stops',()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function applyPreset(name){'),source.indexOf("$('preset').addEventListener"));
 const settings={innerEnabled:false,edgeEnabled:false,innerStops:[{colour:'#ff0000',position:0}],edgeStops:[{colour:'#00ff00',position:0}],innerMapping:'radial',innerSoftness:2,shape:'svg',svg:'original'};
 const ctx=vm.createContext({structuredClone,settings,presets:{blue:{stops:[['#001144',0],['#55bbff',1]]}},defaults:{},brandMotion:{},syncUI:()=>{},engine:null,saveLocal:()=>{}});
 vm.runInContext(fn+"applyPreset('blue');",ctx);
 assert.equal(JSON.stringify(settings.innerStops),JSON.stringify(settings.stops));assert.equal(JSON.stringify(settings.edgeStops),JSON.stringify(settings.stops));
 assert.equal(settings.innerEnabled,true);assert.equal(settings.edgeEnabled,true);
 assert.equal(settings.innerMapping,'radial');assert.equal(settings.innerSoftness,2);assert.equal(settings.svg,'original');
 settings.innerStops[0].colour='#ffffff';assert.equal(settings.stops[0].colour,'#001144');assert.equal(settings.edgeStops[0].colour,'#001144');
});

test('trim settings survive save/open and old sessions keep the full silhouette',()=>{
 assert.equal(context.validate({}).trimEnabled,false);
 const candidate={trimEnabled:true,trimIn:12,trimOut:67,trimOffset:-80,trimAnimate:true,trimVelocity:-32,trimReveal:'pingpong',trimDuration:6,trimStyle:'line',tipMode:'both',tipAdherence:.85,tipFanStart:35,tipInside:0,tipOutside:.6,tipOnly:true};
 const reopened=context.validate(JSON.parse(JSON.stringify(context.validate(candidate))));
 for(const [key,value] of Object.entries(candidate))assert.equal(reopened[key],value,key);
});

test('fields survive session validation and legacy projects remain unrestricted',()=>{
 const old=context.validate({});assert.equal(old.fieldsEnabled,false);
 const s=context.validate({fieldsEnabled:true,fields:[{type:'box',x:22,angle:45,invert:true,blend:'subtract',width:.6}],fieldTargets:{glass:false}});
 const copy=context.validate(JSON.parse(JSON.stringify(s)));assert.equal(copy.fields[0].type,'box');assert.equal(copy.fields[0].x,22);assert.equal(copy.fields[0].invert,true);assert.equal(copy.fieldTargets.glass,false);assert.equal(copy.fieldTargets.deformation,true);
 assert.equal(context.validate({fields:[{width:-1,x:Infinity}]}).fields[0].width,.01);
});
test('field-following stretch and offset persist with saved sessions',()=>{const s=context.validate({fieldFollowStretch:false,fieldStretchOffset:75,fieldTargets:{stretch:false,deformation:true}});const n=context.validate(JSON.parse(JSON.stringify(s)));assert.equal(n.fieldFollowStretch,false);assert.equal(n.fieldStretchOffset,75);assert.equal(n.fieldTargets.stretch,false);assert.equal(context.validate({}).fieldFollowStretch,true);});
test('contour colour animation survives session validation and drives the edge shader uniform',()=>{const s=context.validate({renderMode:'optical',opticalOffset:.5,contourColourAnimate:true,contourColourWave:'sine',contourColourFrequency:1,contourColourAmount:.25,contourColourPhase:0,contourColourWidth:.4,contourColourSharpness:3});const n=context.validate(JSON.parse(JSON.stringify(s)));for(const k of ['contourColourAnimate','contourColourWave','contourColourFrequency','contourColourAmount','contourColourPhase','contourColourWidth','contourColourSharpness'])assert.equal(n[k],s[k]);const mock={source:{w:512,h:512},width:512,height:512,h:1/512,time:.25,pointer:[0,0]};assert.equal(LightEngine.prototype.base.call(mock,n).uOpticalOffset,.75);assert.equal(context.validate({}).contourColourAnimate,false);});
test('Venetian time displacement survives save/open and reaches its shader',()=>{const s=context.validate({venetian:true,effectTimeDisplacement:-.12});const n=context.validate(JSON.parse(JSON.stringify(s)));assert.equal(n.effectTimeDisplacement,-.12);const mock={source:{w:512,h:512},width:512,height:512,h:1/512,time:1,pointer:[0,0]};assert.equal(LightEngine.prototype.base.call(mock,n).uEffectTimeDisplacement,-.12);assert.equal(context.validate({}).effectTimeDisplacement,0);});

test('outward Venetian mode survives save/open and selects the normal shader path',()=>{const n=context.validate(JSON.parse(JSON.stringify(context.validate({venetian:true,effectDirection:'outward'}))));assert.equal(n.effectDirection,'outward');assert.equal(context.validate({}).effectDirection,'straight');assert.equal(context.validate({effectDirection:'invalid'}).effectDirection,'straight');const mock={source:{w:512,h:512},width:512,height:512,h:1/512,time:1,pointer:[0,0]};assert.equal(LightEngine.prototype.base.call(mock,n).uEffectNormal,1);});

test('glass transmission and reflection persist, clamp safely and allow opaque surfaces',()=>{const s=context.validate({glassStrength:1,glassTransmission:.92,glassReflection:.24});const copy=context.validate(JSON.parse(JSON.stringify(s)));assert.equal(copy.glassTransmission,.92);assert.equal(copy.glassReflection,.24);assert.equal(context.validate({glassTransmission:0}).glassTransmission,0);assert.equal(context.validate({glassTransmission:2,glassReflection:-1}).glassTransmission,1);assert.equal(context.validate({glassReflection:-1}).glassReflection,0);assert.equal(context.validate({}).glassStrength,0);});
