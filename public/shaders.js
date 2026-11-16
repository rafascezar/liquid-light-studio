import {venetianGLSL} from './venetian.js?v=pulse-fade-54';
import {fieldGLSL} from './effect-fields.js?v=radial-core-62';
export const vertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec2 aPosition;
out vec2 vUv;
void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.0,1.0);}`;

const header = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
`;
const field = fieldGLSL+`
uniform sampler2D uSDF;
uniform vec2 uSdfTexel;
uniform vec2 uTexel;
uniform vec2 uAspect;
uniform vec2 uCenter;
uniform float uTime;
uniform float uDt;
uniform float uFlowSpeed;
uniform int uDirection;
uniform float uDriftAngle;
uniform int uCollision;
float distanceAt(vec2 uv){
 vec2 pixel=clamp(uv,vec2(0.0),vec2(1.0))/uSdfTexel-0.5;ivec2 p=ivec2(floor(pixel));vec2 f=fract(pixel);ivec2 hi=textureSize(uSDF,0)-1;
 float a=texelFetch(uSDF,clamp(p,ivec2(0),hi),0).r,b=texelFetch(uSDF,clamp(p+ivec2(1,0),ivec2(0),hi),0).r;
 float c=texelFetch(uSDF,clamp(p+ivec2(0,1),ivec2(0),hi),0).r,d=texelFetch(uSDF,clamp(p+ivec2(1,1),ivec2(0),hi),0).r;
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
vec2 normalAt(vec2 uv){
 float d=max(distanceAt(uv),0.0);vec2 span=max(max(uSdfTexel*2.0,uTexel*1.25),vec2(d*0.12)/uAspect);
 vec2 g=vec2(distanceAt(uv+vec2(span.x,0.0))-distanceAt(uv-vec2(span.x,0.0)),distanceAt(uv+vec2(0.0,span.y))-distanceAt(uv-vec2(0.0,span.y)))/(span*uAspect);
 return g/(length(g)+0.00001);
}
uniform sampler2D uTrimMap;
uniform sampler2D uTrimAtlas;
uniform int uTrimEnabled,uTrimLine,uTipMode,uTipOnly;
uniform float uTrimStart,uTrimEnd,uTrimDirection,uTrimSpan,uTrimFeather,uTrimWidth;
uniform float uTipInside,uTipOutside,uTipLength,uTipStrength,uTipSoftness,uTipAdherence,uTipFanStart;
vec4 pathInfo(vec2 uv){ivec2 size=textureSize(uTrimMap,0);return texelFetch(uTrimMap,clamp(ivec2(uv*vec2(size)),ivec2(0),size-1),0);}
float trimCoverage(vec2 uv,float d){
 if(uTrimEnabled==0)return 1.0;
 if(uTrimSpan<.000001)return 0.0;
 vec4 info=pathInfo(uv);if(info.a<.5)return 0.0;
 float q=fract(info.r-uTrimStart),mask=1.0;
 if(uTrimSpan<.999999){float feather=max(uTrimFeather,.0001);float edge=min(q,uTrimSpan-q);mask=smoothstep(0.0,min(feather,uTrimSpan*.5),edge);}
 if(uTrimLine==1)mask*=1.0-smoothstep(uTrimWidth,uTrimWidth+max(fwidth(d),.0005),max(-d,0.0));
 return mask;
}
vec4 pathTip(float phase,float row){
 int width=textureSize(uTrimAtlas,0).x;float x=fract(phase)*float(width);int a=int(floor(x));
 return mix(texelFetch(uTrimAtlas,ivec2(a,int(row)),0),texelFetch(uTrimAtlas,ivec2((a+1)%width,int(row)),0),fract(x));
}
vec2 tipBeam(vec2 uv,vec4 info,float phase,float direction){
 vec4 tip=pathTip(phase,info.g);vec2 normal=normalize(tip.zw+vec2(.000001));vec2 tangent=vec2(normal.y,-normal.x);
 vec2 delta=(uv-tip.xy)*uAspect;float along=-dot(delta,tangent)*direction,across=dot(delta,normal);
 // Blend the free tangent beam into arc-length / signed-distance space.
 // The precomputed contour map keeps this independent of silhouette complexity.
 if(uTipAdherence>0.0){
  float arc=fract((phase-info.r)*direction)*info.b;
  along=mix(along,arc,uTipAdherence);
  across=mix(across,distanceAt(uv),uTipAdherence);
 }
 float reach=across<0.0?uTipInside:uTipOutside;
 if(reach<=.000001||along<0.0||along>uTipLength)return vec2(0);
 float age=along/max(uTipLength,.0001);
 // Positive start leaves a narrow attached lead; negative start opens earlier.
 float fan=clamp((age-uTipFanStart)/max(1.0-uTipFanStart,.0001),0.0,1.0);
 float leadWidth=uTipFanStart>0.0?max(.0004,min(uTrimWidth,.01)):.0004;
 float spread=reach*pow(fan,.65)+leadWidth;
 float side=abs(across)/spread;
 float envelope=(1.0-smoothstep(mix(.9,.05,uTipSoftness),1.0,side))*pow(1.0-age,mix(.6,3.0,uTipSoftness));
 return vec2(envelope*uTipStrength,clamp(.65*side+.35*age,0.0,1.0));
}
vec2 tipLight(vec2 uv){
 if(uTrimEnabled==0||uTipMode==0||uTrimSpan<.000001)return vec2(0);
 vec4 info=pathInfo(uv);if(info.a<.5)return vec2(0);
 vec2 a=vec2(0),b=vec2(0);
 if(uTipMode==1||uTipMode==3)a=tipBeam(uv,info,uTrimEnd,uTrimDirection);
 if(uTipMode==2||uTipMode==3)b=tipBeam(uv,info,uTrimStart,-uTrimDirection);
 return vec2(a.x+b.x,(a.y*a.x+b.y*b.x)/max(a.x+b.x,.000001));
}

vec2 carrier(vec2 uv){
 float d=distanceAt(uv);vec2 n=normalAt(uv);vec2 dir=n;
 if(uDirection==1)dir=vec2(0.0,1.0)+n*0.20;
 if(uDirection==2)dir=vec2(-n.y,n.x)+n*0.18;
 if(uDirection==3)dir=vec2(cos(uDriftAngle),sin(uDriftAngle))+n*0.20;
 return dir*uFlowSpeed/(1.0+max(d,0.0)*3.0)*(uCollision==1?smoothstep(-0.006,0.004,d):1.0);
}
bool solidAt(vec2 uv){return uCollision==1&&distanceAt(uv)<0.0;}
vec2 clipToSource(vec2 origin,vec2 target){
 if(uCollision==0)return target;
 vec2 delta=target-origin;float travel=length(delta*uAspect),t=0.0;vec2 safe=origin;
 if(travel<0.000001)return target;
 float skin=min(uSdfTexel.x*uAspect.x,uSdfTexel.y*uAspect.y)*0.35;
 for(int i=0;i<16;i++){
  vec2 point=origin+delta*t;float d=distanceAt(point);
  if(d<=skin)return safe;
  safe=point;t+=max(d*0.8,skin*.5)/travel;
  if(t>=1.0)return target;
 }
 return safe;
}
vec2 wallVelocity(vec2 velocity,vec2 uv){
 if(uCollision==0)return velocity;
 float d=distanceAt(uv);if(d<0.0)return vec2(0.0);
 float band=max(uTexel.x*uAspect.x,uTexel.y*uAspect.y)*1.5;
 if(d<band){vec2 n=normalAt(uv);float inward=min(dot(velocity+carrier(uv),n),0.0);velocity-=n*inward*(1.0-smoothstep(0.0,band,d));}
 return velocity;
}
`;
const sampling = `
vec4 sampleLinear(sampler2D source,vec2 uv){
 ivec2 size=textureSize(source,0),hi=size-1;vec2 pixel=uv*vec2(size)-0.5;ivec2 p=ivec2(floor(pixel));vec2 f=fract(pixel);
 vec4 a=texelFetch(source,clamp(p,ivec2(0),hi),0),b=texelFetch(source,clamp(p+ivec2(1,0),ivec2(0),hi),0);
 vec4 c=texelFetch(source,clamp(p+ivec2(0,1),ivec2(0),hi),0),d=texelFetch(source,clamp(p+ivec2(1,1),ivec2(0),hi),0);
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
`;
const colour = `
uniform vec4 uStops[10];
uniform float uSourceScale;
uniform int uStopCount;
uniform int uGradientType;
uniform float uGradientAngle;
uniform float uGradientScale;
uniform float uColourDrift;
uniform float uGradientSmooth;
// Gaussian convolution of the piecewise-linear colour ramp. This blends
// across several stops, rather than just easing each individual transition.
float rampCDF(float z){
 float x=abs(z),q=1.0/(1.0+.2316419*x);
 float tail=.39894228*exp(-.5*x*x)*q*(.31938153+q*(-.35656378+q*(1.78147794+q*(-1.82125598+q*1.33027443))));
 return z>=0.0?1.0-tail:tail;
}
float rampPDF(float z){return .39894228*exp(-.5*z*z);}
vec3 colourRamp(float t,vec4 stops[10],int count,float softness){
 t=clamp(t,0.0,1.0);
 if(softness>1.001&&count>1){
  float sigma=(softness-1.0)*.16;
  float z=(stops[0].a-t)/sigma,cdf=rampCDF(z),pdf=rampPDF(z);
  vec3 c=stops[0].rgb*cdf;
  for(int i=0;i<9;i++){
   if(i+1>=count)break;
   float a=stops[i].a,b=stops[i+1].a;
   float nextZ=(b-t)/sigma,nextCDF=rampCDF(nextZ),nextPDF=rampPDF(nextZ);
   float mass=max(nextCDF-cdf,0.0);
   vec3 slope=(stops[i+1].rgb-stops[i].rgb)/max(b-a,.00001);
   c+=stops[i].rgb*mass+slope*((t-a)*mass+sigma*(pdf-nextPDF));
   cdf=nextCDF;pdf=nextPDF;
  }
  c+=stops[max(0,count-1)].rgb*(1.0-cdf);
  return max(c,vec3(0.0));
 }
 vec3 c=stops[0].rgb;
 for(int i=0;i<9;i++){
  if(i+1>=count)break;
  float a=stops[i].a,b=stops[i+1].a;
  float k=clamp((t-a)/max(0.0001,b-a),0.0,1.0);k=mix(k,k*k*(3.0-2.0*k),min(softness,1.0));
  c=mix(c,stops[i+1].rgb,k);
 }
 return c;
}
vec3 palette(float t){return colourRamp(t,uStops,uStopCount,uGradientSmooth);}
vec3 sourceColour(vec2 uv){
 vec2 p=(uv-uCenter)*uAspect;
 float t=dot(p,vec2(cos(uGradientAngle),sin(uGradientAngle)))*uGradientScale+0.5;
 if(uGradientType==1)t=length(p)*uGradientScale*2.0;
 if(uGradientType==2){
  float d=distanceAt(uv),scale=max(uSourceScale,.02);
  vec2 nearest=p-normalAt(uv)*d;
  float rotation=uGradientAngle+uTime*uColourDrift*.2199115;
  t=fract(atan(nearest.y,nearest.x)/6.2831853+.5+rotation/6.2831853);
  float seam=.055;vec3 angular=palette(t);
  if(t<seam)angular=mix(palette(1.0-seam),palette(seam),smoothstep(-seam,seam,t));
  if(t>1.0-seam)angular=mix(palette(1.0-seam),palette(seam),smoothstep(-seam,seam,t-1.0));
  float confidence=smoothstep(scale*.03,scale*.18,length(nearest));
  angular=mix((palette(.2)+palette(.5)+palette(.8))/3.0,angular,confidence);
  vec2 axis=vec2(cos(rotation),sin(rotation));
  vec3 interior=palette(.5+.5*sin(dot(p,axis)/scale*3.14159265+rotation));
  return mix(interior,angular,smoothstep(-min(scale*.025,.012),0.0,d));
 }
 if(abs(uColourDrift)>0.0001)t=0.5+0.5*sin((t-0.5)*3.14159265+uTime*uColourDrift*0.35);
 return palette(t);
}
`;
// Positive cubic B-spline weights preserve density and source-coordinate bounds.
// Used for display only; the solver retains its conservative bilinear sampling.
const reconstruction = `
vec4 cubicWeights(float x){
 float y=1.0-x,x2=x*x,x3=x2*x;
 return vec4(y*y*y,3.0*x3-6.0*x2+4.0,-3.0*x3+3.0*x2+3.0*x+1.0,x3)/6.0;
}
vec4 sampleSmooth(sampler2D source,vec2 uv){
 ivec2 size=textureSize(source,0),hi=size-1;vec2 pixel=uv*vec2(size)-0.5;
 ivec2 p=ivec2(floor(pixel))-1;vec4 wx=cubicWeights(fract(pixel.x)),wy=cubicWeights(fract(pixel.y)),value=vec4(0.0);
 for(int y=0;y<4;y++)for(int x=0;x<4;x++)value+=texelFetch(source,clamp(p+ivec2(x,y),ivec2(0),hi),0)*wx[x]*wy[y];
 return value;
}
`;
export const fragments = {
 optical: header+field+colour+venetianGLSL+`
uniform float uViewScale;uniform vec2 uViewCenter;
uniform float uLayerScale;uniform vec2 uLayerOffset;uniform float uLayerRotation;uniform float uLayerOpacity;uniform float uLayerPhase;
uniform int uNormalPass;uniform vec2 uOutputSize;uniform float uGlassThickness;
uniform int uDeformType;uniform float uDeformAmount;uniform float uDeformScale;uniform float uDeformAngle;uniform float uDeformSpeed;uniform float uDeformInfluence;
uniform int uContourPulse;uniform int uContourCount;uniform float uContourReach;uniform float uContourWidth;uniform float uContourSpeed;uniform float uContourFade;
uniform int uInnerEnabled;uniform int uInnerMapping;uniform vec4 uInnerStops[10];uniform int uInnerCount;uniform float uInnerDepth;uniform float uInnerAngle;uniform float uInnerScale;uniform float uInnerOffset;uniform float uInnerSoftness;
uniform int uEdgeEnabled;uniform vec4 uEdgeStops[10];uniform int uEdgeCount;

uniform vec3 uBackground;uniform float uBackgroundAlpha;uniform float uExposure;uniform float uGrain;
uniform float uOpticalSourceScale;uniform float uOpticalOrbit;uniform float uOpticalOrbitSpeed;uniform float uOpticalRipple;uniform float uOpticalRippleFrequency;uniform float uOpticalRippleSpeed;uniform float uOpticalBreathe;uniform float uOpticalBreatheSpeed;
uniform int uOpticalSamples;
uniform float uOpticalInner;uniform float uOpticalOuter;uniform float uOpticalOffset;uniform float uOpticalStretch;uniform float uOpticalAngle;uniform float uOpticalBend;uniform float uOpticalSpeed;uniform float uOpticalInside;uniform float uOpticalOutside;uniform float uOpticalEdge;uniform float uOpticalEdgeWidth;uniform float uOpticalSoftness;
uniform int uEffectNormal;uniform float uEffectTimeDisplacement;uniform float uEffectAmount;uniform float uEffectSlats;uniform float uEffectAngle;uniform float uEffectDepth;uniform float uEffectSoftness;uniform float uEffectSpeed;uniform float uEffectOffset;
uniform int uContourColourPulse;
uniform float uContourColourFrequency,uContourColourAmount,uContourColourPhase,uContourColourReach,uContourColourWidth,uContourColourSharpness;
float outwardColourPulse(float distance,float time){
 if(uContourColourPulse==0||distance<0.0)return 0.0;
 float age=fract(time*uContourColourFrequency+uContourColourPhase),reach=max(.01,uContourColourReach);
 float width=max(.001,reach*uContourColourWidth*.5);
 return exp(-pow(abs((distance-age*reach)/width),uContourColourSharpness))*smoothstep(0.0,.16,age)*(1.0-smoothstep(.65,1.0,age));
}
vec3 opticalSrgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0)),vec3(1.0/2.4))-0.055,step(vec3(.0031308),c));}
float opticalNoise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float opticalField(vec2 uv,int target){
 vec2 p=(uv-uCenter)*uAspect*uLayerScale;float c=cos(uLayerRotation),s=sin(uLayerRotation);
 vec2 world=uCenter+(vec2(c*p.x-s*p.y,s*p.x+c*p.y)+uLayerOffset)/uAspect;
 return effectField(world,uAspect,target);
}
float opticalTime(vec2 uv){if(uEffectNormal==1)return venetianOutwardTime(distanceAt(uv),uEffectAmount*opticalField(uv,2),uEffectSlats,uEffectOffset,uTime,uEffectTimeDisplacement);return venetianTime(uv,uCenter,uAspect,uEffectAmount*opticalField(uv,2),uEffectSlats,uEffectAngle,uEffectOffset,uTime,uEffectTimeDisplacement);}
// Extrapolate outside the SDF texture, avoiding frozen bands at canvas boundaries.
vec2 deformSource(vec2 uv){
 float time=opticalTime(uv);
 // Sample all source geometry through the ribs, including main/copy edges
 // and the glass-normal pass, not just the outer atmosphere.
 if(uEffectNormal==1)uv=venetianOutwardPoint(uv,uAspect,normalAt(uv),distanceAt(uv),uEffectAmount*opticalField(uv,2),uEffectSlats,uEffectDepth,uEffectSoftness,uEffectOffset,uTime,uEffectSpeed,uEffectTimeDisplacement);
 else uv=venetianPoint(uv,uCenter,uAspect,uEffectAmount*opticalField(uv,2),uEffectSlats,uEffectAngle,uEffectDepth,uEffectSoftness,uEffectOffset,uTime,uEffectSpeed,uEffectTimeDisplacement);
 if(uDeformAmount*uDeformInfluence<=.00001)return uv;
 vec2 p=(uv-uCenter)*uAspect;float freq=max(.1,uDeformScale)*6.2831853/max(uOpticalSourceScale,.03);
 float phase=time*uDeformSpeed*6.2831853+uLayerPhase;
 vec2 axis=vec2(cos(uDeformAngle),sin(uDeformAngle)),side=vec2(-axis.y,axis.x);
 float weight=opticalField(uv,1);
 float amp=weight*uDeformAmount*uDeformInfluence*max(uOpticalSourceScale,.02)*.12;
 if(uDeformType==0)p-=axis*sin(dot(p,side)*freq+phase)*amp;
 else if(uDeformType==1)p-=amp*vec2(sin(p.y*freq+phase)*cos(p.x*freq*.73-phase*.63),cos(p.x*freq-phase)*sin(p.y*freq*.83+phase*.47));
 else{float turn=sin(length(p)*freq-phase)*weight*uDeformAmount*uDeformInfluence*.5;float c=cos(turn),q=sin(turn);p=mat2(c,-q,q,c)*p;}
 return uCenter+p/uAspect;
}
float opticalDistance(vec2 uv){uv=deformSource(uv);vec2 bounded=clamp(uv,vec2(0),vec2(1));return distanceAt(bounded)+length((uv-bounded)*uAspect);}

vec3 orbitColour(float t){
 t=fract(t);float seam=.055;
 if(t<seam)return mix(palette(1.0-seam),palette(seam),smoothstep(-seam,seam,t));
 if(t>1.0-seam)return mix(palette(1.0-seam),palette(seam),smoothstep(-seam,seam,t-1.0));
 return palette(t);
}
// Project the outer field back onto the silhouette, rather than making
// every pixel point at the centre. Interior colour uses a continuous sweep.
vec3 contourOrbit(vec2 uv,float original,float bandT){
 float scale=max(uOpticalSourceScale,.02);
 vec2 p=(uv-uCenter)*uAspect;
 vec2 nearest=p-normalAt(uv)*original;
 float phase=opticalTime(uv)*uOpticalOrbitSpeed*.12;
 float contourPhase=atan(nearest.y,nearest.x)/6.2831853+.5+bandT*.2+phase;
 vec3 contourColour=orbitColour(contourPhase);
 // A contour can itself cross the origin: diffuse that degenerate point.
 float confidence=smoothstep(scale*.025,scale*.12,length(nearest));
 contourColour=mix((palette(.2)+palette(.5)+palette(.8))/3.0,contourColour,confidence);
 float angle=phase*6.2831853;
 vec2 direction=vec2(cos(angle),sin(angle));
 float sweep=.5+.5*sin(dot(p,direction)/scale*3.14159265+angle);
 vec3 interiorColour=palette(sweep);
 float surfaceBlend=smoothstep(-min(scale*.025,.012),0.0,original);
 return mix(interiorColour,contourColour,surfaceBlend);
}
void main(){
 vec2 world=(vUv-.5)/uViewScale+uViewCenter;
 vec2 local=(world-uCenter)*uAspect-uLayerOffset;
 float lc=cos(uLayerRotation),ls=sin(uLayerRotation);local=mat2(lc,-ls,ls,lc)*local/max(uLayerScale,.01);
 vec2 uv=uCenter+local/uAspect;
 float time=opticalTime(uv);
 float original=opticalDistance(uv);float aa=max(fwidth(original),.0002);
 if(uNormalPass==1){
  float inside=(1.0-smoothstep(-aa,aa,original))*trimCoverage(deformSource(uv),original);
  // Sample the deformed distance over a stable pixel footprint; fragment
  // derivatives can straddle rib seams and produce erratic surface normals.
  vec2 pixel=max(uSdfTexel*.75,1.5/(uOutputSize*uViewScale*max(uLayerScale,.01)));
  vec2 gx=vec2(pixel.x,0),gy=vec2(0,pixel.y);
  vec2 gradient=vec2(opticalDistance(uv+gx)-opticalDistance(uv-gx),opticalDistance(uv+gy)-opticalDistance(uv-gy))/(pixel*uAspect);
  gradient=mat2(lc,ls,-ls,lc)*gradient;
  float depth=clamp(-original/max(uGlassThickness,.001),0.0,1.0);
  // A rounded bevel joins the flat face without an abrupt slope seam.
  float slope=1.0-smoothstep(0.0,1.0,depth);
  // Lens thickness tends to zero at the silhouette, avoiding a sudden
  // jump to a distant background texel at the first covered pixel.
  float lens=sin(depth*3.14159265);
  vec2 bend=gradient/(length(gradient)+.00001)*lens*inside;
  fragColor=vec4(bend*.5+.5,inside*uLayerOpacity,slope*inside);return;
 }
 float core=effectFieldCore(world,uAspect);
 float deformWeight=effectField(world,uAspect,1),stretch=uOpticalStretch*effectField(world,uAspect,64)*core;
 vec2 axis=vec2(cos(uOpticalAngle),sin(uOpticalAngle));
 vec2 fieldDirection=effectFieldDirection(world,uAspect);
 // Field normals live in canvas space; the sweep lives in layer space.
 if(length(fieldDirection)>.00001)axis=mat2(lc,-ls,ls,lc)*fieldDirection;
 vec2 side=vec2(-axis.y,axis.x);
 vec2 p=(uv-uCenter)*uAspect;
 float phase=time*uOpticalSpeed;
 // Curvature affects the atmosphere only, leaving the graphic itself untouched.
 vec2 warped=uv-side*sin(dot(p,axis)*3.0+phase)*uOpticalBend*deformWeight*core*max(original,0.0)/uAspect;
 if(uCollision==1&&original>0.0)warped=clipToSource(uv,warped);
 float swept=opticalDistance(warped);
 if(stretch>.0001){
  // Find the closest point on a continuous sweep, rather than blending
  // a sparse stack of translated copies of the graphic.
  int samples=clamp(uOpticalSamples,48,192);float bestT=0.0,maxT=1.0;
  if(uCollision==1&&original>0.0){
   // Distance-guided tracing stops at the first surface, including hole walls.
   float travel=0.0,epsilon=max(.0002,min(uSdfTexel.x*uAspect.x,uSdfTexel.y*uAspect.y)*.7);
   for(int k=0;k<96;k++){
    float clearance=opticalDistance(warped-axis*travel/uAspect);
    if(clearance<=epsilon){maxT=min(1.0,travel/stretch);break;}
    travel+=max(clearance*.8,epsilon*.5);
    if(travel>=stretch)break;
    if(k==95)maxT=min(1.0,travel/stretch);
   }
  }
  for(int i=1;i<=192;i++){
   if(i>samples)break;
   float t=float(i)/float(samples)*maxT;
   float candidate=opticalDistance(warped-axis*stretch*t/uAspect)+t*t*uOpticalOuter*.8;
   if(candidate<swept){swept=candidate;bestT=t;}
  }
  // Refine between samples so thin details do not appear as repeated contours.
  float lo=max(0.0,bestT-maxT/float(samples)),hi=min(maxT,bestT+maxT/float(samples));
  for(int j=0;j<8;j++){
   float a=mix(lo,hi,1.0/3.0),b=mix(lo,hi,2.0/3.0);
   float da=opticalDistance(warped-axis*stretch*a/uAspect)+a*a*uOpticalOuter*.8;
   float db=opticalDistance(warped-axis*stretch*b/uAspect)+b*b*uOpticalOuter*.8;
   swept=min(swept,min(da,db));
   if(da<db)hi=b;else lo=a;
  }
 }
 float blend=smoothstep(-aa,aa,original);
 float d=mix(original,swept,blend);
 float polar=atan(p.y,p.x);
 float ripple=sin(polar*floor(uOpticalRippleFrequency+.5)+max(d,0.0)*18.0-time*uOpticalRippleSpeed*6.2831853);
 d+=ripple*uOpticalRipple*deformWeight*min(uOpticalOuter*.12,.025)*(1.0-exp(-max(original,0.0)*35.0));
 if(uCollision==1&&original>0.0)d=max(d,0.0);
 float inner=max(uOpticalInner,.000001),outer=max(uOpticalOuter*(1.0+uOpticalBreathe*.35*sin(time*uOpticalBreatheSpeed*6.2831853)),.000001);
 float insideTravel=uOpticalInner>0.0?d/inner*uOpticalOffset:0.0;
 float t=clamp(uOpticalOffset+(d<0.0?insideTravel:d/outer*(1.0-uOpticalOffset)),0.0,1.0);
 t=clamp(t+sin(phase)*abs(uOpticalSpeed)*.035,0.0,1.0);
 float colourPulse=outwardColourPulse(original,time)*effectField(world,uAspect,32);
 t=clamp(t+uContourColourAmount*colourPulse,0.0,1.0);
 vec3 c=mix(palette(t),contourOrbit(uv,original,t),uOpticalOrbit);
 // Feather starts closer to the source and reaches full transparency
 // before the last colour band can form an enclosing outer border.
 float feather=clamp(uOpticalSoftness,0.0,1.0);
 float cutoff=outer*mix(1.0,.72,feather);
 float envelope=1.0-smoothstep(cutoff*mix(.96,.02,feather),cutoff,max(d,0.0));
 float fade=uOpticalOuter<=0.0?1.0-smoothstep(-aa,aa,original):pow(max(envelope,0.0),mix(1.0,2.6,feather));
 float opacity=clamp(mix(uOpticalInside,uOpticalOutside,blend)*fade,0.0,1.0);
 if(uContourColourPulse==1)opacity=mix(opacity,clamp(colourPulse*uOpticalOutside,0.0,1.0),clamp(abs(uContourColourAmount)*4.0,0.0,1.0)*smoothstep(0.0,aa,original));
 if(uInnerEnabled==1){
  vec2 innerP=(deformSource(uv)-uCenter)*uAspect;
  float inset=clamp(-original/max(uInnerDepth,.001),0.0,1.0);
  float it=1.0-inset;
  if(uInnerMapping==1)it=dot(innerP,vec2(cos(uInnerAngle),sin(uInnerAngle)))*uInnerScale/max(uOpticalSourceScale,.02)+.5;
  if(uInnerMapping==2)it=length(innerP)*uInnerScale*2.0/max(uOpticalSourceScale,.02);
  it=clamp(it+uInnerOffset,0.0,1.0);
  c=mix(colourRamp(it,uInnerStops,uInnerCount,uInnerSoftness),c,blend);
 }
 if(uContourPulse==1){
  vec3 waves=vec3(0);float waveAlpha=0.0;
  for(int i=0;i<8;i++){
   if(i>=uContourCount)break;
   float age=fract(time*uContourSpeed-float(i)/float(uContourCount));
   float travel=age*uContourReach;
   float band=(original-travel)/max(uContourWidth,.0001);
   float profile=exp(-band*band*2.0);
   float envelope=smoothstep(0.0,.045,age)*pow(1.0-age,uContourFade);
   float a=profile*envelope*uOpticalOutside;
   float ct=clamp(band*.5+.5,0.0,1.0);
   vec3 colour=mix(palette(ct),contourOrbit(uv,original,ct),uOpticalOrbit);
   waves+=colour*a;waveAlpha+=a;
  }
  float outside=smoothstep(0.0,aa,original);
  c=mix(c,waves/max(waveAlpha,.00001),outside);
  opacity=mix(opacity,clamp(waveAlpha,0.0,1.0),outside);
 }
 vec3 body=opticalSrgb(1.0-exp(-c*uExposure*1.6));
 float edgeWidth=uTrimEnabled==1&&uTrimLine==1?uTrimWidth:uOpticalEdgeWidth;
 float width=max(edgeWidth,aa*.65);
 float rim=edgeWidth<=0.0?0.0:exp(-pow(abs(original)/width,2.0))*uOpticalEdge;
 vec3 edgeColour=opticalSrgb(mix(palette(clamp(uOpticalOffset,0.0,1.0)),contourOrbit(uv,0.0,uOpticalOffset),uOpticalOrbit));
 if(uEdgeEnabled==1)edgeColour=opticalSrgb(colourRamp(clamp(uOpticalOffset,0.0,1.0),uEdgeStops,uEdgeCount,uGradientSmooth));
 body=mix(body,clamp(edgeColour*1.3+vec3(.08),0.0,1.0),clamp(rim,0.0,1.0));
 opacity=max(opacity,clamp(rim,0.0,1.0));
 body=clamp(body+(opticalNoise(gl_FragCoord.xy)-.5)*(uGrain*.06+1.0/255.0),0.0,1.0);
 float reveal=trimCoverage(deformSource(uv),original);
 opacity*=reveal;
 vec2 tip=tipLight(deformSource(uv));
 if(uTipMode>0&&uTipOnly==1)opacity=clamp(rim,0.0,1.0)*reveal;
 float tipAlpha=1.0-exp(-tip.x);
 vec3 tipColour=opticalSrgb(1.0-exp(-palette(tip.y)*uExposure*2.0));
 float combined=tipAlpha+opacity*(1.0-tipAlpha);
 body=(tipColour*tipAlpha+body*opacity*(1.0-tipAlpha))/max(combined,.00001);
 body=mix(opticalSrgb(1.0-exp(-palette(0.0)*uExposure*1.6)),body,effectField(world,uAspect,32));
 opacity=combined*uLayerOpacity;
 float alpha=opacity+uBackgroundAlpha*(1.0-opacity);
 vec3 premult=body*opacity+opticalSrgb(uBackground)*uBackgroundAlpha*(1.0-opacity);
 fragColor=vec4(premult/max(alpha,.00001),alpha);
}
`,

 composite: header+fieldGLSL+`
uniform vec2 uAspect;uniform float uViewScale;uniform vec2 uViewCenter;
uniform sampler2D uBase;uniform sampler2D uLayer;uniform sampler2D uNormalMap;
uniform int uBlendMode;uniform float uGlass;uniform float uDispersion;
uniform float uGlassTransmission,uGlassReflection,uGlassThickness;
uniform sampler2D uRefractionMap;
// The mip pyramid contains premultiplied radiance. Explicit ray derivatives
// filter compressed layers without introducing fringes from transparent RGB.
vec4 glassSample(vec2 uv,vec2 dx,vec2 dy){return textureGrad(uRefractionMap,clamp(uv,0.0,1.0),dx,dy);}
vec4 glassNormal(vec2 uv){
 vec2 px=1.0/vec2(textureSize(uNormalMap,0));
 return texture(uNormalMap,uv)*.5+(texture(uNormalMap,uv+vec2(px.x,0))+texture(uNormalMap,uv-vec2(px.x,0))+texture(uNormalMap,uv+vec2(0,px.y))+texture(uNormalMap,uv-vec2(0,px.y)))*.125;
}
void main(){
 vec4 base=texture(uBase,vUv),layer=texture(uLayer,vUv);
 float glass=uGlass*effectField((vUv-.5)/max(uViewScale,.0001)+uViewCenter,uAspect,16);
 if(glass>.00001){
  vec4 normal=glassNormal(vUv);float mask=clamp(normal.b,0.0,1.0);
  vec2 bend=normal.rg*2.0-1.0;
  vec3 transmittedRay=refract(vec3(0,0,-1),normalize(vec3(bend*.85,1.0)),1.0/1.5);
  vec2 offset=transmittedRay.xy/max(-transmittedRay.z,.25)*glass*min(uGlassThickness,.15)*uViewScale/uAspect;
  vec2 ray=vUv+offset,dx=dFdx(ray),dy=dFdy(ray);
  // Dispersion remains a fine edge detail rather than three detached colour ghosts.
  float spread=uDispersion*.12;
  vec4 mid=glassSample(ray,dx,dy),red=glassSample(ray+offset*spread,dx,dy),blue=glassSample(ray-offset*spread,dx,dy);
  float spectralAlpha=(red.a+mid.a+blue.a)/3.0;
  vec4 transmitted=vec4(vec3(red.r,mid.g,blue.b),spectralAlpha);
  vec4 basePremult=vec4(base.rgb*base.a,base.a);
  basePremult=mix(basePremult,transmitted,mask*clamp(glass,0.0,1.0));
  base=vec4(basePremult.rgb/max(basePremult.a,.00001),basePremult.a);
  float surface=clamp(glass*mask,0.0,1.0);
  float fresnel=.04+.96*pow(clamp(normal.a,0.0,1.0),5.0);
  float reflection=uGlassReflection*fresnel*surface;
  float bodyAlpha=layer.a*(1.0-uGlassTransmission*surface);
  // Neutral directional reflection keeps the user's palette visible beneath the glass.
  vec2 n=bend/(length(bend)+.00001);
  float highlight=.22+.78*pow(max(0.0,dot(n,normalize(vec2(-.55,.83)))),6.0);
  float reflectedAlpha=reflection*highlight;
  float combined=bodyAlpha+reflectedAlpha*(1.0-bodyAlpha);
  layer.rgb=(layer.rgb*bodyAlpha+vec3(.86,.94,1.0)*reflectedAlpha*(1.0-bodyAlpha))/max(combined,.00001);
  layer.a=combined;
 }
 vec3 mixed=layer.rgb;
 if(uBlendMode==1)mixed=min(base.rgb+layer.rgb,vec3(1));
 if(uBlendMode==2)mixed=1.0-(1.0-base.rgb)*(1.0-layer.rgb);
 if(uBlendMode==3)mixed=base.rgb*layer.rgb;
 float alpha=layer.a+base.a*(1.0-layer.a);
 vec3 premult=base.rgb*base.a*(1.0-layer.a)+layer.rgb*layer.a*(1.0-base.a)+mixed*base.a*layer.a;
 fragColor=vec4(premult/max(alpha,.00001),alpha);
}
`,
 glassPrefilter: header+`uniform sampler2D uField;void main(){vec4 c=texture(uField,vUv);fragColor=vec4(c.rgb*c.a,c.a);}`,
 copy: header+`uniform sampler2D uField;void main(){fragColor=texture(uField,vUv);}`,
 advect: header+field+sampling+`
uniform sampler2D uField;uniform sampler2D uVelocity;uniform float uDecay;
void main(){if(solidAt(vUv)){fragColor=vec4(0.0);return;}vec2 v=texture(uVelocity,vUv).xy+carrier(vUv);vec2 midpoint=clipToSource(vUv,vUv-v*uDt*0.5/uAspect);vec2 vm=sampleLinear(uVelocity,midpoint).xy+carrier(midpoint);vec2 p=clipToSource(vUv,vUv-vm*uDt/uAspect);fragColor=sampleLinear(uField,clamp(p,uTexel*0.5,1.0-uTexel*0.5))*exp(-uDecay*uDt);}
`,
 curl: header+`
uniform sampler2D uVelocity;uniform vec2 uTexel;uniform float uH;
void main(){float l=texture(uVelocity,vUv-vec2(uTexel.x,0)).y;float r=texture(uVelocity,vUv+vec2(uTexel.x,0)).y;float b=texture(uVelocity,vUv-vec2(0,uTexel.y)).x;float t=texture(uVelocity,vUv+vec2(0,uTexel.y)).x;fragColor=vec4((r-l-t+b)/(2.0*uH),0,0,1);}
`,
 force: header+field+`
uniform sampler2D uVelocity;uniform sampler2D uCurl;
uniform float uTurbulence;uniform float uEddySize;uniform float uEvolution;uniform float uSwirl;uniform float uMomentum;
uniform vec4 uPointer;uniform float uPointerActive;uniform float uSeed;
float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.0-15.0)+10.0);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float potential(vec2 p,float t){return noise3(vec3(p,t))+0.2*noise3(vec3(p*2.03+3.8,t*1.25));}
void main(){
 vec2 v=texture(uVelocity,vUv).xy;float scale=1.0/max(uEddySize,0.04);vec2 p=(vUv-0.5)*uAspect*scale+uSeed;float t=uTime*uEvolution*0.24;
 float e=0.03;vec2 noiseCurl=vec2(potential(p+vec2(0,e),t)-potential(p-vec2(0,e),t),potential(p-vec2(e,0),t)-potential(p+vec2(e,0),t))/(2.0*e);
 float l=abs(texture(uCurl,vUv-vec2(uTexel.x,0)).r),r=abs(texture(uCurl,vUv+vec2(uTexel.x,0)).r),b=abs(texture(uCurl,vUv-vec2(0,uTexel.y)).r),top=abs(texture(uCurl,vUv+vec2(0,uTexel.y)).r);
 vec2 g=vec2(r-l,top-b);g/=length(g)+0.0001;float w=texture(uCurl,vUv).r;
 vec2 spin=vec2(g.y,-g.x)*w*uSwirl*0.012;
 float d=distanceAt(vUv);float envelope=exp(-max(d,0.0)*2.2);
 v+=(noiseCurl*uTurbulence*0.40*envelope+spin)*uDt*effectField(vUv,uAspect,8);
 if(uPointerActive>0.0){vec2 q=(vUv-uPointer.xy)*uAspect;float influence=exp(-dot(q,q)/0.009);v+=uPointer.zw*influence*uDt*9.0;}
 v*=exp(-uDt*mix(2.0,0.08,uMomentum));v=wallVelocity(v,vUv);
 fragColor=vec4(clamp(v,vec2(-2.0),vec2(2.0)),0,1);
}
`,
 diffuseVelocity: header+`
uniform sampler2D uField;uniform sampler2D uOriginal;uniform vec2 uTexel;uniform float uA;
void main(){vec4 n=texture(uField,vUv-vec2(uTexel.x,0))+texture(uField,vUv+vec2(uTexel.x,0))+texture(uField,vUv-vec2(0,uTexel.y))+texture(uField,vUv+vec2(0,uTexel.y));fragColor=(texture(uOriginal,vUv)+uA*n)/(1.0+4.0*uA);}
`,
 divergence: header+field+`
uniform sampler2D uVelocity;uniform float uH;
void main(){if(solidAt(vUv)){fragColor=vec4(0.0);return;}vec2 c=texture(uVelocity,vUv).xy,l=texture(uVelocity,vUv-vec2(uTexel.x,0)).xy,r=texture(uVelocity,vUv+vec2(uTexel.x,0)).xy,b=texture(uVelocity,vUv-vec2(0,uTexel.y)).xy,t=texture(uVelocity,vUv+vec2(0,uTexel.y)).xy;if(vUv.x<uTexel.x)l.x=-r.x;if(vUv.x>1.0-uTexel.x)r.x=-l.x;if(vUv.y<uTexel.y)b.y=-t.y;if(vUv.y>1.0-uTexel.y)t.y=-b.y;if(solidAt(vUv-vec2(uTexel.x,0)))l.x=-c.x;if(solidAt(vUv+vec2(uTexel.x,0)))r.x=-c.x;if(solidAt(vUv-vec2(0,uTexel.y)))b.y=-c.y;if(solidAt(vUv+vec2(0,uTexel.y)))t.y=-c.y;fragColor=vec4((r.x-l.x+t.y-b.y)/(2.0*uH),0,0,1);}
`,
 pressure: header+field+`
uniform sampler2D uPressure;uniform sampler2D uDivergence;uniform float uH;
float pressureAt(vec2 p,float c){return solidAt(p)?c:texture(uPressure,p).r;}
void main(){if(solidAt(vUv)){fragColor=vec4(0.0);return;}float c=texture(uPressure,vUv).r,l=pressureAt(vUv-vec2(uTexel.x,0),c),r=pressureAt(vUv+vec2(uTexel.x,0),c),b=pressureAt(vUv-vec2(0,uTexel.y),c),t=pressureAt(vUv+vec2(0,uTexel.y),c);fragColor=vec4((l+r+b+t-texture(uDivergence,vUv).r*uH*uH)*0.25,0,0,1);}
`,
 project: header+field+`
uniform sampler2D uVelocity;uniform sampler2D uPressure;uniform float uH;
float pressureAt(vec2 p,float c){return solidAt(p)?c:texture(uPressure,p).r;}
void main(){float c=texture(uPressure,vUv).r,l=pressureAt(vUv-vec2(uTexel.x,0),c),r=pressureAt(vUv+vec2(uTexel.x,0),c),b=pressureAt(vUv-vec2(0,uTexel.y),c),t=pressureAt(vUv+vec2(0,uTexel.y),c);vec2 v=texture(uVelocity,vUv).xy-vec2(r-l,t-b)/(2.0*uH);fragColor=vec4(wallVelocity(v,vUv),0,1);}
`,
 diffuseDye: header+field+`
uniform sampler2D uField;uniform float uA;
vec4 fluidAt(vec2 p,vec4 c){return solidAt(p)?c:texture(uField,p);}
void main(){if(solidAt(vUv)){fragColor=vec4(0.0);return;}vec4 c=texture(uField,vUv),n=fluidAt(vUv-vec2(uTexel.x,0),c)+fluidAt(vUv+vec2(uTexel.x,0),c)+fluidAt(vUv-vec2(0,uTexel.y),c)+fluidAt(vUv+vec2(0,uTexel.y),c);fragColor=c+uA*(n-c*4.0);}
`,
 emit: header+field+colour+`
uniform sampler2D uField;uniform float uEmission;uniform float uEmissionWidth;uniform float uPulse;
void main(){float d=distanceAt(vUv);float width=max(uEmissionWidth,0.001);float source=exp(-pow(max(d,0.0)/width,2.0))*smoothstep(-0.002,0.003,d);float pulse=1.0+uPulse*sin(uTime*1.6);vec4 value=texture(uField,vUv);source*=trimCoverage(vUv,d);if(uTipMode>0&&uTipOnly==1)source=0.0;source+=tipLight(vUv).x;float injection=effectField(vUv,uAspect,4)*source*uEmission*uDt*8.0*pulse;value+=vec4(vUv*injection,0.0,injection);if(uCollision==1)value*=step(0.0,d);float scale=min(1.0,24.0/max(value.a,0.0001));fragColor=value*scale;}
`,
 blur: header+field+sampling+`
uniform sampler2D uField;uniform vec2 uStep;
void addGlow(inout vec4 c,inout float weight,vec2 p,float w){if(uCollision==1&&(solidAt(p)||length((clipToSource(vUv,p)-p)*uAspect)>0.00001))return;c+=sampleLinear(uField,p)*w;weight+=w;}
void main(){if(solidAt(vUv)){fragColor=vec4(0.0);return;}vec4 c=sampleLinear(uField,vUv)*0.227027;float weight=0.227027;addGlow(c,weight,vUv+uStep*1.384615,0.316216);addGlow(c,weight,vUv-uStep*1.384615,0.316216);addGlow(c,weight,vUv+uStep*3.230769,0.070270);addGlow(c,weight,vUv-uStep*3.230769,0.070270);fragColor=c/weight;}
`,
 display: header+field+colour+reconstruction+venetianGLSL+`
uniform sampler2D uDye;uniform sampler2D uBloom;uniform sampler2D uWideBloom;
uniform float uViewScale;uniform vec2 uViewCenter;
uniform int uEffectNormal;uniform float uEffectTimeDisplacement;uniform float uEffectAmount;uniform float uEffectSlats;uniform float uEffectAngle;uniform float uEffectDepth;uniform float uEffectSoftness;uniform float uEffectSpeed;uniform float uEffectOffset;
uniform vec3 uBackground;uniform float uBackgroundAlpha;uniform float uFluidity;uniform float uExposure;uniform float uGlowStrength;uniform float uReach;uniform float uFalloff;uniform float uGrain;uniform float uShapeFill;uniform float uRim;
vec3 toSrgb(vec3 x){return mix(x*12.92,1.055*pow(max(x,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),x));}
float random(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 transportedColour(vec4 field){return sourceColour(field.rg/max(field.a,0.00001))*field.a;}
void main(){
 vec2 uv=(vUv-0.5)/uViewScale+uViewCenter;

 vec2 sampleUV=uv;float ribs=1.0;
 float effectAmount=uEffectAmount*effectField(uv,uAspect,2);
 if(effectAmount>0.0001){
  vec2 axis=vec2(cos(uEffectAngle),sin(uEffectAngle));float count=max(6.0,uEffectSlats);
  float time=venetianTime(uv,uCenter,uAspect,effectAmount,count,uEffectAngle,uEffectOffset,uTime,uEffectTimeDisplacement);
  if(uEffectNormal==1)time=venetianOutwardTime(distanceAt(uv),effectAmount,count,uEffectOffset,uTime,uEffectTimeDisplacement);
  float coordinate=uEffectNormal==1?distanceAt(uv):dot((uv-uCenter)*uAspect,axis);
  float phase=coordinate*count+uEffectOffset+time*uEffectSpeed;
  float slat=fract(phase),ridge=pow(0.5+0.5*cos(phase*6.2831853),mix(8.0,1.0,uEffectSoftness));
  if(uEffectNormal==1)sampleUV=venetianOutwardPoint(uv,uAspect,normalAt(uv),distanceAt(uv),effectAmount,count,uEffectDepth,uEffectSoftness,uEffectOffset,uTime,uEffectSpeed,uEffectTimeDisplacement);
  else sampleUV=venetianPoint(uv,uCenter,uAspect,effectAmount,count,uEffectAngle,uEffectDepth,uEffectSoftness,uEffectOffset,uTime,uEffectSpeed,uEffectTimeDisplacement);
  ribs=mix(1.0,0.55+ridge*1.2,effectAmount);
 }
 float d=distanceAt(sampleUV);float aa=max(fwidth(d)*0.65,0.000001);float edge=smoothstep(-aa,aa,d);vec3 colour=sourceColour(sampleUV);
 vec4 dye=sampleSmooth(uDye,sampleUV),bloom=sampleSmooth(uBloom,sampleUV),wide=sampleSmooth(uWideBloom,sampleUV);
 if(uCollision==1){
  float cell=max(uTexel.x*uAspect.x,uTexel.y*uAspect.y),band=cell*6.0;
  if(d>=0.0&&d<band){
   vec2 normal=normalAt(sampleUV),tangent=vec2(-normal.y,normal.x);
   vec4 smoothDye=dye*.4,smoothBloom=bloom*.4,smoothWide=wide*.4;
   for(int i=0;i<4;i++){
    float stepSize=i==0?-3.0:i==1?-1.5:i==2?1.5:3.0;
    vec2 q=sampleUV+tangent*cell*stepSize/uAspect;
    // Keep neighbouring samples on the fluid side of the same curved wall.
    float qd=distanceAt(q);q+=normalAt(q)*max(0.0,cell*.4-qd)/uAspect;
    smoothDye+=sampleSmooth(uDye,q)*.15;smoothBloom+=sampleSmooth(uBloom,q)*.15;smoothWide+=sampleSmooth(uWideBloom,q)*.15;
   }
   float amount=1.0-smoothstep(0.0,band,d);
   dye=mix(dye,smoothDye,amount);bloom=mix(bloom,smoothBloom,amount);wide=mix(wide,smoothWide,amount);
  }
 }
 float reach=max(uReach,0.015);float falloff=exp(-pow(max(d,0.0)/reach,max(uFalloff,0.25)));
 vec3 flowing=(transportedColour(dye)*0.45+transportedColour(bloom)*uGlowStrength*0.65+transportedColour(wide)*uGlowStrength*0.35)*falloff;
 float gate=uCollision==1?edge:1.0;
 vec3 still=colour*exp(-max(d,0.0)/reach*2.0)*uGlowStrength*0.45;
 vec3 light=mix(still,flowing,uFluidity)*gate*ribs;
 light+=colour*exp(-abs(d)/(uTrimEnabled==1&&uTrimLine==1?max(uTrimWidth,.0001):.006))*uRim*gate;
 light+=colour*uShapeFill*(1.0-edge)*0.12;
 light*=trimCoverage(sampleUV,d);
 if(uTipMode>0&&uTipOnly==1)light=vec3(0);
 vec2 tip=tipLight(sampleUV);light+=palette(tip.y)*tip.x;
 float colourWeight=effectField(uv,uAspect,32);
 light=mix(palette(0.0)*max(max(light.r,light.g),light.b),light,colourWeight);
 vec3 visible=toSrgb(1.0-exp(-max(light,vec3(0.0))*uExposure));
 visible=max(visible+(random(gl_FragCoord.xy)-0.5)*uGrain*0.045*min(1.0,length(visible)),vec3(0.0));
 float a=clamp(max(max(visible.r,visible.g),visible.b),0.0,1.0);
 vec3 bg=toSrgb(uBackground);float alpha=a+uBackgroundAlpha*(1.0-a);
 vec3 premult=visible+bg*uBackgroundAlpha*(1.0-a);
 float dither=(random(gl_FragCoord.xy+vec2(173.21,89.43))-0.5)/255.0;
 fragColor=vec4(clamp(premult/max(alpha,0.00001)+dither*min(1.0,a*16.0),0.0,1.0),alpha);
}
`
};

// Bake the colour ramp once instead of expanding its array/convolution loops
// into every source-colour evaluation in the display shader.
fragments.paletteBake=header+colour.slice(0,colour.indexOf('vec3 sourceColour'))+`
uniform float uPaletteWidth;
void main(){fragColor=vec4(palette((gl_FragCoord.x-.5)/(uPaletteWidth-1.0)),1.0);}
`;
const rampStart=colour.indexOf('float rampCDF');
const rampEnd=colour.indexOf('vec3 sourceColour');
const lookupColour=colour.slice(0,rampStart)+`
uniform sampler2D uPalette;
vec3 lookupRamp(sampler2D ramp,float t){
 float width=float(textureSize(ramp,0).x);
 return texture(ramp,vec2((clamp(t,0.0,1.0)*(width-1.0)+.5)/width,.5)).rgb;
}
vec3 palette(float t){return lookupRamp(uPalette,t);}
`+colour.slice(rampEnd);
fragments.display=fragments.display.replace(colour,lookupColour);
// Keep all three Optical ramps out of the per-pixel deformation pipeline.
fragments.optical=fragments.optical.replace(colour,lookupColour+`
uniform sampler2D uInnerPalette;
uniform sampler2D uEdgePalette;
`).replace('colourRamp(it,uInnerStops,uInnerCount,uInnerSoftness)','lookupRamp(uInnerPalette,it)')
 .replace('colourRamp(clamp(uOpticalOffset,0.0,1.0),uEdgeStops,uEdgeCount,uGradientSmooth)','lookupRamp(uEdgePalette,uOpticalOffset)');

// A smaller preview pass for mobile GPU compilers. The simulation and export
// shader retain full precision and cubic reconstruction.
fragments.displayPreview=fragments.display.replace(reconstruction,sampling+`
vec4 sampleSmooth(sampler2D source,vec2 uv){return sampleLinear(source,uv);}
`);
const smoothingStart=fragments.displayPreview.indexOf(' if(uCollision==1){\n  float cell=');
const smoothingEnd=fragments.displayPreview.indexOf(' float reach=max(uReach',smoothingStart);
if(smoothingStart>=0&&smoothingEnd>smoothingStart)fragments.displayPreview=fragments.displayPreview.slice(0,smoothingStart)+fragments.displayPreview.slice(smoothingEnd);
