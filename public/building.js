export const GRID = {columns:5, rows:4, maxItems:8};
export const components = {
 table:{zh:'桌子',en:'Table',symbol:'▰',width:2,height:1,limit:2},
 sign:{zh:'招牌',en:'Sign',symbol:'牌',width:1,height:1,limit:2},
 lamp:{zh:'灯',en:'Lantern',symbol:'◉',width:1,height:1,limit:2},
 plant:{zh:'植物',en:'Plant',symbol:'♣',width:1,height:1,limit:3}
};
export function cells(item){
 const c=components[item.type];if(!c)return [];
 const w=item.rotation===90?c.height:c.width,h=item.rotation===90?c.width:c.height;
 return Array.from({length:w*h},(_,i)=>({x:item.x+i%w,y:item.y+Math.floor(i/w)}));
}
export function validateLayout(layout,{complete=false}={}){
 if(!layout||typeof layout.name!=='string'||!layout.name.trim()||layout.name.length>32||!Array.isArray(layout.items)||layout.items.length>GRID.maxItems)throw Error('invalid_layout');
 const occupied=new Set(),ids=new Set(),counts={};
 for(const item of layout.items){
  if(!item||!components[item.type]||typeof item.id!=='string'||!/^[\w-]{1,50}$/.test(item.id)||ids.has(item.id)||![0,90].includes(item.rotation)||!Number.isInteger(item.x)||!Number.isInteger(item.y)||typeof item.text!=='string'||item.text.length>24)throw Error('invalid_component');
  ids.add(item.id);counts[item.type]=(counts[item.type]||0)+1;
  if(counts[item.type]>components[item.type].limit)throw Error('component_limit');
  for(const {x,y} of cells(item)){
   if(x<0||y<0||x>=GRID.columns||y>=GRID.rows)throw Error('out_of_bounds');
   const key=`${x},${y}`;if(occupied.has(key))throw Error('collision');occupied.add(key);
  }
 }
 if(complete&&(!counts.table||!counts.sign||!(counts.plant||counts.lamp)))throw Error('missing_components');
 return {name:layout.name.trim(),items:layout.items.map(({id,type,x,y,rotation,text})=>({id,type,x,y,rotation,text}))};
}
export function occupant(layout,x,y){return layout.items.find(item=>cells(item).some(c=>c.x===x&&c.y===y));}
export function reviseLayout(layout,action){
 const next=structuredClone(layout);
 if(action.type==='place')next.items.push(action.item);
 else if(action.type==='remove')next.items=next.items.filter(i=>i.id!==action.id);
 else if(action.type==='update'){
  const item=next.items.find(i=>i.id===action.id);if(!item)throw Error('invalid_component');
  for(const key of ['x','y','rotation','text'])if(action[key]!==undefined)item[key]=action[key];
 }else if(action.type==='name')next.name=action.name;
 else throw Error('invalid_component');
 return validateLayout(next);
}
