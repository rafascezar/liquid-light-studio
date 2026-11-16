export function blobDataURL(blob,Reader=globalThis.FileReader){
 return new Promise((resolve,reject)=>{const reader=new Reader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('The download could not be prepared. Render the image again.'));reader.readAsDataURL(blob);});
}
export function requestDownload(url,name,doc=document){
 const link=doc.createElement('a');link.href=url;link.download=name;link.target='_blank';link.rel='noopener';doc.body.append(link);link.click();setTimeout(()=>link.remove(),30000);
}
// Called directly by a click. Open the picker before any asynchronous work.
export async function saveFile(blob,name,downloadURL,runtime=globalThis){
 if(!blob?.size)throw new Error('Render the file before saving it.');
 if(typeof runtime.showSaveFilePicker==='function'){
  const extension='.'+name.split('.').at(-1),mime=blob.type.split(';')[0]||'application/octet-stream';
  let handle;
  try{handle=await runtime.showSaveFilePicker({suggestedName:name,types:[{description:extension.slice(1).toUpperCase()+' file',accept:{[mime]:[extension]}}]});}
  catch(error){
   if(error.name==='AbortError')return {method:'cancelled'};
   if(['SecurityError','NotAllowedError','NotSupportedError'].includes(error.name))return {method:'blocked'};
   throw error;
  }
  const writable=await handle.createWritable();
  try{await writable.write(blob);await writable.close();}catch(error){try{await writable.abort();}catch{}throw error;}
  return {method:'saved',name:handle.name||name};
 }
 requestDownload(downloadURL,name,runtime.document);return {method:'download'};
}
