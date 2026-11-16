// One shared clock drives live previews and frame-by-frame exports.
export function opticalLayer(settings,index,time){
 const main=index===0,phase=main?0:(index-1)*settings.pulseStagger;
 const age=((time*settings.pulseSpeed-phase)%1+1)%1;
 const pulsing=settings.pulseEnabled&&!(main&&settings.contourPulse);
 const progress=pulsing&&!main?index+age:index;
 const influence=main?(settings.mainPulseInfluence??0):1;
 const expansion=settings.pulseExpansion+(settings.copyCount||0)*settings.copySpacing;
 const scale=main?1+(pulsing?age*expansion*influence:0):1+(pulsing?age*expansion:index*settings.copySpacing);
 const spread=main?0:Math.ceil(index/2)*(index%2?1:-1);
 const pulseFade=pulsing?Math.min(1,age/.06)*Math.pow(1-age,settings.pulseFade):1;
 const fade=main?1+(pulseFade-1)*influence:pulseFade;
 return {scale:Math.max(.02,scale),offset:[settings.copyOffsetX*progress+(settings.copySpreadX??0)*spread,settings.copyOffsetY*progress+(settings.copySpreadY??0)*spread],rotation:settings.copyRotation*index*Math.PI/180,opacity:settings.layerOpacity*(main?fade:settings.copyOpacity*fade),phase:index*settings.deformOffset,influence:main?settings.mainInfluence:settings.copyInfluence,age};
}

export function opticalStack(settings,time){
 const copies=Array.from({length:Math.round(settings.copyCount||0)},(_,i)=>({index:i+1,...opticalLayer(settings,i+1,time)}));
 if(settings.pulseEnabled)copies.sort((a,b)=>b.scale-a.scale);else copies.reverse();
 const main={index:0,...opticalLayer(settings,0,time)};
 return settings.copyOrder==='front'?[main,...copies]:[...copies,main];
}
