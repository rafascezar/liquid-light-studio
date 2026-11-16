import {animatedContourColour} from './contour-colour.js?v=pulse-fade-54';
import {fieldUniforms} from './effect-fields.js?v=radial-core-62';
import {trimPhase} from './trim-path.js?v=trim-42';
import {opticalStack} from './optical-layers.js?v=studio-34';
import {measureSilhouette} from './optical-fit.js?v=geometry-12';
import {vertex,fragments} from './shaders.js?v=radial-core-62';

export function linearColour(hex){
 return [1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);});
}
export function flipPixelRows(pixels,width,height){
 const stride=width*4,flipped=new Uint8ClampedArray(pixels.length);
 for(let y=0;y<height;y++)flipped.set(pixels.subarray(y*stride,(y+1)*stride),(height-1-y)*stride);
 return flipped;
}
export class LightEngine{
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!this.gl)throw new Error('This tool needs WebGL 2. Open it in a current Chrome, Safari, Firefox, or Edge browser with graphics acceleration enabled.');
  const gl=this.gl;
  this.floatBuffers=!!gl.getExtension('EXT_color_buffer_float');
  if(!this.floatBuffers&&!gl.getExtension('EXT_color_buffer_half_float'))throw new Error('Floating-point graphics buffers are unavailable on this device. Try an updated browser with graphics acceleration enabled.');
  gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
  // A real vertex stream avoids relying on attribute-free draws in mobile drivers.
  this.vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  this.compactPreview=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
  this.programs={};this.targets=[];this.time=0;this.pointer=[0,0,0,0];this.pointerUntil=0;
  // Compile only the passes in use; unused optical shaders must not block Fluid startup.
  const viewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  this.maxSize=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),viewport[0],viewport[1]);this.source=null;this.captureTarget=null;
 }
 compile(name,fragment){
  const gl=this.gl,compile=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(`${name} shader: ${log}`);}return s;};
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(`${name}: ${gl.getProgramInfoLog(program)}`);
  const uniforms=[];
  for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(program,i);uniforms.push({name:u.name.replace(/\[0\]$/,''),type:u.type,size:u.size,location:gl.getUniformLocation(program,u.name)});}
  return {program,uniforms};
 }
 target(w,h,fullPrecision=false,byte=false){
  const gl=this.gl,texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,fullPrecision?gl.NEAREST:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,fullPrecision?gl.NEAREST:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);const useFloat=!byte&&fullPrecision&&this.floatBuffers;
  gl.texImage2D(gl.TEXTURE_2D,0,byte?gl.RGBA8:useFloat?gl.RGBA32F:gl.RGBA16F,w,h,0,gl.RGBA,byte?gl.UNSIGNED_BYTE:useFloat?gl.FLOAT:gl.HALF_FLOAT,null);
  const framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){
   if(useFloat){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);}
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.deleteTexture(texture);gl.deleteFramebuffer(framebuffer);throw new Error(`Graphics buffer unavailable (${w} × ${h}). Try a lower flow detail.`);}
  }
  const t={texture,framebuffer,w,h};this.targets.push(t);this.clear(t);return t;
 }
 pair(w,h,fullPrecision=false){const p={read:this.target(w,h,fullPrecision),write:this.target(w,h,fullPrecision)};p.swap=()=>{[p.read,p.write]=[p.write,p.read];};return p;}
 clear(target){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);gl.viewport(0,0,target.w,target.h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
 configure(ratio,detail){
  const gl=this.gl;for(const t of this.targets){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.framebuffer);}this.targets=[];this.opticalBuffers=null;this.paletteTarget=null;this.paletteKey=null;this.opticalPalettes=null;this.presentationTarget=null;
  this.ratio=ratio;this.width=Math.max(64,Math.round(ratio>=1?detail:detail*ratio));this.height=Math.max(64,Math.round(ratio>=1?detail/ratio:detail));this.h=1/Math.min(this.width,this.height);
  const w=this.width,h=this.height;
  this.velocity=this.pair(w,h);this.dye=this.pair(w,h,true);this.pressure=this.pair(w,h);this.curl=this.target(w,h);this.divergence=this.target(w,h);this.originalVelocity=this.target(w,h);
  this.bloom=this.pair(Math.max(32,Math.round(w/2)),Math.max(32,Math.round(h/2)),true);this.wideBloom=this.pair(Math.max(16,Math.round(w/4)),Math.max(16,Math.round(h/4)),true);
  this.reset();
 }
 setSource(source){
  const gl=this.gl;if(this.source)gl.deleteTexture(this.source.texture);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,source.width,source.height,0,gl.RED,gl.FLOAT,source.data);
  for(const t of [this.trimMap,this.trimAtlas])if(t)gl.deleteTexture(t.texture);
  const upload=(w,h,data)=>{const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,name,gl.NEAREST);for(const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,w,h,0,gl.RGBA,gl.FLOAT,data);return {texture,w,h};};
  this.trimMap=upload(source.width,source.height,source.trim.data);this.trimAtlas=upload(source.trim.samples,source.trim.rows,source.trim.atlas);
  this.source={texture,w:source.width,h:source.height,metrics:measureSilhouette(source)};this.reset();
 }
 reset(){this.paletteKey=null;if(this.opticalPalettes)for(const entry of Object.values(this.opticalPalettes))entry.key=null;for(const t of this.targets)this.clear(t);this.time=0;this.pointerUntil=0;}
 base(settings,dt=0){
  const count=settings.colourMode==='single'?1:Math.max(1,Math.min(10,settings.stops.length)),stops=new Float32Array(40),sorted=settings.colourMode==='single'?[settings.stops[0]]:[...settings.stops].sort((a,b)=>a.position-b.position);
  for(let i=0;i<10;i++){const stop=sorted[Math.min(i,count-1)];stops.set([...linearColour(stop.colour),stop.position],i*4);}
  const pack=values=>{const source=(values?.length?values:settings.stops).slice(0,10).sort((a,b)=>a.position-b.position),out=new Float32Array(40);for(let i=0;i<10;i++){const stop=source[Math.min(i,source.length-1)];out.set([...linearColour(stop.colour),stop.position],i*4);}return out;};
  const trim=trimPhase(settings,this.time);
  return {...fieldUniforms(settings),uContourColourPulse:settings.contourColourAnimate&&settings.contourColourWave==='pulse'?1:0,uContourColourFrequency:settings.contourColourFrequency??.2,uContourColourAmount:settings.contourColourAmount??.25,uContourColourPhase:(settings.contourColourPhase??0)/360,uContourColourReach:settings.contourColourReach??.5,uContourColourWidth:settings.contourColourWidth??.35,uContourColourSharpness:settings.contourColourSharpness??2,
   uTrimMap:this.trimMap,uTrimAtlas:this.trimAtlas,uTrimEnabled:settings.trimEnabled?1:0,uTrimStart:trim.start,uTrimEnd:trim.end,uTrimDirection:trim.direction,uTrimSpan:trim.span,uTrimFeather:(settings.trimFeather??1)/100,
   uTrimLine:settings.trimStyle==='line'?1:0,uTrimWidth:settings.trimWidth??.005,
   uTipMode:settings.trimEnabled?(['off','out','in','both'].indexOf(settings.tipMode||'off')):0,uTipInside:settings.tipInside??.2,uTipOutside:settings.tipOutside??.3,uTipLength:settings.tipLength??.3,uTipAdherence:settings.tipAdherence??0,uTipFanStart:(settings.tipFanStart??0)/100,uTipStrength:settings.tipStrength??1,uTipSoftness:settings.tipSoftness??.5,uTipOnly:settings.tipOnly?1:0,
   uContourPulse:settings.contourPulse?1:0,uContourCount:settings.contourCount??3,uContourReach:settings.contourReach??.18,uContourWidth:settings.contourWidth??.025,uContourSpeed:settings.contourSpeed??.2,uContourFade:settings.contourFade??1.4,
   uLayerScale:1,uLayerOffset:[0,0],uLayerRotation:0,uLayerOpacity:1,uLayerPhase:0,uNormalPass:0,uOutputSize:[this.width,this.height],uGlassThickness:settings.glassThickness??.05,
   uDeformType:['wave','noise','twist'].indexOf(settings.deformType||'wave'),uDeformAmount:settings.deformAmount??0,uDeformScale:settings.deformScale??2,uDeformAngle:(settings.deformAngle??0)*Math.PI/180,uDeformSpeed:settings.deformSpeed??.15,uDeformInfluence:settings.mainInfluence??0,
   uInnerEnabled:settings.innerEnabled?1:0,uInnerMapping:['inset','linear','radial'].indexOf(settings.innerMapping||'inset'),uInnerStops:pack(settings.innerStops),uInnerCount:settings.innerStops?.length||count,uInnerDepth:settings.innerDepth??.1,uInnerAngle:(settings.innerAngle??90)*Math.PI/180,uInnerScale:settings.innerScale??1,uInnerOffset:settings.innerOffset??0,uInnerSoftness:settings.innerSoftness??.65,
   uEdgeEnabled:settings.edgeEnabled?1:0,uEdgeStops:pack(settings.edgeStops),uEdgeCount:settings.edgeStops?.length||count,
   uSDF:this.source,uSdfTexel:[1/this.source.w,1/this.source.h],uTexel:[1/this.width,1/this.height],uH:this.h,uAspect:[this.width*this.h,this.height*this.h],uCenter:[.5+settings.posX/100,.5+settings.posY/100],uCollision:settings.renderMode==='optical'?(settings.opticalCollision?1:0):(settings.collision===false?0:1),
   uTime:this.time,uDt:dt,uFlowSpeed:settings.flowSpeed,uDirection:['outward','upward','orbit','drift'].indexOf(settings.direction),uDriftAngle:settings.driftAngle*Math.PI/180,
   uSourceScale:this.source.metrics?.span||settings.size||.5,uStops:stops,uStopCount:settings.colourMode==='single'?1:count,uGradientType:['linear','radial','angular'].indexOf(settings.gradientType),uGradientAngle:settings.gradientAngle*Math.PI/180,uGradientScale:settings.gradientScale,uColourDrift:settings.colourDrift,uGradientSmooth:settings.gradientSmooth,
   uOpticalSourceScale:this.source.metrics?.span||settings.size||.5,uOpticalOrbit:settings.opticalOrbit??0,uOpticalOrbitSpeed:settings.opticalOrbitSpeed??0,uOpticalRipple:settings.opticalRipple??0,uOpticalRippleFrequency:settings.opticalRippleFrequency??4,uOpticalRippleSpeed:settings.opticalRippleSpeed??.3,uOpticalBreathe:settings.opticalBreathe??0,uOpticalBreatheSpeed:settings.opticalBreatheSpeed??.15,uOpticalSamples:({'256':48,'384':64,'512':96,'768':144,'1024':192})[settings.quality]||96,uOpticalInner:settings.opticalInner??.25,uOpticalOuter:settings.opticalOuter??.65,uOpticalOffset:animatedContourColour(settings,this.time),uOpticalStretch:settings.opticalStretch??0,uOpticalAngle:(settings.opticalAngle??270)*Math.PI/180,uOpticalBend:settings.opticalBend??0,uOpticalSpeed:settings.opticalSpeed??.15,uOpticalInside:settings.opticalInside??1,uOpticalOutside:settings.opticalOutside??1,uOpticalEdge:settings.opticalEdge??.5,uOpticalEdgeWidth:settings.opticalEdgeWidth??.003,uOpticalSoftness:settings.opticalSoftness??.5,
   uFluidity:settings.fluidity,uExposure:settings.renderMode==='optical'?(settings.opticalExposure??1):settings.exposure,uGlowStrength:settings.glowStrength,uReach:settings.reach,uFalloff:settings.falloff,uGrain:settings.grain,uShapeFill:settings.shapeFill,uRim:settings.rim,
   uBackground:linearColour(settings.background),uBackgroundAlpha:settings.bgAlpha,uTurbulence:settings.turbulence,uEddySize:settings.eddySize,uEvolution:settings.evolution,uSwirl:settings.swirl,uMomentum:settings.momentum,
   uPointer:this.pointer,uPointerActive:performance.now()<this.pointerUntil?1:0,uSeed:settings.seed*.731,uEmission:settings.emission,uEmissionWidth:settings.emissionWidth,uPulse:settings.pulse,
   uEffectNormal:settings.effectDirection==='outward'?1:0,uEffectTimeDisplacement:settings.effectTimeDisplacement??0,uEffectAmount:settings.venetian?settings.effectAmount:0,uEffectSlats:settings.effectSlats??36,uEffectAngle:(settings.effectAngle||0)*Math.PI/180,uEffectDepth:settings.effectDepth??.45,uEffectSoftness:settings.effectSoftness??.55,uEffectSpeed:settings.effectSpeed||0,uEffectOffset:settings.effectOffset||0
  };
 }
 draw(name,target,values,w,h){
  const gl=this.gl,p=this.programs[name]||(this.programs[name]=this.compile(name,fragments[name]));gl.useProgram(p.program);gl.bindFramebuffer(gl.FRAMEBUFFER,target?target.framebuffer:null);gl.viewport(0,0,target?target.w:w,target?target.h:h);let unit=0;
  for(const u of p.uniforms){
   const value=values[u.name];if(value===undefined)throw new Error(`Missing ${name}.${u.name}`);
   if(u.type===gl.SAMPLER_2D){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,value.texture);gl.uniform1i(u.location,unit++);}
   else if(u.type===gl.FLOAT)gl.uniform1f(u.location,value);
   else if(u.type===gl.INT||u.type===gl.BOOL)gl.uniform1i(u.location,value);
   else if(u.type===gl.FLOAT_VEC2)gl.uniform2fv(u.location,value.slice(0,(u.size||1)*2));
   else if(u.type===gl.FLOAT_VEC3)gl.uniform3fv(u.location,value.slice(0,(u.size||1)*3));
   else if(u.type===gl.FLOAT_VEC4)gl.uniform4fv(u.location,value.slice(0,(u.size||1)*4));
   if(!p.verified){const error=gl.getError();if(error!==gl.NO_ERROR)throw new Error(`${name}.${u.name} upload failed (WebGL 0x${error.toString(16)}).`);}
  }
  gl.bindVertexArray(this.vao);gl.drawArrays(gl.TRIANGLES,0,3);
  // WebGL reports draw failures through getError, not JavaScript exceptions.
  // Validate each pass once so a failed GPU draw cannot masquerade as Live.
  if(!p.verified){const error=gl.getError();if(error!==gl.NO_ERROR){const failure=new Error(`${name} graphics draw failed (WebGL 0x${error.toString(16)}).`);failure.gpuStage='draw';failure.gpuCode=error;throw failure;}p.verified=true;}
 }
 step(settings,dt){
  if(!this.source)return;this.time+=dt;if(settings.renderMode==='optical')return;const c=this.base(settings,dt),vel=this.velocity,dye=this.dye,pressure=this.pressure;
  this.draw('advect',vel.write,{...c,uField:vel.read,uVelocity:vel.read,uDecay:0});vel.swap();
  this.draw('curl',this.curl,{...c,uVelocity:vel.read});
  this.draw('force',vel.write,{...c,uVelocity:vel.read,uCurl:this.curl});vel.swap();
  if(settings.viscosity>.001){
   this.draw('copy',this.originalVelocity,{uField:vel.read});
   const a=settings.viscosity*settings.viscosity*.001*dt/(this.h*this.h);
   for(let i=0;i<6;i++){this.draw('diffuseVelocity',vel.write,{...c,uField:vel.read,uOriginal:this.originalVelocity,uA:a});vel.swap();}
  }
  this.draw('divergence',this.divergence,{...c,uVelocity:vel.read});
  this.clear(pressure.read);
  for(let i=0;i<18;i++){this.draw('pressure',pressure.write,{...c,uPressure:pressure.read,uDivergence:this.divergence});pressure.swap();}
  this.draw('project',vel.write,{...c,uVelocity:vel.read,uPressure:pressure.read});vel.swap();
  this.draw('advect',dye.write,{...c,uField:dye.read,uVelocity:vel.read,uDecay:1/Math.max(.2,settings.lifetime)});dye.swap();
  if(settings.diffusion>.001){
   const a=Math.min(.24,settings.diffusion*settings.diffusion*.00035*dt/(this.h*this.h));
   for(let i=0;i<3;i++){this.draw('diffuseDye',dye.write,{...c,uField:dye.read,uA:a});dye.swap();}
  }
  this.draw('emit',dye.write,{...c,uField:dye.read});dye.swap();
 }
 prepareBloom(settings){
  // Keep the same halo spread when the simulation resolution changes.
  const radius=(1+settings.glowRadius*14)*Math.max(this.width,this.height)/384,b=this.bloom,wide=this.wideBloom,c=this.base(settings);
  this.draw('blur',b.write,{...c,uField:this.dye.read,uStep:[radius/this.width,0]});b.swap();
  this.draw('blur',b.write,{...c,uField:b.read,uStep:[0,radius/this.height]});b.swap();
  this.draw('blur',wide.write,{...c,uField:b.read,uStep:[radius*2/this.width,0]});wide.swap();
  this.draw('blur',wide.write,{...c,uField:wide.read,uStep:[0,radius*2/this.height]});wide.swap();
 }
 displayValues(settings,alphaOverride,view){
  const c=this.base(settings);if(alphaOverride!==undefined)c.uBackgroundAlpha=alphaOverride;
  return {...c,uPalette:this.paletteTarget,uInnerPalette:this.opticalPalettes?.inner?.target,uEdgePalette:this.opticalPalettes?.edge?.target,uDye:this.dye.read,uBloom:this.bloom.read,uWideBloom:this.wideBloom.read,uViewScale:view?.scale||1,uViewCenter:view?.center||[.5,.5]};
 }
 preparePalette(settings){
  const key=JSON.stringify([settings.colourMode,settings.stops,settings.gradientSmooth]);
  if(this.paletteTarget&&this.paletteKey===key)return;
  if(!this.paletteTarget)this.paletteTarget=this.target(Math.min(4096,this.maxSize),1);
  this.draw('paletteBake',this.paletteTarget,{...this.base(settings),uPaletteWidth:this.paletteTarget.w});
  this.paletteKey=key;
 }
 prepareOpticalPalettes(settings){
  this.preparePalette(settings);
  const base=this.base(settings),cache=this.opticalPalettes||(this.opticalPalettes={});
  for(const [name,stops,count,softness] of [
   ['inner',base.uInnerStops,base.uInnerCount,base.uInnerSoftness],
   ['edge',base.uEdgeStops,base.uEdgeCount,base.uGradientSmooth]
  ]){
   const key=JSON.stringify([Array.from(stops),count,softness]);
   const entry=cache[name]||(cache[name]={target:this.target(Math.min(4096,this.maxSize),1)});
   if(entry.key===key)continue;
   this.draw('paletteBake',entry.target,{...base,uStops:stops,uStopCount:count,uGradientSmooth:softness,uPaletteWidth:entry.target.w});
   entry.key=key;
  }
 }
 presentFluid(name,values,width,height){
  const gl=this.gl;
  if(!this.offscreenPresentation){
   try{this.draw(name,null,values,width,height);return;}
   catch(error){if(error.gpuStage!=='draw'||error.gpuCode!==gl.INVALID_OPERATION)throw error;this.offscreenPresentation=true;}
  }
  // Some drivers reject the display pipeline against the browser's default
  // framebuffer. Render into an owned RGBA8 buffer, then blit the result.
  let target=this.presentationTarget;
  if(!target||target.w!==width||target.h!==height){
   if(target){gl.deleteTexture(target.texture);gl.deleteFramebuffer(target.framebuffer);this.targets=this.targets.filter(t=>t!==target);}
   target=this.presentationTarget=this.target(width,height,false,true);
  }
  this.draw(name,target,values);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,target.framebuffer);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
  gl.blitFramebuffer(0,0,width,height,0,0,width,height,gl.COLOR_BUFFER_BIT,gl.NEAREST);
  const error=gl.getError();gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  if(error!==gl.NO_ERROR)throw new Error(`Frame presentation failed (WebGL 0x${error.toString(16)}).`);
 }
 render(settings,width,height,alphaOverride,view){
  if(!this.source)return;
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  if(settings.renderMode==='optical'){this.renderOptical(settings,null,width,height,alphaOverride,view);return;}
  this.prepareBloom(settings);this.preparePalette(settings);this.presentFluid(this.compactPreview?'displayPreview':'display',this.displayValues(settings,alphaOverride,view),width,height);
 }
 renderOptical(settings,target,width,height,alphaOverride,view){
  this.prepareOpticalPalettes(settings);
  const gl=this.gl;
  if(!this.opticalBuffers||this.opticalBuffers.width!==width||this.opticalBuffers.height!==height){
   if(this.opticalBuffers)for(const t of this.opticalBuffers.all){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.framebuffer);this.targets=this.targets.filter(v=>v!==t);}
   const accumulated=this.pair(width,height),layer=this.target(width,height),normal=this.target(width,height),refraction=this.target(width,height);
   this.opticalBuffers={width,height,accumulated,layer,normal,refraction,all:[accumulated.read,accumulated.write,layer,normal,refraction]};
  }
  const b=this.opticalBuffers,background=[1,3,5].map(i=>parseInt(settings.background.slice(i,i+2),16)/255),alpha=alphaOverride??settings.bgAlpha;
  gl.bindFramebuffer(gl.FRAMEBUFFER,b.accumulated.read.framebuffer);gl.viewport(0,0,width,height);gl.clearColor(...background,alpha);gl.clear(gl.COLOR_BUFFER_BIT);
  const common=this.displayValues(settings,0,view),glass=settings.glassStrength||0;
  const layers=opticalStack(settings,this.time);
  for(const info of layers){if(info.opacity<.0001&&glass===0)continue;
   const values={...common,uContourPulse:info.index===0&&settings.contourPulse?1:0,uLayerScale:info.scale,uLayerOffset:info.offset,uLayerRotation:info.rotation,uLayerOpacity:info.opacity,uLayerPhase:info.phase,uDeformInfluence:info.influence,uOutputSize:[width,height],uOpticalSamples:target?192:common.uOpticalSamples};
   this.draw('optical',b.layer,values);
   if(glass>0){
    this.draw('optical',b.normal,{...values,uNormalPass:1});
    this.draw('glassPrefilter',b.refraction,{uField:b.accumulated.read});
    gl.bindTexture(gl.TEXTURE_2D,b.refraction.texture);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
   }
   this.draw('composite',b.accumulated.write,{...common,uBase:b.accumulated.read,uLayer:b.layer,uNormalMap:glass>0?b.normal:b.layer,uRefractionMap:glass>0?b.refraction:b.layer,uBlendMode:['normal','add','screen','multiply'].indexOf(settings.blendMode||'normal'),uGlass:glass,uGlassTransmission:settings.glassTransmission??.85,uGlassReflection:settings.glassReflection??.18,uDispersion:settings.dispersion||0});b.accumulated.swap();
  }
  this.draw('copy',target,{uField:b.accumulated.read},width,height);
 }
 capturePixels(settings,width,height,alphaOverride){
  if(!this.source)throw new Error('Wait for the source to finish loading.');
  if(width<1||height<1||width>this.maxSize||height>this.maxSize)throw new Error('This export size is not supported by your graphics device.');
  const gl=this.gl;
  if(!this.captureTarget||this.captureTarget.w!==width||this.captureTarget.h!==height){
   if(this.captureTarget){gl.deleteTexture(this.captureTarget.texture);gl.deleteFramebuffer(this.captureTarget.framebuffer);this.captureTarget=null;}
   const texture=gl.createTexture(),framebuffer=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.deleteTexture(texture);gl.deleteFramebuffer(framebuffer);throw new Error('The export buffer could not be created. Try a smaller image.');}
   this.captureTarget={texture,framebuffer,w:width,h:height};
  }
  try{
   if(settings.renderMode==='optical')this.renderOptical(settings,this.captureTarget,width,height,alphaOverride);else{this.prepareBloom(settings);this.preparePalette(settings);this.draw('display',this.captureTarget,this.displayValues(settings,alphaOverride));}
   const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   if(gl.getError()!==gl.NO_ERROR)throw new Error('The image could not be read from the graphics buffer. Try a smaller export size.');
   return {pixels:flipPixelRows(pixels,width,height),width,height};
  }finally{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);}
 }
 stir(x,y,vx,vy){this.pointer=[x,y,Math.max(-2,Math.min(2,vx)),Math.max(-2,Math.min(2,vy))];this.pointerUntil=performance.now()+130;}
}
