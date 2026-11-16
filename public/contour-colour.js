const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=v=>v-Math.floor(v);
export function animatedContourColour(s,time=0){
 const base=clamp(Number(s.opticalOffset??.3),0,1);
 if(!s.contourColourAnimate)return base;
 const phase=fract(time*(s.contourColourFrequency??.2)+(s.contourColourPhase??0)/360),amount=s.contourColourAmount??.25;
 let wave=Math.sin(phase*Math.PI*2);
 if(s.contourColourWave==='triangle')wave=1-4*Math.abs(fract(phase+.25)-.5);
 if(s.contourColourWave==='pulse')return base;

 return clamp(base+wave*amount,0,1);
}

export function outwardContourPulse(s,time,distance){
 if(!s.contourColourAnimate||s.contourColourWave!=='pulse'||distance<0)return 0;
 const age=fract(time*(s.contourColourFrequency??.2)+(s.contourColourPhase??0)/360),reach=Math.max(.01,s.contourColourReach??.5),width=Math.max(.001,reach*(s.contourColourWidth??.35)*.5);
 const profile=Math.exp(-Math.pow(Math.abs((distance-age*reach)/width),s.contourColourSharpness??2));
 const attack=clamp(age/.16,0,1),release=clamp((age-.65)/.35,0,1);
 return profile*attack*attack*(3-2*attack)*(1-release*release*(3-2*release));
}
