import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {mergeSetup} from '../public/setup-state.js';
import {restorePanelOrder} from '../public/studio-ui.js';
import {newField,cleanFields} from '../public/effect-fields.js';
import {setups} from '../public/setups.js';
const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8').split('let settings=structuredClone(defaults)')[0].replace(/^import .*$/gm,'');
const context=vm.createContext({structuredClone,newField,cleanFields,sanitiseSVG:s=>s,organizePanel:()=>{}});
vm.runInContext(script+'\nglobalThis.validate=validateSettings;globalThis.initial=defaults;globalThis.palettes=presets;',context);
test('all starting points merge, validate and roundtrip through legacy project schema',()=>{
 const current={...structuredClone(context.initial),svg:'<svg/>',sourceName:'PS.svg'};
 assert.equal(new Set(setups.map(s=>s.id)).size,setups.length);
 assert.ok(setups.length>=40);
 for(const setup of setups){const merged=mergeSetup(context.initial,current,setup,context.palettes,{keepSource:false});const clean=context.validate(merged);const round=context.validate(JSON.parse(JSON.stringify(clean)));assert.equal(JSON.stringify(round),JSON.stringify(clean),setup.id);assert.equal(clean.renderMode,setup.values.renderMode||'fluid');assert.equal(clean.svg,'<svg/>');assert.ok(clean.stops.length>=2&&clean.stops.length<=10);}
});
test('starting points preserve source transform and all independent colours only when requested',()=>{
 const current={...structuredClone(context.initial),shape:'svg',svg:'<svg/>',sourceName:'Blobby.svg',size:3.4,posX:-24,rotation:0,background:'#123456',stops:[{colour:'#123456',position:0},{colour:'#fedcba',position:1}],innerEnabled:true,innerStops:[{colour:'#abcdef',position:0},{colour:'#123456',position:1}]};
 const setup=setups.find(s=>s.id==='v2-midnight');const before=JSON.stringify(current);
 const kept=mergeSetup(context.initial,current,setup,context.palettes,{keepSource:true,keepColours:true});
 for(const key of ['size','posX','svg','sourceName','rotation','background','stops','innerEnabled','innerStops'])assert.deepEqual(kept[key],current[key],key);
 const replaced=mergeSetup(context.initial,current,setup,context.palettes,{keepSource:false,keepColours:false});assert.equal(replaced.size,setup.values.size);assert.equal(replaced.background,'#000000');assert.notDeepEqual(replaced.stops,current.stops);
 kept.stops[0].colour='#000000';assert.equal(JSON.stringify(current),before);
});
test('panel order ignores stale IDs, duplicates and malformed persisted values',()=>{
 assert.deepEqual(restorePanelOrder(['shape','colour','fields'],['fields','missing','fields']),['fields','shape','colour']);assert.deepEqual(restorePanelOrder(['shape','colour'],{}),['shape','colour']);
});
test('UI redesign does not change rendering files or session schema',()=>{
 const ui=readFileSync(new URL('../public/studio-ui.js',import.meta.url),'utf8');assert.ok(!ui.includes('new LightEngine'));assert.ok(ui.includes("localStorage.getItem(layoutKey)"));assert.ok(ui.includes('keepSetupSource'));assert.ok(ui.includes('venetianSection'));
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');assert.ok(app.includes("const storageKey='liquid-light-studio-v1'"));assert.ok(app.includes("format:'liquid-light-studio',version:1"));
});
test('floating panel bounds keep headers reachable after a viewport shrink',async()=>{
 const {clampPanelPosition}=await import('../public/floating-panels.js');
 assert.deepEqual(clampPanelPosition(1700,950,320,{width:1000,height:700}),{x:672,y:604});
 assert.deepEqual(clampPanelPosition(-90,-40,320,{width:1920,height:1080}),{x:8,y:60});
});
