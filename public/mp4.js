// Single-track ISO BMFF / AVC container. Encoded samples stay in decode order;
// signed composition offsets preserve presentation order when an encoder uses B-frames.
const text=value=>new TextEncoder().encode(value),zero=n=>new Uint8Array(n);
function join(...parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;}
function u16(...values){const out=new Uint8Array(values.length*2),v=new DataView(out.buffer);values.forEach((x,i)=>v.setUint16(i*2,x));return out;}
function u32(...values){const out=new Uint8Array(values.length*4),v=new DataView(out.buffer);values.forEach((x,i)=>v.setUint32(i*4,x>>>0));return out;}
const box=(name,...parts)=>join(u32(8+parts.reduce((n,p)=>n+p.length,0)),text(name),...parts);
const full=(name,version,flags,...parts)=>box(name,new Uint8Array([version,(flags>>16)&255,(flags>>8)&255,flags&255]),...parts);
const matrix=u32(65536,0,0,0,65536,0,0,0,0x40000000);
function runs(values){const result=[];for(const value of values){const last=result.at(-1);if(last&&last[1]===value)last[0]++;else result.push([1,value]);}return result;}
function colourBox(colour){
 if(!colour)return zero(0);
 const primaries={bt709:1,bt470bg:5,smpte170m:6,bt2020:9},transfer={bt709:1,smpte170m:6,'iec61966-2-1':13,'smpte2084':16,'arib-std-b67':18},matrices={rgb:0,bt709:1,bt470bg:5,smpte170m:6,'bt2020-ncl':9};
 return box('colr',text('nclx'),u16(primaries[colour.primaries]??1,transfer[colour.transfer]??1,matrices[colour.matrix]??1),new Uint8Array([colour.fullRange?128:0]));
}
export function createMp4({width,height,fps,samples,description,colourSpace}){
 if(!samples.length||samples[0].type!=='key')throw new Error('The video encoder did not return an initial keyframe.');
 const avcc=description instanceof Uint8Array?description:new Uint8Array(description||0);
 if(avcc.length<7||avcc[0]!==1)throw new Error('The encoder did not return an MP4 decoder configuration.');
 const scale=fps*1000,duration=samples.length*1000,offsets=samples.map((sample,index)=>Math.round(sample.timestamp*scale/1e6)-index*1000);
 const composition=runs(offsets),keys=samples.flatMap((sample,index)=>sample.type==='key'?[index+1]:[]);
 const compressor=zero(32),label=text('Liquid Light Studio');compressor[0]=label.length;compressor.set(label,1);
 const entry=box('avc1',zero(6),u16(1),zero(16),u16(width,height),u32(72*65536,72*65536,0),u16(1),compressor,u16(24,65535),box('avcC',avcc),colourBox(colourSpace));
 const ftyp=box('ftyp',text('isom'),u32(512),text('isomiso2avc1mp41'));
 function movie(offset){
  const stbl=box('stbl',full('stsd',0,0,u32(1),entry),full('stts',0,0,u32(1,samples.length,1000)),
   ...(offsets.some(Boolean)?[full('ctts',1,0,u32(composition.length),...composition.map(pair=>u32(...pair)))]:[]),
   full('stss',0,0,u32(keys.length,...keys)),full('stsc',0,0,u32(1,1,samples.length,1)),full('stsz',0,0,u32(0,samples.length,...samples.map(sample=>sample.data.length))),full('stco',0,0,u32(1,offset)));
  const dinf=box('dinf',full('dref',0,0,u32(1),full('url ',0,1)));
  const minf=box('minf',full('vmhd',0,1,u16(0,0,0,0)),dinf,stbl);
  const mdia=box('mdia',full('mdhd',0,0,u32(0,0,scale,duration),u16(0x55c4,0)),full('hdlr',0,0,u32(0),text('vide'),zero(12),text('VideoHandler\0')),minf);
  const trak=box('trak',full('tkhd',0,7,u32(0,0,1,0,duration),zero(8),u16(0,0,0,0),matrix,u32(width*65536,height*65536)),mdia);
  return box('moov',full('mvhd',0,0,u32(0,0,scale,duration,65536),u16(256,0),zero(8),matrix,zero(24),u32(2)),trak);
 }
 const preliminary=movie(0),moov=movie(ftyp.length+preliminary.length+8),size=samples.reduce((n,sample)=>n+sample.data.length,0);
 if(size>0xffffffff-8)throw new Error('The MP4 is too large. Shorten the animation.');
 return new Blob([ftyp,moov,u32(size+8),text('mdat'),...samples.map(sample=>sample.data)],{type:'video/mp4'});
}
