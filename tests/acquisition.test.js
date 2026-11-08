import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openIdentity,setProfile} from '../src/identity.js';
import {acceptEvents,trialReport} from '../src/trial.js';
import {createTrialClient} from '../public/trial-client.js';
const at=Date.UTC(2026,10,7),day=86400000;
test('first acquisition is saved before consent and is never overwritten by a later campaign',()=>{
 const s={identities:[]};const a=openIdentity(s,null,null,at,null,{source:'reddit',batch:'nov-a'});
 assert.equal(a.identity.source,'reddit');assert.equal(a.identity.batch,'nov-a');assert.equal(a.identity.analytics,false);
 openIdentity(s,a.token,null,at+1000,null,{source:'teacher',batch:'nov-b'});
 setProfile(s,a.identity.id,{country:'OTHER',language:'en',timezone:'UTC',analytics:false,noticeVersion:'2026-11-07',source:'teacher'});
 assert.equal(s.identities[0].source,'reddit');assert.equal(s.identities[0].batch,'nov-a');
 const b=openIdentity(s,null,null,at,null,{source:'https://secret/?email=x',batch:'<script>'});assert.equal(b.identity.source,'direct');assert.equal(b.identity.batch,'');
});
test('first observed session funnel excludes unconsented users and later-session completions',()=>{
 const s={identities:[],activity:[]};const a=openIdentity(s,null,null,at,null,{source:'reddit',batch:'nov-a'}).identity;
 openIdentity(s,null,null,at,null,{source:'reddit',batch:'nov-a'});
 setProfile(s,a.id,{country:'OTHER',language:'en',timezone:'UTC',analytics:true,noticeVersion:'2026-11-07'},at);
 const sessionId=randomUUID();const ev=(type,n,extra={})=>({id:randomUUID(),type,at:new Date(at+n).toISOString(),sessionId,scene:'village:0',mode:'starter',language:'en',device:'desktop',...extra});
 acceptEvents(s,a.id,[ev('visit',1),ev('feature',2,{feature:'onboarding_start',scene:'village:1'}),ev('village_step',3,{scene:'village:2'}),ev('village_complete',1000,{sessionId:randomUUID(),scene:'village:5'})],at+1001);
 const r=trialReport(s,{from:'2026-11-07',to:'2026-11-08',source:'reddit',batch:'nov-a'},at+day);
 assert.ok(r.acquisition,'needs an observed-session funnel');assert.equal(r.acquisition.identified,2);assert.equal(r.acquisition.observed,1);assert.equal(r.acquisition.unobserved,1);
 assert.equal(r.acquisition.started,1);assert.equal(r.acquisition.completed,0);assert.equal(r.acquisition.lastSteps[0].scene,'village:2');
 const missing=trialReport(s,{from:'2026-11-07',to:'2026-11-08',batch:'missing'},at+day);
 assert.equal(missing.acquisition.identified,0);assert.ok(missing.countries.every(c=>c.newVisitors===0&&c.retention.d1.eligible===0));
});
test('the first interaction stays in the arrival session and later inactivity starts a new one',async()=>{
 const saved=new Map(),handlers={},sent=[],originals=Object.fromEntries(['document','window','matchMedia','localStorage','setInterval','clearInterval'].map(k=>[k,globalThis[k]])),originalNow=Date.now;let now=at;
 const target={addEventListener:(k,v)=>handlers[k]=v,removeEventListener:()=>{}};
 Object.assign(globalThis,{document:{...target,visibilityState:'visible',hasFocus:()=>true},window:target,matchMedia:()=>({matches:false}),localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},setInterval:()=>1,clearInterval:()=>{}});Date.now=()=>now;
 let tracker;
 try{
  tracker=createTrialClient({getState:()=>({id:'one',language:'en',onboarding:{step:0,chapter:'village',mode:'starter'}}),getIdentity:()=>({analytics:true}),api:async(p,m,b)=>{sent.push(...b.events);}});
  await Promise.resolve();const arrival=sent.find(e=>e.type==='visit').sessionId;
  handlers.pointerdown({isTrusted:true});tracker.record('village_navigation','profile');await tracker.flush();
  assert.equal(sent.find(e=>e.feature==='onboarding_start').sessionId,arrival);
  now+=31*60000;handlers.pointerdown({isTrusted:true});tracker.record('audio_listen','tea');await tracker.flush();
  assert.notEqual(sent.find(e=>e.feature==='audio_listen').sessionId,arrival);
 }finally{tracker?.dispose();Date.now=originalNow;for(const [k,v] of Object.entries(originals))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
});
