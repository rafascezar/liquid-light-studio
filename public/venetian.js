// One source-coordinate warp for the silhouette, gradients and emitted light.
export function venetianPoint(uv,{center=[.5,.5],aspect=[1,1],amount=0,count=36,angle=0,depth=.45,softness=.55,offset=0,time=0,speed=0,timeDisplacement=0}={}){
 const n=Math.max(6,count),x=Math.cos(angle),y=Math.sin(angle),base=((uv[0]-center[0])*aspect[0]*x+(uv[1]-center[1])*aspect[1]*y)*n+offset,phase=base+(time-Math.floor(base)*timeDisplacement*amount)*speed;
 const saw=phase-Math.floor(phase)-.5,rib=saw*(1-softness)+Math.sin(phase*Math.PI*2)/Math.PI/2*softness,shift=rib*depth*amount/n;
 return [uv[0]+x*shift/aspect[0],uv[1]+y*shift/aspect[1]];
}
export function venetianOutwardPoint(uv,{aspect=[1,1],normal=[1,0],distance=0,amount=0,count=36,depth=.45,softness=.55,offset=0,time=0,speed=0,timeDisplacement=0}={}){
 const n=Math.max(6,count),clock=time-Math.floor(Math.max(0,distance)*n+offset)*timeDisplacement*amount,phase=distance*n+offset+clock*speed;
 const saw=phase-Math.floor(phase)-.5,rib=saw*(1-softness)+Math.sin(phase*Math.PI*2)/Math.PI/2*softness,shift=rib*depth*amount/n;
 return [uv[0]+normal[0]*shift/aspect[0],uv[1]+normal[1]*shift/aspect[1]];
}
export const venetianGLSL=`
float venetianTime(vec2 uv,vec2 center,vec2 aspect,float amount,float count,float angle,float offset,float time,float displacement){
 vec2 axis=vec2(cos(angle),sin(angle));float rib=floor(dot((uv-center)*aspect,axis)*max(6.0,count)+offset);
 return time-rib*displacement*amount;
}
vec2 venetianPoint(vec2 uv,vec2 center,vec2 aspect,float amount,float count,float angle,float depth,float softness,float offset,float time,float speed,float displacement){
 float n=max(6.0,count);vec2 axis=vec2(cos(angle),sin(angle));
 float localTime=venetianTime(uv,center,aspect,amount,count,angle,offset,time,displacement);
 float phase=dot((uv-center)*aspect,axis)*n+offset+localTime*speed;
 float rib=mix(fract(phase)-.5,sin(phase*6.2831853)/6.2831853,softness);
 return uv+axis*rib*depth*amount/(n*aspect);
}
float venetianOutwardTime(float distance,float amount,float count,float offset,float time,float displacement){
 return time-floor(max(distance,0.0)*max(6.0,count)+offset)*displacement*amount;
}
vec2 venetianOutwardPoint(vec2 uv,vec2 aspect,vec2 normal,float distance,float amount,float count,float depth,float softness,float offset,float time,float speed,float displacement){
 float n=max(6.0,count),clock=venetianOutwardTime(distance,amount,n,offset,time,displacement);
 float phase=distance*n+offset+clock*speed;
 float rib=mix(fract(phase)-.5,sin(phase*6.2831853)/6.2831853,softness);
 return uv+normal*rib*depth*amount/(n*aspect);
}
`;
