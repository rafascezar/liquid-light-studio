// Shared by setup application and thumbnail rendering so previews match kept source/colours.
export function mergeSetup(defaults,current,setup,presets,{keepSource=true,keepColours=false}={}){
 const colourKeys=['innerStops','edgeStops','innerEnabled','edgeEnabled','innerMapping','innerDepth','innerAngle','innerScale','innerOffset','innerSoftness','preset','colourMode','gradientType','gradientAngle','gradientScale','gradientSmooth','colourDrift','stops','background','bgAlpha'];
 const hasPalette=!!(setup.palette||setup.look);
 const preserveColours=keepColours||!hasPalette;
 const kept=Object.fromEntries([...(preserveColours?colourKeys:[]),'aspect','quality','svg','sourceName'].map(k=>[k,structuredClone(current[k])]));
 const source=keepSource?Object.fromEntries(['shape','size','stretchX','stretchY','corner','rotation','posX','posY','sourceMode','sourceThreshold'].map(k=>[k,current[k]])):{};
 const palette=!preserveColours?(setup.palette||presets[setup.look]):null;
 const treatment=palette?{preset:setup.look||'custom',background:palette.background,stops:palette.stops.map(([colour,position])=>({colour,position})),...(palette.gradientType?{gradientType:palette.gradientType}:{}),...(palette.gradientAngle!==undefined?{gradientAngle:palette.gradientAngle}:{})}:{};
 return {...structuredClone(defaults),...structuredClone(setup.values),...treatment,...kept,...source,renderMode:setup.values.renderMode||'fluid'};
}
