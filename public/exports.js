import {createMp4} from './mp4.js?v=export-fix-5';

export const yieldFrame=(milliseconds=0)=>new Promise(resolve=>setTimeout(resolve,milliseconds));
export function exportDimensions(aspect,longest,maxSize=4096){
 const [x,y]=aspect.split(':').map(Number),r=x/y,side=Math.min(longest,maxSize);
 if(!Number.isFinite(r)||r<=0||!Number.isFinite(side)||side<=0)throw new Error('Choose valid export dimensions.');
 return {width:Math.max(1,Math.round(r>=1?side:side*r)),height:Math.max(1,Math.round(r>=1?side/r:side))};
}
export function pngFromPixels(frame,canvas=document.createElement('canvas')){
 canvas.width=frame.width;canvas.height=frame.height;const context=canvas.getContext('2d',{alpha:true});
 if(!context)throw new Error('The image encoder is unavailable in this browser.');
 context.putImageData(new ImageData(frame.pixels,frame.width,frame.height),0,0);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed. Try a smaller image.')),'image/png'));
}
const crcTable=new Uint32Array(256);
for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[i]=c>>>0;}
export function crc32(bytes){let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export async function makeZip(files,onProgress=()=>{},cancelled=()=>false){
 if(files.length>65535)throw new Error('Too many files for this archive.');
 const encoder=new TextEncoder(),local=[],central=[];let offset=0,centralSize=0;
 const date=new Date(),dosTime=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1),dosDate=((Math.max(1980,date.getFullYear())-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
 for(let index=0;index<files.length;index++){
  if(cancelled())throw new DOMException('Export cancelled.','AbortError');
  const file=files[index],name=encoder.encode(file.name),bytes=new Uint8Array(await file.blob.arrayBuffer()),crc=crc32(bytes);
  if(offset+bytes.length+name.length+30>0xffffffff)throw new Error('The sequence is too large. Reduce its resolution or duration.');
  const head=new Uint8Array(30),v=new DataView(head.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(10,dosTime,true);v.setUint16(12,dosDate,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,name.length,true);
  local.push(head,name,bytes);
  const entry=new Uint8Array(46),c=new DataView(entry.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,dosTime,true);c.setUint16(14,dosDate,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
  central.push(entry,name);centralSize+=entry.length+name.length;offset+=head.length+name.length+bytes.length;
  onProgress((index+1)/files.length);if(index%5===0)await yieldFrame();
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 return new Blob([...local,...central,end],{type:'application/zip'});
}
export function advanceFrame(engine,settings,fps){const steps=Math.ceil((1/fps)/.025),dt=1/fps/steps;for(let i=0;i<steps;i++)engine.step(settings,dt);}
export function videoFormat(runtime=globalThis){
 const Recorder=runtime.MediaRecorder;if(!Recorder||typeof Recorder.isTypeSupported!=='function')return null;
 for(const type of ['video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'])if(Recorder.isTypeSupported(type))return {mime:type,extension:type.startsWith('video/mp4')?'mp4':'webm'};
 return null;
}
export const canEncodeFrames=(runtime=globalThis)=>typeof runtime.VideoEncoder==='function'&&typeof runtime.VideoFrame==='function';
export function videoQuality(options){
 const quality=options.quality||'high',density=quality==='maximum'?1:quality==='preview'?0.18:0.55;
 return {quality,quantizer:quality==='maximum'?12:quality==='preview'?25:18,bitrate:Math.round(Math.min(240000000,Math.max(12000000,options.width*options.height*options.fps*density)))};
}
export async function mp4Configuration(options,runtime=globalThis){
 if(!canEncodeFrames(runtime))return null;
 const {bitrate}=videoQuality(options),large=Math.max(options.width,options.height)>1920,level=large?(options.fps>30?'34':'33'):'2a';
 for(const bitrateMode of ['quantizer','variable'])for(const profile of ['6400','4d00','4200']){
  const config={codec:`avc1.${profile}${level}`,width:options.width,height:options.height,framerate:options.fps,bitrate,bitrateMode,latencyMode:'quality',avc:{format:'avc'}};
  try{const result=await runtime.VideoEncoder.isConfigSupported(config);if(result.supported&&(bitrateMode!=='quantizer'||result.config?.bitrateMode==='quantizer'))return {...config,...result.config};}catch{}
 }
 return null;
}
export function validateAnimation(options){
 const fps=Number(options.fps),duration=Number(options.duration),frames=Math.round(fps*duration);
 if(![24,30,60].includes(fps)||!Number.isFinite(duration)||duration<1||duration>30)throw new Error('Choose a duration from 1 to 30 seconds and a supported frame rate.');
 if(options.format==='sequence'){
  const limit=Math.max(options.width,options.height)>1920?120:480;
  if(frames>limit)throw new Error(`At this resolution, use ${limit} frames or fewer. Shorten the duration or lower the frame rate.`);
 }return {fps,duration,frames};
}
export async function renderSequence(engine,settings,options,onProgress=()=>{},cancelled=()=>false){
 const {fps,frames}=validateAnimation({...options,format:'sequence'}),files=[],canvas=document.createElement('canvas'),startTime=engine.time;
 engine.pointerUntil=0;
 for(let index=0;index<frames;index++){
  if(cancelled())throw new DOMException('Export cancelled.','AbortError');
  if(index)advanceFrame(engine,settings,fps);
  const frame=engine.capturePixels(settings,options.width,options.height,options.transparent?0:settings.bgAlpha),blob=await pngFromPixels(frame,canvas);
  files.push({name:`frames/light_${String(index).padStart(5,'0')}.png`,blob});onProgress((index+1)/frames*.85,`Rendering frame ${index+1} of ${frames}`);await yieldFrame();
 }
 const backgroundAlpha=options.transparent?0:settings.bgAlpha;
 const manifest={format:'liquid-light-sequence',version:1,width:options.width,height:options.height,fps,frameCount:frames,duration:frames/fps,startTime,transparent:backgroundAlpha<1,backgroundAlpha,settings};
 files.push({name:'project.json',blob:new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'})});
 files.push({name:'README.txt',blob:new Blob([`Liquid Light Studio\n\n${frames} frames at ${fps} fps. ${options.width} x ${options.height}.\n\nImport frames/light_00000.png as a PNG image sequence. Set the interpretation to ${fps} fps in your animation or editing software.\n${backgroundAlpha<1?'RGBA transparency is included.':'The chosen background is included.'}\n`],{type:'text/plain'})});
 const blob=await makeZip(files,p=>onProgress(.85+p*.15,'Packing the PNG sequence'),cancelled);return {blob,extension:'zip',frames,fps,duration:frames/fps};
}
export async function recordVideo(engine,settings,options,onProgress=()=>{},cancelled=()=>false){
 const {fps,duration,frames}=validateAnimation({...options,format:'video'}),format=videoFormat();
 if(!format)throw new Error('Video recording is unavailable here. Choose PNG sequence instead.');
 const canvas=document.createElement('canvas');canvas.width=options.width;canvas.height=options.height;
 if(typeof canvas.captureStream!=='function')throw new Error('Video recording is unavailable here. Choose PNG sequence instead.');
 const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('Video canvas creation failed.');
 let stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];
 if(typeof track?.requestFrame!=='function'){stream.getTracks().forEach(t=>t.stop());stream=canvas.captureStream(fps);track=stream.getVideoTracks()[0];}
 const chunks=[];let recorder,error,resolveEnd;const ended=new Promise(resolve=>resolveEnd=resolve);
 try{
  if(track)track.contentHint='detail';
  recorder=new MediaRecorder(stream,{mimeType:format.mime,videoBitsPerSecond:videoQuality(options).bitrate});
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};recorder.onerror=event=>{error=event.error||new Error('Video encoding failed. Choose PNG sequence instead.');resolveEnd();};recorder.onstop=()=>resolveEnd();
  const paint=()=>{const frame=engine.capturePixels(settings,options.width,options.height,1);context.putImageData(new ImageData(frame.pixels,frame.width,frame.height),0,0);};
  paint();recorder.start(250);const start=performance.now();engine.pointerUntil=0;
  for(let index=0;index<frames;index++){
   if(cancelled())throw new DOMException('Export cancelled.','AbortError');if(error)throw error;
   if(index){advanceFrame(engine,settings,fps);paint();}track?.requestFrame?.();onProgress((index+1)/frames,`Recording frame ${index+1} of ${frames}`);
   await yieldFrame(Math.max(0,start+(index+1)*1000/fps-performance.now()));
  }
  recorder.stop();await ended;if(error)throw error;
  const mime=recorder.mimeType||format.mime,blob=new Blob(chunks,{type:mime});if(!blob.size)throw new Error('The browser returned an empty video. Choose PNG sequence instead.');
  return {blob,extension:mime.startsWith('video/mp4')?'mp4':'webm',frames,fps,duration:Math.max(duration,(performance.now()-start)/1000),method:'recording'};
 }finally{
  if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch{}}
  stream.getTracks().forEach(t=>t.stop());
 }
}
export async function renderVideo(engine,settings,options,onProgress=()=>{},cancelled=()=>false){
 const {fps,frames}=validateAnimation({...options,format:'video'}),config=await mp4Configuration(options);
 if(!config){onProgress(0,'Using the browser recorder; frame-by-frame MP4 is unavailable on this device.');return recordVideo(engine,settings,options,onProgress,cancelled);}
 const samples=[];let description,colourSpace,error,totalBytes=0,encoder;
 const check=()=>{if(cancelled())throw new DOMException('Export cancelled.','AbortError');if(error)throw error;};
 try{
  encoder=new VideoEncoder({output(chunk,metadata){
   if(error)return;totalBytes+=chunk.byteLength;if(totalBytes>256*1024*1024){error=new Error('The video exceeds 256 MB. Shorten it or choose High compression quality.');return;}
   const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);samples.push({data,timestamp:chunk.timestamp,type:chunk.type});
   if(metadata?.decoderConfig?.description){const raw=metadata.decoderConfig.description;description=new Uint8Array(ArrayBuffer.isView(raw)?raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength):raw.slice(0));colourSpace=metadata.decoderConfig.colorSpace;}
  },error:failure=>{error=failure;}});
  encoder.configure(config);engine.pointerUntil=0;const quality=videoQuality(options);
  for(let index=0;index<frames;index++){
   check();if(index)advanceFrame(engine,settings,fps);
   const pixels=engine.capturePixels(settings,options.width,options.height,1),timestamp=Math.round(index*1e6/fps),duration=Math.round((index+1)*1e6/fps)-timestamp;
   const frame=new VideoFrame(pixels.pixels,{format:'RGBA',codedWidth:options.width,codedHeight:options.height,timestamp,duration,colorSpace:{primaries:'bt709',transfer:'iec61966-2-1',matrix:'rgb',fullRange:true}});
   try{encoder.encode(frame,{keyFrame:index%(fps*2)===0,...(config.bitrateMode==='quantizer'?{avc:{quantizer:quality.quantizer}}:{})});}finally{frame.close();}
   if(encoder.encodeQueueSize>=3)await encoder.flush();
   onProgress((index+1)/frames*.95,`Encoding frame ${index+1} of ${frames} · ${options.width} × ${options.height}`);await yieldFrame();
  }
  await encoder.flush();check();if(samples.length!==frames)throw new Error(`The encoder returned ${samples.length} of ${frames} frames. Try a smaller size or a PNG sequence.`);
  onProgress(.98,'Building the MP4 file…');const blob=createMp4({width:options.width,height:options.height,fps,samples,description,colourSpace});onProgress(1,'MP4 ready.');
  return {blob,extension:'mp4',frames,fps,duration:frames/fps,method:'frame-by-frame',quality:quality.quality};
 }finally{if(encoder&&encoder.state!=='closed')encoder.close();}
}
