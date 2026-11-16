import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {organizePanel} from '../public/organize-panel.js';
// Minimal DOM contract for checking the panel migration without a browser.
class Element{
 constructor(tag,attrs={}){this.tagName=tag;this.attrs=attrs;this.children=[];this.parentElement=null;this.dataset=new Proxy({},{get:(_,k)=>this.attrs['data-'+k],set:(_,k,v)=>(this.attrs['data-'+k]=v,true)});}
 get id(){return this.attrs.id}set id(v){this.attrs.id=v}get className(){return this.attrs.class||''}set className(v){this.attrs.class=v}
 get firstChild(){return this.children[0]||null}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(v=>v!==this);this.parentElement=null;}
 append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n);}}
 prepend(...nodes){for(const n of nodes.reverse()){n.remove();n.parentElement=this;this.children.unshift(n);}}
 removeAttribute(k){delete this.attrs[k]}
 matches(q){return q[0]==='#'?this.id===q.slice(1):q[0]==='.'?this.className.split(' ').includes(q.slice(1)):this.tagName===q;}
 querySelectorAll(q){if(q.includes('>')){const [a,b]=q.split('>');return this.querySelectorAll(a).flatMap(n=>n.children.filter(c=>c.matches(b)));}return this.children.flatMap(n=>[...(n.matches(q)?[n]:[]),...n.querySelectorAll(q)]);}
 querySelector(q){return this.querySelectorAll(q)[0]||null}
 closest(q){return this.matches(q)?this:this.parentElement?.closest(q)||null}
 set innerHTML(html){this.children=[];const root=parse(html);this.append(...root.children.slice());}
 insertAdjacentHTML(where,html){assert.equal(where,'afterbegin');this.prepend(...parse(html).children.slice());}
}
function parse(html){const root=new Element('root'),stack=[root],voids=new Set(['input','img','link','meta','br','hr']);
 for(const token of html.match(/<(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+/g)||[]){
  if(!token.startsWith('<')||token.startsWith('<!'))continue;
  if(token.startsWith('</')){const name=token.match(/^<\/([^\s>]+)/)?.[1];while(stack.length>1){const top=stack.pop();if(top.tagName===name)break;}continue;}
  const name=token.match(/^<([^\s/>]+)/)?.[1];if(!name)continue;const attrs={};for(const m of token.matchAll(/([\w-]+)="([^"]*)"/g))attrs[m[1]]=m[2];
  const node=new Element(name,attrs);stack.at(-1).append(node);if(!voids.has(name)&&!token.endsWith('/>'))stack.push(node);
 }return root;
}
test('panel reorganization produces the planned section order and keeps all controls once',()=>{
 const root=parse(readFileSync(new URL('../public/studio.html',import.meta.url),'utf8'));
 globalThis.document={getElementById:id=>root.querySelector('#'+id),querySelector:q=>root.querySelector(q),createElement:t=>new Element(t)};
 try{
  organizePanel();const panel=root.querySelector('.panel'),sections=panel.children.filter(n=>n.tagName==='details');
  assert.deepEqual(sections.filter(s=>s.id).map(s=>s.id),['shapeSection','colourSection','copiesSection','deformationSection','opticalAnimationSection','motionSection','fluidLightSection','materialSection','finishSection']);
  const ids=[];const visit=n=>{if(n.id)ids.push(n.id);n.children.forEach(visit)};visit(root);assert.equal(ids.length,new Set(ids).size);
  for(const id of ['trimEnabled','trimOptions','trimControls','trimAnimate','trimReveal','trimRevealControls','tipMode','tipOptions','tipControls','copyControls','innerControls','deformControls','materialControls','pulseEnabled','gradientTarget','blendMode','deformType','opticalControls'])assert.ok(root.querySelector('#'+id),id);
  assert.equal(root.querySelector('#quality').closest('details').id,'finishSection');assert.equal(root.querySelector('#opticalCollision').closest('details').id,'deformationSection');
 }finally{delete globalThis.document;}
});
