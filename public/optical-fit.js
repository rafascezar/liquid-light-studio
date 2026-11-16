// Measure the visible silhouette in the same short-side units as its distance field.
export function measureSilhouette({data,width,height}){
 let minX=width,minY=height,maxX=-1,maxY=-1,depth=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const d=data[y*width+x];if(d>=0)continue;
  minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);depth=Math.max(depth,-d);
 }
 return {span:maxX<0?.1:Math.max(maxX-minX+1,maxY-minY+1)/Math.min(width,height),depth:Math.max(depth,1/Math.min(width,height))};
}
export function fitOpticalSetup(metrics,profile){
 const {span,depth}=metrics;
 // Thin marks get a tighter atmosphere, avoiding the merger of nearby contours.
 const reach=Math.max(.008,Math.min(span*profile.outer,depth*2.2,.18));
 return {opticalInner:Math.max(.002,Math.min(depth*profile.inner,1.5)),opticalOuter:reach,opticalStretch:Math.min(span*(profile.stretch||0),depth*1.5,.12)};
}
