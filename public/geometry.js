import {makeTrimField} from './trim-path.js?v=trim-42';
export function sanitiseSVG(text){
 if(typeof text!=='string'||text.length>2_000_000)throw new Error('Choose an SVG smaller than 2 MB.');
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');
 if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw new Error('This file is not a valid SVG.');
 const root=doc.documentElement;
 const localURLs=value=>value.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi,(whole,quote,ref)=>ref.trim().startsWith('#')?whole:'none');
 for(const el of [...root.querySelectorAll('script,foreignObject,iframe,object,embed,image,audio,video')])el.remove();
 for(const el of [root,...root.querySelectorAll('*')]){
  for(const attr of [...el.attributes]){
   const name=attr.name.toLowerCase(),value=attr.value;
   if(name.startsWith('on')||((name==='href'||name==='xlink:href')&&!value.startsWith('#')))el.removeAttribute(attr.name);
   else if(localURLs(value)!==value)el.setAttribute(attr.name,localURLs(value));
  }
 }
 for(const style of [...root.querySelectorAll('style')]){
  style.textContent=localURLs(style.textContent.replace(/@import[^;]*;?/gi,''));
 }
 if(root.querySelector('text'))throw new Error('This SVG contains live text. Convert the text to outlines, then import it again.');
 const numbers=(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
 if(numbers.length!==4||!numbers.every(Number.isFinite)||numbers[2]<=0||numbers[3]<=0){
  const w=parseFloat(root.getAttribute('width'))||512,h=parseFloat(root.getAttribute('height'))||512;
  if(w<=0||h<=0)throw new Error('Give the SVG a valid viewBox.');
  root.setAttribute('viewBox',`0 0 ${w} ${h}`);
 }else root.setAttribute('viewBox',numbers.join(' '));
 root.setAttribute('xmlns','http://www.w3.org/2000/svg');
 const vb=root.getAttribute('viewBox').split(/[\s,]+/).map(Number);
 const scale=2048/Math.max(vb[2],vb[3]);
 root.setAttribute('width',Math.max(1,Math.round(vb[2]*scale)));
 root.setAttribute('height',Math.max(1,Math.round(vb[3]*scale)));
 return new XMLSerializer().serializeToString(root);
}

export function builtinSVG(name,corner=0.22){
 const open='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="white">';
 const shapes={
  rounded:`<rect x="12" y="12" width="232" height="232" rx="${Math.max(0,Math.min(.5,corner))*232}"/>`,
  circle:'<circle cx="128" cy="128" r="116"/>',
  triangle:'<path d="M128 10 246 239H10Z"/>',
  cross:'<path d="M45 20 128 103 211 20 236 45 153 128 236 211 211 236 128 153 45 236 20 211 103 128 20 45Z"/>',
  star:'<path d="m128 9 35 73 81 12-59 57 14 81-71-38-71 38 14-81-59-57 81-12Z"/>'
 };
 return open+(shapes[name]||shapes.rounded)+'</svg>';
}

function loadSVG(svg){return new Promise((resolve,reject)=>{
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const img=new Image();
 img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
 img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('The browser could not render this SVG. Try exporting it as a plain SVG.'));};img.src=url;
});}

function selected(data,i,mode,threshold){
 const alpha=data[i+3]/255;if(alpha<.25)return false;
 if(mode==='alpha')return true;
 const luminance=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;
 return mode==='light'?luminance>=threshold:luminance<=threshold;
}

// Exact separable squared Euclidean distance transform.
function edt1d(f,n,d,v,z){
 let k=0;v[0]=0;z[0]=-Infinity;z[1]=Infinity;
 for(let q=1;q<n;q++){
  let s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);
  while(s<=z[k]){k--;s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);}
  k++;v[k]=q;z[k]=s;z[k+1]=Infinity;
 }
 k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])*(q-v[k])+f[v[k]];}
}
export function squaredDistance(mask,width,height,inside){
 const size=Math.max(width,height),f=new Float64Array(size),d=new Float64Array(size),v=new Int32Array(size),z=new Float64Array(size+1),tmp=new Float32Array(width*height),out=new Float32Array(width*height);
 for(let x=0;x<width;x++){
  for(let y=0;y<height;y++)f[y]=(!!mask[y*width+x]===inside)?0:1e12;
  edt1d(f,height,d,v,z);for(let y=0;y<height;y++)tmp[y*width+x]=d[y];
 }
 for(let y=0;y<height;y++){
  for(let x=0;x<width;x++)f[x]=tmp[y*width+x];
  edt1d(f,width,d,v,z);for(let x=0;x<width;x++)out[y*width+x]=d[x];
 }return out;
}
export function signedDistance(mask,width,height,coverage=null){
 const toInside=squaredDistance(mask,width,height,true),toOutside=squaredDistance(mask,width,height,false),out=new Float32Array(width*height),scale=1/Math.min(width,height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;let distance=Math.sqrt(toInside[i])-Math.sqrt(toOutside[i]);
  if(coverage){distance=Math.sign(distance)*Math.max(0,Math.abs(distance)-.5);if(coverage[i]>0&&coverage[i]<1)distance=.5-coverage[i];}
  out[(height-1-y)*width+x]=distance*scale;
 }return out;
}

export async function makeSourceField(settings,width,height){
 const isSVG=settings.shape==='svg';const svg=sanitiseSVG(isSVG?settings.svg:builtinSVG(settings.shape,settings.corner));
 const img=await loadSVG(svg),raw=document.createElement('canvas');raw.width=img.naturalWidth;raw.height=img.naturalHeight;
 const rc=raw.getContext('2d',{willReadFrequently:true});rc.drawImage(img,0,0);
 const pixels=rc.getImageData(0,0,raw.width,raw.height).data;
 const mode=isSVG?settings.sourceMode:'alpha',threshold=settings.sourceThreshold;
 let x0=raw.width,y0=raw.height,x1=-1,y1=-1;
 for(let y=0;y<raw.height;y++)for(let x=0;x<raw.width;x++)if(selected(pixels,(y*raw.width+x)*4,mode,threshold)){
  x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
 }
 if(x1<0)throw new Error('No visible silhouette in this mode. Try SVG opacity or adjust the silhouette threshold.');
 const cropW=x1-x0+1,cropH=y1-y0+1,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});const fit=Math.min(width,height)*settings.size/Math.max(cropW,cropH);
 ctx.translate(width*(.5+settings.posX/100),height*(.5-settings.posY/100));ctx.rotate(-settings.rotation*Math.PI/180);
 // Draw the vector image directly. Resizing a cropped raster softens and steps the contour.
 ctx.scale(fit*(settings.stretchX??1),fit*(settings.stretchY??1));ctx.drawImage(img,-x0-cropW/2,-y0-cropH/2,raw.width,raw.height);
 const data=ctx.getImageData(0,0,width,height).data,mask=new Uint8Array(width*height),coverage=new Float32Array(width*height);let count=0;
 for(let i=0;i<mask.length;i++){
  const j=i*4,a=data[j+3]/255,l=(.2126*data[j]+.7152*data[j+1]+.0722*data[j+2])/255;
  const selection=mode==='alpha'?1:Math.max(0,Math.min(1,(mode==='light'?l-threshold:threshold-l)/.06+.5));
  coverage[i]=a*selection;mask[i]=coverage[i]>=.5?1:0;count+=mask[i];
 }
 const dataField=count?signedDistance(mask,width,height,coverage):new Float32Array(width*height).fill(4);
 return {data:dataField,mask,width,height,shapeRatio:cropW/cropH,trim:makeTrimField(mask,width,height)};
}
