export function setupLookPicker(presets){
 const $=id=>document.getElementById(id),root=$('lookPicker'),select=$('preset'),trigger=$('lookTrigger'),menu=$('lookMenu');
 const options=[...select.options],buttons=[];let currentGroup='',active=0;
 const gradient=value=>`linear-gradient(90deg,${presets[value].stops.map(([colour,position])=>`${colour} ${position*100}%`).join(',')})`;
 function close(focus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}
 function open(){menu.hidden=false;trigger.setAttribute('aria-expanded','true');active=Math.max(0,options.findIndex(option=>option.value===select.value));buttons[active]?.focus();}
 function sync(value=select.value){
  const index=options.findIndex(option=>option.value===value),option=options[index];if(!option)return;
  $('lookLabel').textContent=option.label;$('lookSwatch').style.background=gradient(value);
  buttons.forEach((button,i)=>button.setAttribute('aria-selected',String(i===index)));
 }
 for(const [index,option]of options.entries()){
  const group=option.parentElement.label||'Looks';
  if(group!==currentGroup){const heading=document.createElement('div');heading.className='look-group-label';heading.textContent=group;heading.setAttribute('role','presentation');menu.append(heading);currentGroup=group;}
  const button=document.createElement('button');button.type='button';button.className='look-option';button.setAttribute('role','option');button.tabIndex=-1;
  const swatch=document.createElement('span');swatch.className='look-swatch';swatch.style.background=gradient(option.value);swatch.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='look-name';label.textContent=option.label;button.append(swatch,label);
  if(option.value.startsWith('ps-')&&presets[option.value].gradientType==='angular'){const tag=document.createElement('span');tag.className='look-ratio';tag.textContent='80 / 20';button.append(tag);}
  button.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close(true);});
  button.addEventListener('focus',()=>active=index);menu.append(button);buttons.push(button);
 }
 trigger.addEventListener('click',()=>menu.hidden?open():close());
 trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open();}});
 menu.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
  if(event.key==='Tab'){close();return;}
  let next=active;if(event.key==='ArrowDown')next=(active+1)%buttons.length;else if(event.key==='ArrowUp')next=(active-1+buttons.length)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;
  event.preventDefault();buttons[next].focus();buttons[next].scrollIntoView({block:'nearest'});
 });
 document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close();});
 root.classList.add('enhanced');trigger.hidden=false;sync();return {sync,close};
}
