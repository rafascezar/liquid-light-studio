import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sessions} from '../server/sessions.js';
const records=new Map();
const bucket={put:async(key,value,meta)=>records.set(key,{value,customMetadata:meta.customMetadata}),get:async key=>records.has(key)?{text:async()=>records.get(key).value,body:records.get(key).value,customMetadata:records.get(key).customMetadata}:null,list:async({prefix})=>({objects:[...records].filter(([key])=>key.startsWith(prefix)).map(([key,obj])=>({key,customMetadata:obj.customMetadata})),truncated:false})};
const request=(user,method='GET',data)=>new Request('https://example.test/api/sessions',{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
test('cloud snapshots persist SVG and settings and are isolated by account',async()=>{
 const project={format:'liquid-light-studio',version:1,settings:{svg:'<svg/>',flowSpeed:.24},exportOptions:{animationFps:'30'}};
 const saved=await sessions(request('rafa','POST',{name:'Glass study',project}),bucket);assert.equal(saved.status,201);const {id}=await saved.json();
 assert.equal((await (await sessions(request('rafa'),bucket)).json()).sessions.length,1);
 assert.equal((await (await sessions(request('other'),bucket)).json()).sessions.length,0);
 assert.equal((await sessions(request('other'),bucket,id)).status,404);
 assert.deepEqual((await (await sessions(request('rafa'),bucket,id)).json()).project,project);
 const second=await (await sessions(request('rafa','POST',{name:'Glass study',project}),bucket)).json();assert.notEqual(second.id,id);
});
test('anonymous, malformed and foreign-origin writes are rejected',async()=>{
 assert.equal((await sessions(request(null),bucket)).status,401);
 assert.equal((await sessions(request('rafa','POST',{name:'Broken'}),bucket)).status,400);
 assert.equal((await sessions(request('rafa'),bucket,'../../other')).status,400);
 const foreign=new Request('https://example.test/api/sessions',{method:'POST',headers:{'oai-authenticated-user-id':'rafa',origin:'https://elsewhere.test'},body:'{}'});
 assert.equal((await sessions(foreign,bucket)).status,403);
});

test('saved session previews are listed once, served as images and isolated by account',async()=>{const thumbnail='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1sAAAAASUVORK5CYII=',project={format:'liquid-light-studio',version:1,settings:{shape:'circle'}};const saved=await sessions(request('preview-owner','POST',{name:'Blue glass',project,thumbnail}),bucket);assert.equal(saved.status,201);const {id}=await saved.json();const list=await (await sessions(request('preview-owner'),bucket)).json();assert.equal(list.sessions.length,1);assert.equal(list.sessions[0].thumbnail,true);const get=user=>new Request('https://example.test/api/sessions/'+id+'?thumbnail=1',{headers:{'oai-authenticated-user-id':user}});const response=await sessions(get('preview-owner'),bucket,id);assert.equal(response.headers.get('Content-Type'),'image/png');assert.ok(response.headers.get('Cache-Control').startsWith('private'));assert.ok((await response.arrayBuffer()).byteLength>0);assert.equal((await sessions(get('other-owner'),bucket,id)).status,404);});
test('session preview accepts only bounded raster image data',async()=>{const project={format:'liquid-light-studio',version:1,settings:{}};for(const thumbnail of ['https://example.test/x.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,'+'A'.repeat(250004)])assert.equal((await sessions(request('preview-owner','POST',{name:'Invalid',project,thumbnail}),bucket)).status,400);});
