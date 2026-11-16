// Settings snapshots: callers commit once per gesture, never per rendered frame.
export function createHistory(initial,limit=80){
 let states=[JSON.stringify(initial)],index=0;
 function record(value){const next=JSON.stringify(value);if(next===states[index])return;states.splice(index+1);states.push(next);if(states.length>limit)states.shift();index=states.length-1;}
 return {record,undo(current){record(current);if(index===0)return null;return JSON.parse(states[--index]);},redo(){if(index===states.length-1)return null;return JSON.parse(states[++index]);}};
}
