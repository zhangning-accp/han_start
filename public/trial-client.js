import {VERSION} from './content.js';
import {productEvents} from './telemetry.js';
export function createUsageClock(start=Date.now()){
 let last=start,until=start,visible=true,focused=true;
 return {sample(now,next){
  const end=Math.min(now,until),spans=visible&&focused&&now>=last&&now-last<=30000&&end>last?[{start:last,end}]:[];
  if(now<last)until=now;last=now;visible=next.visible;focused=next.focused;
  if(next.interaction&&visible&&focused)until=now+60000;
  return spans;
 }};
}
export function createContextClock(start,context){
 const clock=createUsageClock(start);let previous={...context};
 return {sample(now,next,current){const spans=clock.sample(now,next).map(span=>({...span,...previous}));previous={...current};return spans;}};
}
export function createTrialClient({getState,getIdentity,api,getArea=()=> 'unattributed'}){
 const context=()=>{const s=getState();return {country:getIdentity()?.country||'UNKNOWN',area:getArea(),scene:s.onboarding?.chapter==='village'?'village:'+s.onboarding.step:'market:'+s.step,mode:s.onboarding?.mode||'starter',language:s.language||'en',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',device:matchMedia('(max-width: 700px)').matches?'mobile':'desktop'};};
 let clock=createContextClock(Date.now(),context()),session=crypto.randomUUID(),lastInteraction=Date.now(),sending=false,stopped=false,lastArea=null;
 const owner=getState().id,storageKey='han-trial-queue-'+owner;
 let queue=[];try{queue=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(queue))queue=[];}catch{}
 const enabled=()=>!stopped&&getState().id===owner&&getIdentity()?.analytics===true;
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(queue.slice(-400)));}catch{}};
 function enqueue(type,extra={}){
  if(!enabled())return;
  queue.push({id:crypto.randomUUID(),type,at:new Date().toISOString(),sessionId:session,version:VERSION,...context(),...extra});
  queue=queue.slice(-400);persist();
 }
 function sample(interaction=false){
  const now=Date.now();
  if(interaction&&now-lastInteraction>1800000)session=crypto.randomUUID();
  if(interaction)lastInteraction=now;
  const spans=clock.sample(now,{visible:document.visibilityState==='visible',focused:document.hasFocus(),interaction},context());
  if(enabled())for(const span of spans)enqueue('duration',{...span,at:new Date(span.end).toISOString()});
 }
 async function flush(){
  if(sending||!enabled())return;
  queue=queue.filter(e=>Date.parse(e.at)>Date.now()-7*86400000);if(!queue.length)return;
  const batch=queue.slice(0,40);sending=true;
  try{await api('trial/events','POST',{events:batch},true);const ids=new Set(batch.map(e=>e.id));queue=queue.filter(e=>!ids.has(e.id));persist();}catch{/* Retry the same event IDs on the next tick. */}finally{sending=false;}
 }
 const interact=e=>{if(e.isTrusted)sample(true);};
 const visibility=()=>{sample();void flush();};
 for(const name of ['pointerdown','keydown'])document.addEventListener(name,interact,{passive:true});
 document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',visibility);window.addEventListener('focus',visibility);window.addEventListener('pagehide',visibility);
 const timer=setInterval(()=>{sample();void flush();},15000);
 function changed(){
  clock=createContextClock(Date.now(),context());lastArea=null;
  if(!enabled()){queue=[];persist();return;}
  enqueue('visit');if(getState().onboarding?.chapter==='village')enqueue('village_step');contextChanged();void flush();
 }
 function contextChanged(){sample();const area=getArea();if(area!==lastArea){if(area!=='unattributed')enqueue('feature',{feature:'view_'+area});lastArea=area;}void flush();}
 function record(type,taskId,result,extra){
  if(!enabled())return;
  sample(true);for(const event of productEvents(type,taskId,result,extra)){const {type:kind,...details}=event;enqueue(kind,details);}
  void flush();
 }
 function dispose(){stopped=true;clearInterval(timer);for(const name of ['pointerdown','keydown'])document.removeEventListener(name,interact);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',visibility);window.removeEventListener('focus',visibility);window.removeEventListener('pagehide',visibility);queue=[];try{localStorage.removeItem(storageKey);}catch{}}
 changed();return {record,changed,flush,dispose,contextChanged};
}
