import {personalResearch,saveSurvey,researchReport,publicOffers,configureOffer,respondToOffer} from './research.js';
import {socialInbox,socialSettings,sendGreeting,replyGreeting,blockGreeting,playerDirectory} from './social.js';
import {isIP} from 'node:net';
import {countryFromAddress} from './geo-country.js';
export function clientAddress(req,trusted=process.env.HAN_TRUSTED_PROXIES||''){
 const remote=req.socket.remoteAddress,ip=req.headers['x-real-ip'];
 return trusted.split(',').map(x=>x.trim()).filter(Boolean).includes(remote)&&typeof ip==='string'&&isIP(ip)?ip:remote;
}
import {readStore,updateStore,moderateSubmission} from './store.js';
import {snapshot} from './works.js';
import {openIdentity,identityForToken,publicIdentity,setProfile,saveProgress,adminLogin,isAdmin,adminLogout} from './identity.js';
import {acceptEvents,trialReport,submitFeedback,reviewFeedback} from './trial.js';
const port=process.env.PORT||'3210';
const visitorCookie='han_visitor_'+port,adminCookie='han_admin_'+port;
export function cookieToken(req,admin=false){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith((admin?adminCookie:visitorCookie)+'='))?.split('=')[1]||'';}
const setCookie=(res,token,admin=false)=>res.setHeader('Set-Cookie',`${admin?adminCookie:visitorCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?(admin?43200:31536000):0}${process.env.HAN_SECURE_COOKIE==='1'?'; Secure':''}`);
const headerId=req=>req.headers.authorization?.replace(/^Bearer /,'');
export function requestOwner(req){
 const s=readStore(),a=identityForToken(s,cookieToken(req)),legacy=headerId(req);
 if(a){if(legacy&&legacy!==a.id)throw Error('identity_changed');return a.id;}
 if(!/^[a-f0-9-]{36}$/.test(legacy||'')||s.identities?.some(a=>a.id===legacy))throw Error('unauthorized');
 return legacy;
}
const needsIdentity=req=>{const a=identityForToken(readStore(),cookieToken(req));if(!a)throw Error('unauthorized');return a.id;};
const limits=new Map();
function limit(key,max,window=60000){const now=Date.now();for(const [k,v] of limits)if(v.until<now)limits.delete(k);const entry=limits.get(key)||{count:0,until:now+window};if(++entry.count>max)throw Error('rate_limited');limits.set(key,entry);}
const csvCell=value=>{let v=String(value??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
export function reportCSV(report){
 const rows=[['metric_version',report.metricVersion,'timezone',report.timezone,'generated_at',report.generatedAt],['filters',JSON.stringify(report.filters)],['date','new_visitors','active_visitors','effective_seconds','mean_seconds','median_seconds']];
 for(const d of report.daily)rows.push([d.date,d.newVisitors,d.activeUsers,d.activeSeconds,d.averageSeconds,d.medianSeconds]);
 rows.push([],['account_id','country','country_source','analytics_consent','created_at','source','batch']);
 for(const a of report.accounts||[])rows.push([a.id,a.country,a.countrySource,a.analytics,a.createdAt,a.source,a.batch]);
 rows.push([],['country','new_visitors','active_visitors','effective_seconds','D1_returned','D1_eligible','D7_returned','D7_eligible','D30_returned','D30_eligible']);
 for(const c of report.countries)rows.push([c.country,c.newVisitors,c.activeUsers,c.activeSeconds,...['d1','d7','d30'].flatMap(k=>[c.retention[k].returned,c.retention[k].eligible])]);
 if(report.acquisition){const a=report.acquisition;rows.push([],['first_observed_identified','first_observed','unobserved','started','completed','pending'],[a.identified,a.observed,a.unobserved,a.started,a.completed,a.pending],['last_observed_scene','users']);for(const x of a.lastSteps)rows.push([x.scene,x.users]);}
 if(report.learningRetention){rows.push([],['return_day','eligible','total_returned','learning_returned','building_only_returned','pending']);for(const k of ['d1','d7','d30'])rows.push([k,report.retention[k].eligible,report.retention[k].returned,report.learningRetention[k].returned,report.buildOnlyRetention[k].returned,report.retention[k].pending]);}
 rows.push([],['audio_lesson','users','uses','slow']);for(const x of report.audioLessons||[])rows.push([x.lesson,x.users,x.uses,x.slow]);
 rows.push([],['feature_population',report.featureUsage.visitors],['feature_id','feature_label','unique_visitors','uses','uses_per_visitor','reach']);
 for(const f of report.featureUsage.rows)rows.push([f.id,f.label,f.users,f.uses,f.usesPerUser,f.reach]);
 rows.push([],['area','label','accounts','visits','effective_seconds','average_seconds','median_seconds']);
 for(const m of report.modules)rows.push([m.area,m.label,m.users,m.visits,m.activeSeconds,m.averageSeconds,m.medianSeconds]);
 rows.push([],['country','area','accounts','effective_seconds']);for(const m of report.moduleCountries)rows.push([m.country,m.area,m.users,m.activeSeconds]);
 rows.push([],['country','area','weekday_local','hour_local','effective_seconds','accounts']);for(const h of report.moduleHours)rows.push([h.country,h.area,h.weekday,h.hour,h.activeSeconds,h.users]);
 rows.push([],['account_id','countries','area','effective_seconds','visits']);for(const v of report.visitorUsage)for(const m of v.modules)rows.push([v.id,v.countries.join('|'),m.area,m.activeSeconds,m.visits]);
 rows.push([],['account_id','country','area','weekday_local','hour_local','effective_seconds']);for(const v of report.visitorUsage)for(const h of v.hours)rows.push([v.id,h.country,h.area,h.weekday,h.hour,h.activeSeconds]);
 rows.push([],['task','assistance','accounts','attempts','successes','retries','first_attempts','first_successes']);for(const l of report.learning)rows.push([l.taskId,l.assistance,l.users,l.attempts,l.successes,l.retries,l.firstAttempts,l.firstSuccesses]);
 rows.push([],['weekday_local','hour_local','effective_seconds','active_visitors']);for(const h of report.heatmap)rows.push([h.weekday,h.hour,h.activeSeconds,h.activeUsers]);
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export async function trialRoute(req,res,{pathname,url,json,body}){
 if(!pathname.startsWith('/api/research')&&!pathname.startsWith('/api/social')&&!pathname.startsWith('/api/identity')&&!pathname.startsWith('/api/trial/')&&!pathname.startsWith('/api/admin/')&&pathname!=='/api/feedback')return false;
 if(req.method!=='GET'&&req.headers['x-han-request']!=='1'){json(res,403,{error:'forbidden'});return true;}
 const send=(value,status=200)=>{json(res,status,value);return true;};
 if(pathname==='/api/research/offers'&&req.method==='GET')return send(publicOffers(readStore()));
 if(pathname==='/api/research/offer'&&req.method==='POST'){const id=needsIdentity(req),b=await body(req);return send(updateStore(s=>respondToOffer(s,id,b)));}
 if(pathname==='/api/research'&&req.method==='GET')return send(personalResearch(readStore(),needsIdentity(req)));
 if(pathname==='/api/research/survey'&&req.method==='POST'){const id=needsIdentity(req),b=await body(req);return send(updateStore(s=>saveSurvey(s,id,b)));}
 if(pathname==='/api/social'&&req.method==='GET')return send(socialInbox(readStore(),needsIdentity(req)));
 if(pathname==='/api/social/players'&&req.method==='GET')return send(playerDirectory(readStore(),needsIdentity(req),url.searchParams.get('q')||''));
 const socialActions={'/api/social/settings':socialSettings,'/api/social/send':sendGreeting,'/api/social/reply':replyGreeting,'/api/social/block':blockGreeting};
 if(socialActions[pathname]&&req.method==='POST'){const id=needsIdentity(req),b=await body(req);return send(updateStore(s=>socialActions[pathname](s,id,b)),pathname==='/api/social/send'?201:200);}
 if(pathname==='/api/identity'&&req.method==='POST'){
  limit('identity:'+clientAddress(req),100);
  const b=await body(req);const country=countryFromAddress(clientAddress(req));const r=updateStore(s=>openIdentity(s,cookieToken(req),headerId(req),Date.now(),b.fingerprint??null,b.acquisition??{},country));setCookie(res,r.token);return send({identity:r.identity,progress:r.progress});
 }
 if(pathname==='/api/identity/me'&&req.method==='GET'){
  const a=identityForToken(readStore(),cookieToken(req));return send({identity:a?publicIdentity(a):null,progress:a?.progress??null});
 }
 if(pathname==='/api/identity/profile'&&req.method==='POST'){const id=needsIdentity(req),b=await body(req);return send(updateStore(s=>setProfile(s,id,b)));}
 if(pathname==='/api/identity/progress'&&req.method==='POST'){const id=needsIdentity(req),b=await body(req);return send(updateStore(s=>saveProgress(s,id,b)));}
 if(pathname==='/api/trial/events'&&req.method==='POST'){const id=needsIdentity(req);limit('events:'+id,120);const b=await body(req);return send(updateStore(s=>acceptEvents(s,id,b.events)));}
 if(pathname==='/api/feedback'&&req.method==='POST'){const id=needsIdentity(req),b=await body(req);return send(updateStore(s=>submitFeedback(s,id,b)),201);}
 if(pathname==='/api/feedback'&&req.method==='GET'){const id=needsIdentity(req);return send((readStore().feedback||[]).filter(f=>f.owner===id).map(({owner,...f})=>f));}
 if(pathname==='/api/admin/login'&&req.method==='POST'){
  limit('admin-login:'+clientAddress(req),10,15*60000);const b=await body(req),token=updateStore(s=>adminLogin(s,b.password));setCookie(res,token,true);return send({ok:true});
 }
 if(pathname.startsWith('/api/admin/')){
  if(!isAdmin(readStore(),cookieToken(req,true)))throw Error('unauthorized');
  if(pathname==='/api/admin/contributions'&&req.method==='GET'){
   const s=readStore(),works=snapshot(s).works;
   return send(s.contributions.map(({owner,...c})=>({...c,preview:c.kind==='correction'?works.find(w=>w.id===c.workId)?.layout:null})));
  }
  if(pathname==='/api/admin/contributions'&&req.method==='POST'){
   const b=await body(req),{owner,...c}=updateStore(s=>moderateSubmission(s,b));return send(c);
  }
  if(pathname==='/api/admin/offer'&&req.method==='POST'){const b=await body(req);return send(updateStore(s=>configureOffer(s,b)));}
  if(pathname==='/api/admin/research'&&req.method==='GET')return send(researchReport(readStore()));
  if(pathname==='/api/admin/logout'&&req.method==='POST'){updateStore(s=>adminLogout(s,cookieToken(req,true)));setCookie(res,'',true);return send({ok:true});}
  if(['/api/admin/report','/api/admin/export'].includes(pathname)&&req.method==='GET'){
   const filters=Object.fromEntries(['from','to','country','language','mode','device','source','visitor','area','batch'].filter(k=>url.searchParams.get(k)).map(k=>[k,url.searchParams.get(k)]));
   const report=trialReport(readStore(),filters);if(pathname.endsWith('export')){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="han-start-trial.csv"'});res.end(reportCSV(report));return true;}return send(report);
  }
  if(pathname==='/api/admin/feedback'&&req.method==='POST'){const b=await body(req);return send(updateStore(s=>reviewFeedback(s,b.id,b,'Maintainer')));}
  if(pathname==='/api/admin/settings'&&req.method==='POST'){
   const b=await body(req);if(![30,60,90].includes(b.days)||(b.startDate!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(b.startDate)||!Number.isFinite(Date.parse(b.startDate))||new Date(b.startDate).toISOString().slice(0,10)!==b.startDate)))throw Error('invalid_filter');
   return send(updateStore(s=>s.trial={days:b.days,startDate:b.startDate}));
  }
 }
 return send({error:'not_found'},404);
}
