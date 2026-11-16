const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function sessions(request,bucket,id){
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'Sign in with ChatGPT to use your cloud sessions.'},401);
 if(!bucket)return json({error:'Cloud storage is temporarily unavailable.'},503);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user));
 const prefix='sessions/'+Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')+'/';
 const thumbnailPrefix=prefix.replace('sessions/','session-previews/');
 if(id&&!/^[0-9a-f-]{36}$/.test(id))return json({error:'Invalid session.'},400);
 try{
  if(request.method==='GET'&&id&&new URL(request.url).searchParams.has('thumbnail')){const obj=await bucket.get(thumbnailPrefix+id+'.image');return obj?new Response(obj.body,{headers:{'Content-Type':obj.customMetadata?.contentType||'image/webp','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}}):json({error:'Preview not found.'},404);}
  if(request.method==='GET'&&id){const obj=await bucket.get(prefix+id+'.json');return obj?json(JSON.parse(await obj.text())):json({error:'Session not found.'},404);}
  if(request.method==='GET'){
   const url=new URL(request.url),cursor=url.searchParams.get('cursor')||undefined;
   const result=await bucket.list({prefix,include:['customMetadata'],limit:100,cursor});
   return json({sessions:result.objects.filter(o=>o.key.endsWith('.json')).map(o=>({id:o.key.slice(prefix.length,-5),name:o.customMetadata?.name||'Untitled session',savedAt:o.customMetadata?.savedAt||o.uploaded?.toISOString(),thumbnail:o.customMetadata?.thumbnail==='true'})),cursor:result.truncated?result.cursor:null});
  }
  if(request.method==='POST'&&!id){
   if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
   const raw=await request.text();if(raw.length>2200000)return json({error:'Session is too large (2 MB maximum).'},413);
   let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid session data.'},400);}
   if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100||body.project?.format!=='liquid-light-studio'||body.project?.version!==1||!body.project?.settings||typeof body.project.settings!=='object')return json({error:'Name and valid project settings are required.'},400);
   let preview=null;
   if(body.thumbnail!==undefined){
    const match=typeof body.thumbnail==='string'&&body.thumbnail.match(/^data:image\/(webp|png);base64,([A-Za-z0-9+/]+={0,2})$/);
    if(!match||match[2].length>250000)return json({error:'Invalid session preview.'},400);
    try{preview={type:'image/'+match[1],bytes:Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0))};}catch{return json({error:'Invalid session preview.'},400);}
   }
   const session={id:crypto.randomUUID(),name:body.name.trim(),savedAt:new Date().toISOString(),project:body.project};
   if(preview)await bucket.put(thumbnailPrefix+session.id+'.image',preview.bytes,{httpMetadata:{contentType:preview.type},customMetadata:{contentType:preview.type}});
   await bucket.put(prefix+session.id+'.json',JSON.stringify(session),{httpMetadata:{contentType:'application/json'},customMetadata:{name:session.name,savedAt:session.savedAt,thumbnail:String(!!preview)}});
   return json({id:session.id,name:session.name,savedAt:session.savedAt},201);
  }
  return json({error:'Method not allowed.'},405);
 }catch{return json({error:'Cloud storage could not complete this request. Please try again.'},503);}
}
