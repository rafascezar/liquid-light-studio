import {env} from 'cloudflare:workers';
import {sessions} from '../../../server/sessions.js';
export const dynamic='force-dynamic';
export function GET(request:Request){return sessions(request,env.BUCKET);}
export function POST(request:Request){return sessions(request,env.BUCKET);}
