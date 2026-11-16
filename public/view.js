const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function sourceUV(view,point){return point.map((n,i)=>view.center[i]+(n-.5)/view.scale);}
export function constrainView(view){
 const scale=clamp(Number(view.scale)||1,.1,64),edge=.5/scale;
 return {scale,center:view.center.map(n=>clamp(n,Math.min(edge,1-edge),Math.max(edge,1-edge)))};
}
export function zoomView(view,scale,anchor=[.5,.5]){
 const point=sourceUV(view,anchor),next=clamp(scale,.1,64);
 return constrainView({scale:next,center:point.map((n,i)=>n-(anchor[i]-.5)/next)});
}
export function panView(view,dx,dy){return constrainView({scale:view.scale,center:[view.center[0]-dx/view.scale,view.center[1]+dy/view.scale]});}
// Renderer UVs point upwards; browser rectangles point downwards.
export function artboardBounds(view){
 return {left:.5-view.center[0]*view.scale,top:.5-(1-view.center[1])*view.scale,width:view.scale,height:view.scale};
}
