import {acquisitionReport} from './acquisition.js';
import {removeSocialUser} from './social.js';
import {countries} from './identity.js';
import {usageAreas,behaviorFeatures,learningActivity,buildingActivity} from '../public/telemetry.js';
import {usageReport} from './usage-report.js';
import {tasks,checks,VERSION} from '../public/content.js';
import {groupAnalytics} from './analytics-identity.js';
const DAY=86400000,uuid=/^[a-f0-9-]{36}$/,languages=['en','zh','vi','id','pt-BR'],modes=['starter','guided','independent'];
const actions=['hello','drink','invite','answer','continue','place','edit','save','greeting_send','greeting_reply','writing'];
const types=['visit','action','village_step','village_complete','market_start','market_complete','help','duration','feature','learning','failure'];
export const feedbackCategories=['confusing','difficult','translation','bug','idea','other'];
export const feedbackStatuses=['new','classified','working','resolved','declined'];
const identity=(s,id)=>s.identities?.find(a=>a.id===id)||s.profiles?.[id];
const date=n=>new Date(n).toISOString().slice(0,10);
const dayStart=n=>Math.floor(n/DAY)*DAY;
const distinct=values=>new Set(values).size;
const active=e=>e.type==='action'||learningActivity(e);
const features=[
 {id:'hello',label:'新手村打招呼',actions:['hello']},
 {id:'drink',label:'新手村选饮料',actions:['drink']},
 {id:'invite',label:'新手村邀请邻居',actions:['invite']},
 {id:'practice',label:'提交中文练习',actions:['answer']},
 {id:'build_edit',label:'编辑布置',actions:['place','edit']},
 {id:'build_save',label:'保存作品',actions:['save']},
 {id:'help',label:'查看学习帮助',type:'help'},
 {id:'market_start',label:'进入夜市章节',type:'market_start'},
 {id:'continue',label:'推进任务',actions:['continue']},
 ...Object.entries(behaviorFeatures).map(([id,label])=>({id,label,feature:id}))
];
function featureUsage(events){
 const participants=new Set();
 const rows=features.map(f=>{
  const uses=events.filter(e=>f.actions?e.type==='action'&&f.actions.includes(e.action):f.feature?e.type==='feature'&&e.feature===f.feature:e.type===f.type);
  const users=new Set(uses.map(e=>e.userId));for(const id of users)participants.add(id);
  return {id:f.id,label:f.label,users:users.size,uses:uses.length,usesPerUser:users.size?uses.length/users.size:null};
 });
 return {visitors:participants.size,rows:rows.map(r=>({...r,reach:participants.size?r.users/participants.size:null})).sort((a,b)=>b.users-a.users||b.uses-a.uses||a.id.localeCompare(b.id))};
}
export function acceptEvents(s,id,events,now=Date.now()){
 const p=identity(s,id);if(!p?.analytics)return {accepted:0};
 if(!Array.isArray(events)||events.length>40)throw Error('invalid_event');
 const clean=events.map(e=>{
  const at=Date.parse(e.at);if(e.version!==undefined&&(typeof e.version!=='string'||!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(e.version)))throw Error('invalid_event');
  if(!uuid.test(e.id)||!uuid.test(e.sessionId)||!types.includes(e.type)||!Number.isFinite(at)||at<now-7*DAY||at>now+300000||!languages.includes(e.language)||!modes.includes(e.mode)||!['mobile','desktop'].includes(e.device)||typeof e.scene!=='string'||!/^[-a-z0-9:]{0,60}$/.test(e.scene))throw Error('invalid_event');
  if(e.type==='action'&&!actions.includes(e.action))throw Error('invalid_event');
  const area=e.area??'unattributed';if(!Object.hasOwn(usageAreas,area))throw Error('invalid_event');
  if(e.country!==undefined&&!countries.includes(e.country))throw Error('invalid_event');
  const detail={area};
  if(e.type==='feature'){if(!Object.hasOwn(behaviorFeatures,e.feature))throw Error('invalid_event');detail.feature=e.feature;}
  if(e.type==='feature'&&(e.feature.startsWith('writing_')||(['audio_listen','audio_slow'].includes(e.feature)&&e.lesson!==undefined))){if(!['hello','tea','water','sit','thanks'].includes(e.lesson))throw Error('invalid_event');detail.lesson=e.lesson;}
  if(e.type==='learning'){
   if(![...tasks,...checks].some(t=>t.id===e.taskId)||!['success','retry'].includes(e.outcome)||!['chips','starter','guided','hint','independent'].includes(e.assistance)||!Number.isInteger(e.attempt)||e.attempt<1||e.attempt>10000)throw Error('invalid_event');
   Object.assign(detail,{taskId:e.taskId,outcome:e.outcome,assistance:e.assistance,attempt:e.attempt});
  }
  if(e.type==='failure'){if(!['build_edit','build_save','answer','contribution','feedback'].includes(e.operation))throw Error('invalid_event');detail.operation=e.operation;}
  let interval={};
  if(e.type==='duration'){
   if(!Number.isFinite(e.start)||!Number.isFinite(e.end)||e.start>=e.end||e.end-e.start>30000||Math.abs(e.end-at)>1000||e.start<now-7*DAY)throw Error('invalid_event');
   interval={start:e.start,end:e.end};
  }
  let timezone=e.timezone;
  try{if(!timezone||typeof timezone!=='string'||timezone.length>80)throw Error();new Intl.DateTimeFormat('en',{timeZone:timezone}).format();}catch{timezone='';}
  return {id:e.id,userId:id,type:e.type,at:new Date(at).toISOString(),receivedAt:new Date(now).toISOString(),sessionId:e.sessionId,scene:e.scene,action:e.type==='action'?e.action:null,mode:e.mode,language:e.language,device:e.device,timezone,country:e.country??p.country,source:p.source||'direct',batch:p.batch||'',version:e.version||'unknown',...interval,...detail};
 });
 s.activity=(s.activity||[]).filter(e=>Date.parse(e.at)>=now-120*DAY);
 const seen=new Set(s.activity.map(e=>e.userId+':'+e.id));let accepted=0;
 for(const e of clean){const key=id+':'+e.id;if(seen.has(key))continue;if(p.analyticsSince&&Date.parse(e.at)<Date.parse(p.analyticsSince))continue;s.activity.push(e);if(e.type==='visit'&&!p.firstSession){p.firstSession=e.sessionId;p.firstObservedAt=e.at;}seen.add(key);accepted++;}
 return {accepted};
}
export function submitFeedback(s,id,b,now=Date.now()){
 let correction;
 if(b.correction!==undefined){
  const c=b.correction;
  if(!c||b.category!=='translation'||typeof c.key!=='string'||!/^[-a-zA-Z0-9_.:]{1,100}$/.test(c.key)||['original','displayed','replacement'].some(k=>typeof c[k]!=='string'||!c[k].trim()||c[k].length>600)||typeof c.reason!=='string'||c.reason.length>300||c.replacement.trim()===c.displayed.trim())throw Error('invalid_feedback');
  correction=Object.fromEntries(['key','original','displayed','replacement','reason'].map(k=>[k,c[k]]));
  correction.replacement=correction.replacement.trim();correction.reason=correction.reason.trim();
 }
 const text=correction?(correction.reason||correction.replacement):b.text;
 if(!uuid.test(b.id)||!feedbackCategories.includes(b.category)||typeof text!=='string'||text.trim().length<(correction?1:3)||text.length>2000||!languages.includes(b.language)||!modes.includes(b.mode)||typeof b.scene!=='string'||b.scene.length>60)throw Error('invalid_feedback');
 s.feedback??=[];const prior=s.feedback.find(f=>f.id===b.id&&f.owner===id);if(prior)return prior;
 if(s.feedback.filter(f=>f.owner===id&&Date.parse(f.createdAt)>now-3600000).length>=10)throw Error('rate_limited');
 const p=identity(s,id),f={id:b.id,owner:id,category:b.category,text:text.trim(),...(correction?{correction}:{}),language:b.language,mode:b.mode,scene:b.scene,country:p?.country||'UNKNOWN',source:p?.source||'direct',version:VERSION,createdAt:new Date(now).toISOString(),status:'new',severity:'normal',revision:1,history:[]};
 s.feedback.push(f);return f;
}
export function reviewFeedback(s,id,b,reviewer,now=Date.now()){
 const f=s.feedback?.find(f=>f.id===id);if(!f)throw Error('not_found');
 if(b.revision!==undefined&&b.revision!==f.revision)throw Error('version_conflict');
 if(!feedbackStatuses.includes(b.status)||!['normal','urgent'].includes(b.severity)||typeof b.note!=='string'||!b.note.trim()||b.note.length>1000)throw Error('invalid_feedback');
 const time=new Date(now).toISOString();f.status=b.status;f.severity=b.severity;f.revision++;
 f.firstReviewedAt??=time;f.resolvedAt=['resolved','declined'].includes(b.status)?time:null;
 f.history.push({status:b.status,severity:b.severity,note:b.note.trim(),reviewer,time});return f;
}
export function removeTrialUser(s,id){
 removeSocialUser(s,id);
 s.identities=(s.identities||[]).filter(a=>a.id!==id);
 s.activity=(s.activity||[]).filter(e=>e.userId!==id);s.feedback=(s.feedback||[]).filter(e=>e.owner!==id);
 if(s.profiles)delete s.profiles[id];
}
// Merge intervals per user before summing: multiple tabs/devices cannot inflate time.
export function mergedIntervals(events,from,to){
 const byUser=new Map();
 for(const e of events){if(e.type!=='duration')continue;const start=Math.max(from,e.start),end=Math.min(to,e.end);if(start>=end)continue;
  if(!byUser.has(e.userId))byUser.set(e.userId,[]);byUser.get(e.userId).push({start,end,timezone:e.timezone});
 }
 const result=[];
 for(const [userId,list] of byUser){list.sort((a,b)=>a.start-b.start||a.end-b.end);let last;
  for(const span of list){if(last&&span.start<=last.end)last.end=Math.max(last.end,span.end);else{last={userId,...span};result.push(last);}}
 }
 return result;
}
const seconds=spans=>spans.reduce((n,x)=>n+(x.end-x.start)/1000,0);
const median=nums=>{if(!nums.length)return null;nums.sort((a,b)=>a-b);const m=Math.floor(nums.length/2);return nums.length%2?nums[m]:(nums[m-1]+nums[m])/2;};
function retention(accounts,events,now,kind='all'){
 const result={};
 for(const n of [1,7,30]){let eligible=0,returned=0,pending=0;
  for(const a of accounts){const start=dayStart(Date.parse(a.cohortAt||a.createdAt))+n*DAY;
   if(now<start+DAY){pending++;continue;}eligible++;
   const dayEvents=events.filter(e=>e.userId===a.id&&Date.parse(e.at)>=start&&Date.parse(e.at)<start+DAY);
   if(kind==='learning'?dayEvents.some(learningActivity):kind==='buildOnly'?dayEvents.some(buildingActivity)&&!dayEvents.some(learningActivity):dayEvents.some(active))returned++;
  }result['d'+n]={eligible,returned,rate:eligible?returned/eligible:null,pending};
 }return result;
}
export function trialReport(s,filters={},now=Date.now()){
 s=groupAnalytics(s);
 const from=filters.from||date(now-6*DAY),to=filters.to||date(now);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to))throw Error('invalid_filter');
 const start=Date.parse(from),end=Math.min(Date.parse(to)+DAY,now);
 if(!Number.isFinite(start)||!Number.isFinite(end)||date(start)!==from||date(Date.parse(to))!==to||start>end||end-start>366*DAY)throw Error('invalid_filter');
 const keys=['country','language','mode','device','source','area','batch'];
 if(filters.area&&!Object.hasOwn(usageAreas,filters.area))throw Error('invalid_filter');
 if(filters.visitor&&!/^[a-f0-9-]{32,36}$/.test(filters.visitor))throw Error('invalid_filter');
 const match=(e,except='')=>keys.every(k=>k===except||!filters[k]||filters[k]==='ALL'||(k==='area'?(e.area||'unattributed'):e[k])===filters[k]);
 const visitors=(s.identities||[]).filter(a=>!a.isTest&&a.role!=='admin');
 const excluded=new Set((s.identities||[]).filter(a=>a.isTest||a.role==='admin').map(a=>a.id));
 const byId=new Map(visitors.map(a=>[a.id,a]));
 const all=(s.activity||[]).filter(e=>!excluded.has(e.userId)&&(!filters.visitor||e.userId===filters.visitor)&&Date.parse(e.at)<=now);
 const matched=all.filter(e=>match(e));
 const ranged=matched.filter(e=>Date.parse(e.at)>=start&&Date.parse(e.at)<end);
 const visitorEvents=ranged.filter(e=>byId.has(e.userId));
 const regMatch=a=>(!filters.visitor||a.id===filters.visitor)&&(!filters.country||filters.country==='ALL'||a.cohortCountry===filters.country)&&(!filters.language||filters.language==='ALL'||a.language===filters.language)&&(!filters.source||filters.source==='ALL'||a.source===filters.source)&&(!filters.batch||(a.batch||'')===filters.batch);
 const newVisitors=visitors.filter(a=>regMatch(a)&&Date.parse(a.createdAt)>=start&&Date.parse(a.createdAt)<end);
 // Exclude unobserved/opted-out cohorts rather than pretending they never returned.
 const cohortTime=a=>Date.parse(a.cohortAt||a.createdAt);
 const observed=visitors.filter(a=>regMatch(a)&&a.analytics&&!a.analyticsInterrupted&&cohortTime(a)>=start&&cohortTime(a)<end);
 const returnEvents=all; // Cohort retention uses all observed actions, not only the selected activity area.
 const activity=visitorEvents.filter(active),spans=mergedIntervals(matched.filter(e=>byId.has(e.userId)),start,end);
 const daily=[];
 for(let n=start;n<end;n+=DAY){const today=activity.filter(e=>Date.parse(e.at)>=n&&Date.parse(e.at)<n+DAY),dailySpans=spans.map(e=>({...e,start:Math.max(e.start,n),end:Math.min(e.end,n+DAY)})).filter(e=>e.end>e.start),users=[...new Set(today.map(e=>e.userId))];
  const activeSeconds=seconds(dailySpans);daily.push({date:date(n),newVisitors:newVisitors.filter(a=>dayStart(Date.parse(a.createdAt))===n).length,activeUsers:users.length,activeSeconds,averageSeconds:users.length?activeSeconds/users.length:null,medianSeconds:median(users.map(id=>seconds(dailySpans.filter(e=>e.userId===id))))});
 }
 const countryRows=countries.map(country=>{const es=all.filter(e=>match(e,'country')&&e.country===country),within=es.filter(e=>Date.parse(e.at)>=start&&Date.parse(e.at)<end&&byId.has(e.userId));const regs=visitors.filter(a=>(!filters.visitor||a.id===filters.visitor)&&a.cohortCountry===country&&(!filters.source||a.source===filters.source)&&(!filters.batch||(a.batch||'')===filters.batch)&&(!filters.language||a.language===filters.language)&&Date.parse(a.createdAt)>=start&&Date.parse(a.createdAt)<end);
  return {country,newVisitors:regs.length,activeUsers:distinct(within.filter(active).map(e=>e.userId)),activeSeconds:seconds(mergedIntervals(es.filter(e=>byId.has(e.userId)),start,end)),retention:retention(visitors.filter(a=>(!filters.visitor||a.id===filters.visitor)&&a.cohortCountry===country&&a.analytics&&!a.analyticsInterrupted&&cohortTime(a)>=start&&cohortTime(a)<end&&(!filters.source||a.source===filters.source)&&(!filters.batch||(a.batch||'')===filters.batch)&&(!filters.language||a.language===filters.language)),returnEvents,now)};
 }).filter(row=>!filters.country||filters.country==='ALL'||row.country===filters.country);
 const bins=new Map();let unknownTimezoneSeconds=0;
 const bin=(time,tz)=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(time);return {weekday:parts.find(p=>p.type==='weekday').value,hour:Number(parts.find(p=>p.type==='hour').value)};};
 for(const span of spans){if(!span.timezone){unknownTimezoneSeconds+=(span.end-span.start)/1000;continue;}
  // Minute boundaries also handle half/quarter-hour timezones.
  for(let pos=span.start;pos<span.end;){const stop=Math.min(span.end,Math.floor(pos/60000)*60000+60000),b=bin(pos,span.timezone),key=b.weekday+':'+b.hour;
   if(!bins.has(key))bins.set(key,{...b,activeSeconds:0,users:new Set()});const row=bins.get(key);row.activeSeconds+=(stop-pos)/1000;row.users.add(span.userId);pos=stop;}
 }
 const heatmap=[...bins.values()].map(({users,...row})=>({...row,activeUsers:users.size}));
 const sessions=new Map();
 for(const e of activity){const key=e.userId+':'+e.sessionId;if(!sessions.has(key))sessions.set(key,{userId:e.userId,sessionId:e.sessionId});}
 let activationEligible=0,activated=0,activationPending=0;
 for(const a of observed){const at=cohortTime(a);if(now<at+DAY){activationPending++;continue;}activationEligible++;if(all.some(e=>e.userId===a.id&&e.type==='village_complete'&&Date.parse(e.at)<at+DAY))activated++;}
 const stages=['visit','village_step','village_complete','market_start','market_complete'];
 const funnel=stages.map(type=>({type,users:distinct(ranged.filter(e=>e.type===type).map(e=>e.userId))}));
 const steps=[...new Set(ranged.filter(e=>e.type==='village_step').map(e=>e.scene))].map(scene=>({scene,users:distinct(ranged.filter(e=>e.type==='village_step'&&e.scene===scene).map(e=>e.userId))}));
 const feedback=(s.feedback||[]).filter(f=>!excluded.has(f.owner)&&(!filters.visitor||f.owner===filters.visitor)&&match(f)&&Date.parse(f.createdAt)>=start&&Date.parse(f.createdAt)<end).map(({owner,...f})=>f);
 const accountActivity=new Set(visitorEvents.map(e=>e.userId));
 const accounts=visitors.filter(a=>regMatch(a)&&(filters.visitor||newVisitors.includes(a)||accountActivity.has(a.id)))
  .map(a=>({id:a.id,country:a.country||'UNKNOWN',countrySource:a.countrySource||(a.country==='UNKNOWN'?'unknown':'user'),cohortCountry:a.cohortCountry,language:a.language,source:a.source||'direct',batch:a.batch||'',createdAt:a.createdAt,analytics:!!a.analytics,browserIdentities:a.browserIdentities||1}))
  .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const rolling=days=>distinct(matched.filter(e=>byId.has(e.userId)&&active(e)&&Date.parse(e.at)>=Date.parse(to)-(days-1)*DAY&&Date.parse(e.at)<end).map(e=>e.userId));
 return {accounts,generatedAt:new Date(now).toISOString(),timezone:'UTC',metricVersion:3,acquisition:acquisitionReport(visitors.filter(regMatch),all,start,end,now),filters:{...filters,from,to},summary:{browserIdentities:visitors.filter(regMatch).reduce((n,a)=>n+(a.browserIdentities||1),0),newVisitors:newVisitors.length,knownVisitors:visitors.filter(regMatch).length,trackedVisitors:visitors.filter(a=>regMatch(a)&&a.analytics).length,activeUsers:distinct(activity.map(e=>e.userId)),dau:daily.at(-1)?.activeUsers??0,wau:rolling(7),mau:rolling(30),activeSeconds:seconds(spans),sessions:sessions.size,guestActive:distinct(ranged.filter(e=>active(e)&&!byId.has(e.userId)).map(e=>e.userId)),feedback:feedback.length},...usageReport(matched.filter(e=>byId.has(e.userId)),visitors,start,end),featureUsage:featureUsage(visitorEvents),daily,countries:countryRows,heatmap,unknownTimezoneSeconds,retention:retention(observed,returnEvents,now),learningRetention:retention(observed,returnEvents,now,'learning'),buildOnlyRetention:retention(observed,returnEvents,now,'buildOnly'),audioLessons:['hello','tea','water','sit','thanks'].map(lesson=>{const es=visitorEvents.filter(e=>e.lesson===lesson&&['audio_listen','audio_slow'].includes(e.feature));return {lesson,users:distinct(es.map(e=>e.userId)),uses:es.length,slow:es.filter(e=>e.feature==='audio_slow').length};}),cohorts:[...new Set(observed.map(a=>date(cohortTime(a))))].map(d=>({date:d,...retention(observed.filter(a=>date(cohortTime(a))===d),returnEvents,now)})),activation:{eligible:activationEligible,activated,rate:activationEligible?activated/activationEligible:null,pending:activationPending},funnel,steps,feedback,trial:s.trial||{startDate:null,days:90},notes:['Activity uses event country; visitor cohorts use the first known country; automatic estimates are distinct from user choices.','Retention starts at first analytics opt-in and excludes interrupted consent.','No data before collection began is backfilled.','Activity time is an estimate; hidden and idle time is excluded.']};
}
