// Trace visible raster boundaries once, then store arc position per pixel.
// All animation is a texture lookup: no contour searches in the GPU shader.
export function makeTrimField(mask,w,h,samples=512){
 const edges=[],starts=new Map(),stride=w+1;
 const add=(x,y,xx,yy,pixel)=>{const e={a:y*stride+x,b:yy*stride+xx,x,y,pixel};const i=edges.push(e)-1;if(!starts.has(e.a))starts.set(e.a,[]);starts.get(e.a).push(i);};
 const filled=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&mask[y*w+x];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(filled(x,y)){
  const p=y*w+x;
  if(!filled(x,y-1))add(x,y,x+1,y,p);
  if(!filled(x+1,y))add(x+1,y,x+1,y+1,p);
  if(!filled(x,y+1))add(x+1,y+1,x,y+1,p);
  if(!filled(x-1,y))add(x,y+1,x,y,p);
 }
 const seen=new Uint8Array(edges.length),loops=[];
 for(let i=0;i<edges.length;i++)if(!seen[i]){
  const loop=[];let j=i;
  while(j!==undefined&&!seen[j]){seen[j]=1;loop.push(edges[j]);j=(starts.get(edges[j].b)||[]).find(k=>!seen[k]);}
  if(loop.length>=4)loops.push(loop);
 }
 // Largest contours first; cap only subpixel noise in pathological imports.
 loops.sort((a,b)=>b.length-a.length);loops.length=Math.min(loops.length,2048);
 const rows=Math.max(1,loops.length),atlas=new Float32Array(samples*rows*4),seed=new Int32Array(w*h).fill(-1),meta=[];
 loops.forEach((loop,row)=>{
  const n=loop.length;
  for(let j=0;j<n;j++){const e=loop[j];seed[e.pixel]=meta.length;meta.push([j/n,row,n/Math.min(w,h),1]);}
  const point=t=>{const f=((t%n)+n)%n,i=Math.floor(f),a=loop[i],b=loop[(i+1)%n];return [(a.x+(b.x-a.x)*(f-i))/w,1-(a.y+(b.y-a.y)*(f-i))/h];};
  for(let j=0;j<samples;j++){
   const t=j/samples*n,p=point(t),a=point(t-2),b=point(t+2),dx=(b[0]-a[0])*w,dy=(b[1]-a[1])*h,len=Math.hypot(dx,dy)||1;
   atlas.set([p[0],p[1],-dy/len,dx/len],(row*samples+j)*4);
  }
 });
 // Separable exact nearest-seed transform, carrying the contour metadata.
 const N=Math.max(w,h),f=new Float64Array(N),v=new Int32Array(N),z=new Float64Array(N+1),dist=new Float64Array(w*h),ids=new Int32Array(w*h).fill(-1),data=new Float32Array(w*h*4);
 const transform=(n,write)=>{let k=0;v[0]=0;z[0]=-Infinity;z[1]=Infinity;
  for(let q=1;q<n;q++){let s;do{s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);if(s>z[k])break;k--;}while(k>=0);k++;v[k]=q;z[k]=s;z[k+1]=Infinity;}
  k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;write(q,v[k],(q-v[k])**2+f[v[k]]);}
 };
 for(let x=0;x<w;x++){for(let y=0;y<h;y++)f[y]=seed[y*w+x]>=0?0:1e12;transform(h,(y,p,d)=>{dist[y*w+x]=d;ids[y*w+x]=seed[p*w+x];});}
 for(let y=0;y<h;y++){for(let x=0;x<w;x++)f[x]=dist[y*w+x];transform(w,(x,p)=>{const id=ids[y*w+p];if(id>=0)data.set(meta[id],((h-1-y)*w+x)*4);});}
 return {data,atlas,rows,samples,contours:loops.length};
}
export function trimPhase(settings,time){
 const offset=(settings.trimOffset||0)/360+(settings.trimAnimate?time*(settings.trimVelocity||0)/360:0);
 const start=(settings.trimIn??0)/100,end=(settings.trimOut??100)/100;
 let span=Math.abs(end-start)>=.999999?1:((end-start)%1+1)%1;
 const cycle=((time/Math.max(.1,settings.trimDuration??4))%1+1)%1;
 if(settings.trimReveal==='draw')span*=cycle;
 if(settings.trimReveal==='pingpong')span*=1-Math.abs(cycle*2-1);
 const direction=settings.trimAnimate&&settings.trimVelocity<0?-1:!settings.trimAnimate&&settings.trimReveal==='pingpong'&&cycle>.5?-1:1;
 return {direction,start:((start+offset)%1+1)%1,end:((start+span+offset)%1+1)%1,span};
}
