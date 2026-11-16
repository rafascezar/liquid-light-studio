import {env} from 'cloudflare:workers';
import {sessions} from '../../../../server/sessions.js';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return sessions(request,env.BUCKET,(await params).id);}
