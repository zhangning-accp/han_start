import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {acceptEvents,trialReport,submitFeedback,reviewFeedback,removeTrialUser} from '../src/trial.js';
import {reportCSV} from '../src/trial-http.js';
const day=86400000,t=Date.UTC(2026,9,1),id=randomUUID();
const account=(changes={})=>({id,username:'ana',role:'learner',country:'BR',cohortCountry:'BR',language:'pt-BR',timezone:'America/Sao_Paulo',analytics:true,createdAt:new Date(t).toISOString(),source:'teacher',isTest:false,...changes});
const event=(type,at,extra={})=>({id:randomUUID(),type,at:new Date(at).toISOString(),scene:'village',mode:'starter',language:'pt-BR',timezone:'America/Sao_Paulo',device:'mobile',sessionId:randomUUID(),...extra});

test('feature popularity counts real uses and unique visitors with the same report filters',()=>{
 const second=randomUUID(),testId=randomUUID();
 const s={identities:[account(),account({id:second,country:'VN',cohortCountry:'VN'}),account({id:testId,isTest:true})],activity:[]};
 const repeated=event('action',t+1000,{action:'edit'});
 acceptEvents(s,id,[repeated,repeated,event('action',t+2000,{action:'edit'}),event('help',t+3000),event('visit',t+4000)],t+10000);
 acceptEvents(s,second,[event('help',t+5000),event('market_start',t+6000)],t+10000);
 acceptEvents(s,testId,[event('action',t+7000,{action:'save'})],t+10000);
 const filters={from:'2026-10-01',to:'2026-10-01'},r=trialReport(s,filters,t+day);
 assert.equal(r.featureUsage.visitors,2);
 assert.deepEqual(r.featureUsage.rows[0],{id:'help',label:'查看学习帮助',users:2,uses:2,usesPerUser:1,reach:1});
 const edit=r.featureUsage.rows.find(x=>x.id==='build_edit');
 assert.equal(edit.users,1);assert.equal(edit.uses,2);assert.equal(edit.usesPerUser,2);assert.equal(edit.reach,.5);
 assert.equal(r.featureUsage.rows.find(x=>x.id==='build_save').uses,0,'internal test saves are excluded');
 const vn=trialReport(s,{...filters,country:'VN'},t+day);
 assert.equal(vn.featureUsage.visitors,1);assert.equal(vn.featureUsage.rows.find(x=>x.id==='build_edit').uses,0);
 const empty=trialReport(s,{...filters,language:'en'},t+day);
 assert.equal(empty.featureUsage.visitors,0);assert.ok(empty.featureUsage.rows.every(x=>x.uses===0&&x.reach===null));
 const next=trialReport(s,{from:'2026-10-02',to:'2026-10-02'},t+2*day);
 assert.equal(next.featureUsage.visitors,0);
 const csv=reportCSV(vn);assert.match(csv,/feature_id/);assert.match(csv,/"help","查看学习帮助","1","1","1","1"/);
});
test('opt-in events deduplicate, validate clocks and durations, and preserve country snapshots',()=>{
 const s={identities:[account()]},e=event('action',t+1000,{action:'hello'});
 assert.equal(acceptEvents(s,id,[e,e],t+2000).accepted,1);assert.equal(s.activity.length,1);assert.equal(s.activity[0].country,'BR');
 s.identities[0].country='VN';assert.equal(s.activity[0].country,'BR');
 assert.throws(()=>acceptEvents(s,id,[event('register',t+1000)],t+2000),/invalid_event/);
 assert.throws(()=>acceptEvents(s,id,[event('duration',t+1000,{start:t,end:t+600000})],t+2000),/invalid_event/);
 assert.throws(()=>acceptEvents(s,id,[event('action',t+day,{action:'hello'})],t),/invalid_event/);
 s.identities[0].analytics=false;assert.equal(acceptEvents(s,id,[event('action',t+1000,{action:'hello'})],t+2000).accepted,0);
});

test('individual and country reports split time by function, local hour and retain learning outcomes',()=>{
 const second=randomUUID(),s={identities:[account(),account({id:second,country:'VN',cohortCountry:'VN'})],activity:[]};
 const start=t+3*3600000-10000;
 acceptEvents(s,id,[event('duration',start+20000,{start,end:start+20000,area:'build'}),event('duration',start+30000,{start:start+10000,end:start+30000,area:'market'}),event('feature',start,{area:'build',feature:'view_build'}),event('learning',start+1000,{area:'market',taskId:'welcome',outcome:'retry',assistance:'guided',attempt:2,text:'must not persist'})],start+40000);
 acceptEvents(s,second,[event('duration',start+20000,{start,end:start+20000,area:'village'})],start+40000);
 const filter={from:'2026-10-01',to:'2026-10-01'},r=trialReport(s,filter,t+day);
 assert.equal(r.modules.find(m=>m.area==='build').activeSeconds,20);
 assert.equal(r.modules.find(m=>m.area==='market').activeSeconds,10,'overlapping tabs cannot double count module time');
 assert.equal(r.modules.reduce((n,m)=>n+m.activeSeconds,0),r.summary.activeSeconds);
 const personal=trialReport(s,{...filter,visitor:id},t+day);
 assert.equal(personal.summary.newVisitors,1);assert.equal(personal.summary.activeSeconds,30);assert.equal(personal.visitorUsage.length,1);
 assert.equal(personal.moduleHours.filter(h=>h.area==='build').length,2,'local midnight splits hour bins');
 assert.equal(personal.learning[0].retries,1);assert.equal(personal.learning[0].assistance,'guided');
 assert.equal(personal.moduleCountries.some(x=>x.country==='VN'),false);
 assert.equal(JSON.stringify(s.activity).includes('must not persist'),false);
 const vn=trialReport(s,{...filter,country:'VN'},t+day);assert.equal(vn.modules.find(x=>x.area==='village').activeSeconds,20);
 assert.throws(()=>acceptEvents(s,id,[event('duration',start+1000,{start,end:start+1000,area:'arbitrary secret'})],start+40000),/invalid_event/);
});
test('reports exclude test users, deduplicate accounts, split UTC midnight and union overlapping use',()=>{
 const s={identities:[account(),account({id:'test',isTest:true})],activity:[]};
 const start=t+day-10000;
 acceptEvents(s,id,[event('action',start,{action:'hello'}),event('duration',start+20000,{start,end:start+20000}),event('duration',start+15000,{start:start+5000,end:start+15000})],t+day+20000);
 s.activity.push({...s.activity[0],id:randomUUID(),userId:'test'});
 const r=trialReport(s,{from:'2026-10-01',to:'2026-10-02'},t+2*day);
 assert.equal(r.summary.newVisitors,1);assert.equal(r.summary.activeUsers,1);assert.equal(r.summary.activeSeconds,20);
 assert.equal(r.daily[0].activeSeconds,10);assert.equal(r.daily[1].activeSeconds,10);
 assert.equal(r.countries.find(c=>c.country==='BR').activeUsers,1);
 assert.equal(r.heatmap.reduce((n,x)=>n+x.activeSeconds,0),20);
 assert.equal(trialReport(s,{from:'2026-10-01',to:'2026-10-02',country:'VN'},t+2*day).summary.activeUsers,0);
});
test('retention uses mature registration cohorts and exact return days',()=>{
 const s={identities:[account(),account({id:'new',createdAt:new Date(t+7*day).toISOString()})],activity:[]};
 acceptEvents(s,id,[event('action',t+day+1000,{action:'hello'})],t+day+2000);
 acceptEvents(s,id,[event('action',t+7*day+1000,{action:'answer'})],t+7*day+2000);
 const r=trialReport(s,{from:'2026-10-01',to:'2026-10-08'},t+8*day);
 assert.deepEqual(r.retention.d7,{eligible:1,returned:1,rate:1,pending:1});
 assert.equal(r.retention.d30.eligible,0);assert.equal(r.retention.d30.rate,null);
});
test('late opt-in starts its own observed cohort, and a changed country does not erase a return',()=>{
 const a=account({cohortAt:new Date(t+7*day).toISOString(),analyticsSince:new Date(t+7*day).toISOString(),country:'VN'});
 const s={identities:[a],activity:[]};
 acceptEvents(s,id,[event('action',t+8*day+1000,{action:'hello'})],t+8*day+2000);
 const r=trialReport(s,{from:'2026-10-08',to:'2026-10-09',country:'BR'},t+9*day);
 assert.equal(r.summary.newVisitors,0);assert.equal(r.retention.d1.eligible,1);assert.equal(r.retention.d1.returned,1);assert.equal(r.cohorts[0].date,'2026-10-08');
});
test('feedback preserves original text, deduplicates retry and tracks review; deletion removes personal analytics',()=>{
 const s={identities:[account()],activity:[]},input={id:randomUUID(),category:'translation',text:'Não entendi este botão.',scene:'village',language:'pt-BR',mode:'starter'};
 const f=submitFeedback(s,id,input,t);assert.equal(f.status,'new');assert.equal(f.country,'BR');assert.equal(f.text,input.text);
 assert.equal(submitFeedback(s,id,input,t).id,f.id);assert.equal(s.feedback.length,1);
 const changed=reviewFeedback(s,f.id,{status:'resolved',note:'Fixed the label',severity:'normal'},'admin',t+1000);
 assert.equal(changed.history.length,1);assert.equal(changed.text,input.text);assert.equal(changed.firstReviewedAt,new Date(t+1000).toISOString());
 assert.throws(()=>reviewFeedback(s,f.id,{status:'invented'},'admin',t),/invalid_feedback/);
 removeTrialUser(s,id);assert.equal(s.identities.length,0);assert.equal(s.feedback.length,0);
});
