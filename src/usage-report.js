import {usageAreas} from '../public/telemetry.js';
const seconds=spans=>spans.reduce((n,x)=>n+(x.end-x.start)/1000,0);
const countUsers=items=>new Set(items.map(x=>x.userId)).size;
// Attribute an overlapping instant once per account, to the earliest-starting interval.
function attributedIntervals(events,start,end){
 const result=[],ends=new Map();
 const sorted=events.filter(e=>e.type==='duration'&&e.start<end&&e.end>start).slice().sort((a,b)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id));
 for(const e of sorted){const left=Math.max(start,e.start,ends.get(e.userId)??start),right=Math.min(end,e.end);if(right<=left)continue;result.push({...e,area:e.area||'unattributed',start:left,end:right});ends.set(e.userId,right);}
 return result;
}
function totals(events,spans){
 return Object.entries(usageAreas).map(([area,label])=>{
  const es=events.filter(e=>(e.area||'unattributed')===area),ss=spans.filter(e=>e.area===area);
  const users=countUsers([...es,...ss]),activeSeconds=seconds(ss),byUser=[...new Set([...es,...ss].map(e=>e.userId))].map(id=>seconds(ss.filter(e=>e.userId===id))).sort((a,b)=>a-b),m=Math.floor(byUser.length/2);
  return {area,label,users,visits:es.filter(e=>e.type==='feature'&&e.feature==='view_'+area).length,activeSeconds,averageSeconds:users?activeSeconds/users:null,medianSeconds:users?(users%2?byUser[m]:(byUser[m-1]+byUser[m])/2):null};
 });
}
function hours(spans){
 const bins=new Map();
 for(const span of spans){for(let pos=span.start;pos<span.end;){
  const stop=Math.min(span.end,Math.floor(pos/60000)*60000+60000);
  let weekday='Unknown',hour=null;
  if(span.timezone){const parts=new Intl.DateTimeFormat('en-US',{timeZone:span.timezone,weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(pos);weekday=parts.find(p=>p.type==='weekday').value;hour=Number(parts.find(p=>p.type==='hour').value);}
  const key=[span.area,span.country,weekday,hour].join(':');
  if(!bins.has(key))bins.set(key,{area:span.area,country:span.country,weekday,hour,activeSeconds:0,users:new Set()});
  const b=bins.get(key);b.activeSeconds+=(stop-pos)/1000;b.users.add(span.userId);pos=stop;
 }}
 return [...bins.values()].map(({users,...b})=>({...b,users:users.size})).sort((a,b)=>b.activeSeconds-a.activeSeconds);
}
export function usageReport(events,visitors,start,end){
 const within=events.filter(e=>Date.parse(e.at)>=start&&Date.parse(e.at)<end),spans=attributedIntervals(events,start,end);
 const users=[...new Set([...within,...spans].map(e=>e.userId))];
 const visitorUsage=users.map(id=>{
  const es=within.filter(e=>e.userId===id),ss=spans.filter(e=>e.userId===id),p=visitors.find(v=>v.id===id),ordered=es.slice().sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  return {id,countries:[...new Set([...es,...ss].map(e=>e.country))],language:p?.language||'',activeSeconds:seconds(ss),events:es.filter(e=>e.type!=='duration').length,firstAt:ordered[0]?.at??new Date(ss[0].start).toISOString(),lastAt:ordered.at(-1)?.at??new Date(ss.at(-1).end).toISOString(),lastScene:ordered.at(-1)?.scene||'',modules:totals(es,ss),hours:hours(ss)};
 }).sort((a,b)=>b.activeSeconds-a.activeSeconds||a.id.localeCompare(b.id));
 const learningGroups=new Map();
 for(const e of within.filter(e=>e.type==='learning')){
  const key=e.taskId+':'+e.assistance;if(!learningGroups.has(key))learningGroups.set(key,{taskId:e.taskId,assistance:e.assistance,attempts:0,successes:0,retries:0,firstAttempts:0,firstSuccesses:0,users:new Set()});
  const row=learningGroups.get(key);row.attempts++;row.users.add(e.userId);if(e.outcome==='success')row.successes++;else row.retries++;if(e.attempt===1){row.firstAttempts++;if(e.outcome==='success')row.firstSuccesses++;}
 }
 const failures=[...new Set(within.filter(e=>e.type==='failure').map(e=>e.operation))].map(operation=>{const es=within.filter(e=>e.type==='failure'&&e.operation===operation);return {operation,uses:es.length,users:countUsers(es)};});
 return {modules:totals(within,spans),moduleCountries:[...new Set([...within,...spans].map(e=>e.country))].flatMap(country=>totals(within.filter(e=>e.country===country),spans.filter(e=>e.country===country)).filter(r=>r.users).map(r=>({country,...r}))),moduleHours:hours(spans),visitorUsage,learning:[...learningGroups.values()].map(({users,...r})=>({...r,users:users.size})),failures};
}
