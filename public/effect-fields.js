// Canvas-space effect masks. Coordinates are independent of preview zoom.
export const FIELD_LIMIT=4;
export const FIELD_TARGETS={deformation:1,venetian:2,emission:4,turbulence:8,glass:16,colour:32,stretch:64};
export const newField=(type='radial')=>({type,blend:'max',x:0,y:0,width:.35,height:.35,angle:0,softness:.5,centerSoftness:.2,strength:1,invert:false,enabled:true});
const clamp=(v,a,b,f)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):f;
export function cleanFields(value){return (Array.isArray(value)?value:[]).slice(0,FIELD_LIMIT).map(f=>{f=f&&typeof f==='object'?f:{};return {...newField(),type:['radial','box','linear'].includes(f.type)?f.type:'radial',blend:['max','add','multiply','subtract'].includes(f.blend)?f.blend:'max',x:clamp(f.x,-200,200,0),y:clamp(f.y,-200,200,0),width:clamp(f.width,.01,3,.35),height:clamp(f.height,.01,3,.35),angle:clamp(f.angle,-180,180,0),softness:clamp(f.softness,0,1,.5),centerSoftness:clamp(f.centerSoftness,0,1,.2),strength:clamp(f.strength,0,1,1),invert:f.invert===true,enabled:f.enabled!==false};});}
export function fieldUniforms(s){
 const fields=cleanFields(s.fields).filter(f=>f.enabled),shape=new Float32Array(16),transform=new Float32Array(16),options=new Float32Array(16);
 fields.forEach((f,i)=>{shape.set([['radial','box','linear'].indexOf(f.type),f.width,f.height,f.softness],i*4);transform.set([.5+f.x/100,.5+f.y/100,f.angle*Math.PI/180,f.strength],i*4);options.set([['max','add','multiply','subtract'].indexOf(f.blend),f.invert?1:0,f.centerSoftness,0],i*4);});
 return {uFieldFollowStretch:s.fieldFollowStretch!==false?1:0,uFieldStretchOffset:clamp(s.fieldStretchOffset,-180,180,0)*Math.PI/180,uFieldCount:s.fieldsEnabled?fields.length:0,uFieldTargets:Object.entries(FIELD_TARGETS).reduce((n,[key,bit])=>n+((key==='colour'?s.fieldTargets?.colour===true:s.fieldTargets?.[key]!==false)?bit:0),0),uFieldShape:shape,uFieldTransform:transform,uFieldOptions:options};
}
export function sampleFields(fields,uv,aspect=[1,1],prepared=false){
 let result=0;let index=0;
 for(const f of (prepared?fields:cleanFields(fields)).filter(f=>f.enabled)){
  const dx=(uv[0]-.5-f.x/100)*aspect[0],dy=(uv[1]-.5-f.y/100)*aspect[1],a=f.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=(c*dx+s*dy)/f.width,y=(-s*dx+c*dy)/f.height;
  let t=f.type==='linear'?Math.max(0,Math.min(1,.5-x*.5)):1-Math.max(0,Math.min(1,((f.type==='box'?Math.max(Math.abs(x),Math.abs(y)):Math.hypot(x,y))-(1-f.softness))/Math.max(f.softness,.0001)));
  if(f.type!=='linear')t=t*t*(3-2*t);else t=t*(1-f.softness)+t*t*(3-2*t)*f.softness;
  if(f.invert)t=1-t;t*=f.strength;
  result=index===0?(f.blend==='subtract'?1-t:t):f.blend==='add'?Math.min(1,result+t):f.blend==='multiply'?result*t:f.blend==='subtract'?Math.max(0,result-t):Math.max(result,t);index++;
 }return index?result:1;
}
// Analytic field normals also work in constant-strength interiors, where the
// numerical gradient of the falloff would be zero.
export function sampleFieldDirection(fields,uv,aspect=[1,1]){
 const list=cleanFields(fields).filter(f=>f.enabled);if(!list.length||sampleFields(list,uv,aspect)<=.00001)return [0,0];
 let v=[0,0],fallback=[1,0],strongest=-1;
 for(let i=0;i<list.length;i++){
  const f=list[i],a=f.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=(uv[0]-.5-f.x/100)*aspect[0],dy=(uv[1]-.5-f.y/100)*aspect[1],x=(c*dx+s*dy)/f.width,y=(-s*dx+c*dy)/f.height;
  let n=f.type==='linear'?[1,0]:f.type==='box'?(Math.abs(Math.abs(x)-Math.abs(y))<.00001?[Math.sign(x)/f.width,Math.sign(y)/f.height]:Math.abs(x)>Math.abs(y)?[Math.sign(x)/f.width,0]:[0,Math.sign(y)/f.height]):[x/f.width,y/f.height];
  if(Math.hypot(...n)<.00001)n=[1,0];const len=Math.hypot(...n),sign=(f.invert?-1:1)*(f.blend==='subtract'?-1:1);n=[(c*n[0]-s*n[1])/len*sign,(s*n[0]+c*n[1])/len*sign];
  const weight=sampleFields([{...f,blend:'max'}],uv,aspect);if(weight>strongest){strongest=weight;fallback=n;}
  if(i===0)v=n.map(x=>x*weight);else if(f.blend==='max'){if(weight>=Math.hypot(...v))v=n.map(x=>x*weight);}else v=[v[0]+n[0]*weight,v[1]+n[1]*weight];
 }
 const len=Math.hypot(...v);return len>.00001?v.map(x=>x/len):fallback;
}
// Fade the radial direction's strength continuously at its singular centre.
export function sampleFieldCore(fields,uv,aspect=[1,1]){
 let sum=0,total=0;
 for(const f of cleanFields(fields).filter(f=>f.enabled)){
  const weight=sampleFields([{...f,blend:'max'}],uv,aspect);let core=1;
  if(f.type==='radial'&&f.centerSoftness>0){const a=f.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=(uv[0]-.5-f.x/100)*aspect[0],y=(uv[1]-.5-f.y/100)*aspect[1];const r=Math.hypot((c*x+s*y)/f.width,(-s*x+c*y)/f.height),t=Math.max(0,Math.min(1,r/f.centerSoftness));core=t*t*(3-2*t);}
  sum+=core*weight;total+=weight;
 }return total>.00001?sum/total:1;
}
export const fieldGLSL=`
uniform int uFieldCount,uFieldTargets,uFieldFollowStretch;
uniform float uFieldStretchOffset;
uniform vec4 uFieldShape[4],uFieldTransform[4],uFieldOptions[4];
float effectField(vec2 uv,vec2 aspect,int target){
 if(uFieldCount==0||(uFieldTargets & target)==0)return 1.0;
 float value=0.0;
 for(int i=0;i<4;i++){
  if(i>=uFieldCount)break;
  vec4 shape=uFieldShape[i],tr=uFieldTransform[i],op=uFieldOptions[i];
  vec2 p=(uv-tr.xy)*aspect;float c=cos(tr.z),s=sin(tr.z);p=mat2(c,-s,s,c)*p/shape.yz;
  float distance=shape.x<.5?length(p):max(abs(p.x),abs(p.y));
  float t=shape.x>1.5?clamp(.5-p.x*.5,0.0,1.0):1.0-smoothstep(1.0-shape.w,1.0-shape.w+max(shape.w,.0001),distance);
  if(shape.x>1.5)t=mix(t,t*t*(3.0-2.0*t),shape.w);
  if(op.y>.5)t=1.0-t;t*=tr.w;
  if(i==0)value=op.x>2.5?1.0-t:t;
  else if(op.x<.5)value=max(value,t);
  else if(op.x<1.5)value=min(1.0,value+t);
  else if(op.x<2.5)value*=t;
  else value=max(0.0,value-t);
 }return clamp(value,0.0,1.0);
}
float effectFieldCore(vec2 uv,vec2 aspect){
 if(uFieldCount==0||uFieldFollowStretch==0||(uFieldTargets & 64)==0)return 1.0;
 float sum=0.0,total=0.0;
 for(int i=0;i<4;i++){
  if(i>=uFieldCount)break;
  vec4 sh=uFieldShape[i],tr=uFieldTransform[i],op=uFieldOptions[i];float c=cos(tr.z),s=sin(tr.z);
  vec2 p=mat2(c,-s,s,c)*((uv-tr.xy)*aspect)/sh.yz;
  float d=sh.x<.5?length(p):max(abs(p.x),abs(p.y));
  float t=sh.x>1.5?clamp(.5-p.x*.5,0.0,1.0):1.0-smoothstep(1.0-sh.w,1.0-sh.w+max(sh.w,.0001),d);
  if(sh.x>1.5)t=mix(t,t*t*(3.0-2.0*t),sh.w);
  if(op.y>.5)t=1.0-t;t*=tr.w;
  float core=sh.x<.5&&op.z>0.0?smoothstep(0.0,max(op.z,.0001),length(p)):1.0;
  sum+=t*core;total+=t;
 }return total>.00001?sum/total:1.0;
}
vec2 effectFieldDirection(vec2 uv,vec2 aspect){
 if(uFieldCount==0||(uFieldTargets & 64)==0||uFieldFollowStretch==0||effectField(uv,aspect,64)<=.00001)return vec2(0);
 vec2 value=vec2(0),fallback=vec2(1,0);float strongest=-1.0;
 for(int i=0;i<4;i++){
  if(i>=uFieldCount)break;
  vec4 sh=uFieldShape[i],tr=uFieldTransform[i],op=uFieldOptions[i];float c=cos(tr.z),s=sin(tr.z);
  vec2 p=mat2(c,-s,s,c)*((uv-tr.xy)*aspect)/sh.yz;
  float distance=sh.x<.5?length(p):max(abs(p.x),abs(p.y));
  float t=sh.x>1.5?clamp(.5-p.x*.5,0.0,1.0):1.0-smoothstep(1.0-sh.w,1.0-sh.w+max(sh.w,.0001),distance);
  if(sh.x>1.5)t=mix(t,t*t*(3.0-2.0*t),sh.w);
  vec2 normal=sh.x>1.5?vec2(1,0):p/sh.yz;
  if(sh.x>.5&&sh.x<1.5){
   normal=abs(abs(p.x)-abs(p.y))<.00001?sign(p)/sh.yz:abs(p.x)>abs(p.y)?vec2(sign(p.x)/sh.y,0):vec2(0,sign(p.y)/sh.z);
  }
  if(length(normal)<.00001)normal=vec2(1,0);
  normal=mat2(c,s,-s,c)*normalize(normal);
  if(op.y>.5){t=1.0-t;normal=-normal;}
  if(op.x>2.5)normal=-normal;t*=tr.w;
  if(t>strongest){strongest=t;fallback=normal;}
  if(i==0)value=normal*t;
  else if(op.x<.5){if(t>=length(value))value=normal*t;}
  else value+=normal*t;
 }
 vec2 direction=length(value)>.00001?normalize(value):fallback;
 float c=cos(uFieldStretchOffset),s=sin(uFieldStretchOffset);
 return mat2(c,s,-s,c)*direction;
}
`;
