import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {socialInbox,socialSettings,sendGreeting,replyGreeting,blockGreeting,removeSocialUser} from '../src/social.js';
import {productEvents} from '../public/telemetry.js';
import {acceptEvents,trialReport} from '../src/trial.js';
const setup=()=>({identities:[{id:'a'},{id:'b'},{id:'c'}],works:[{id:'work',owner:'b'},{id:'private',owner:'b'}],history:[{snapshot:{works:[{id:'work',layout:{name:'Tea corner'}}]}}]});
const input=()=>({id:randomUUID(),workId:'work',phrase:'hello',name:'Ana'});
test('a consented player who only greets is active and greeting metrics contain no message or recipient',()=>{
 const now=Date.parse('2026-11-07T10:00:00Z'),s={identities:[{id:'a',country:'VN',analytics:true,createdAt:'2026-11-07T00:00:00Z'}]};
 const events=productEvents('greeting_send',null,null,{name:'PRIVATE',recipient:'PRIVATE'});
 assert.ok(events.some(e=>e.type==='action'));assert.equal(JSON.stringify(events).includes('PRIVATE'),false);
 acceptEvents(s,'a',events.map(e=>({...e,id:randomUUID(),sessionId:randomUUID(),at:new Date(now).toISOString(),language:'vi',mode:'starter',scene:'market:0',area:'board',device:'desktop',timezone:'Asia/Ho_Chi_Minh'})),now);
 const r=trialReport(s,{from:'2026-11-07',to:'2026-11-07'},now+1000);assert.equal(r.summary.dau,1);assert.equal(r.featureUsage.rows.find(r=>r.id==='greeting_send').uses,1);
});
test('real greetings require opt-in and a published work, hide identity, deduplicate and allow one recipient-only reply',()=>{
 const s=setup(),b=input();assert.throws(()=>sendGreeting(s,'a',b),/unavailable/);
 socialSettings(s,'b',{enabled:true});const g=sendGreeting(s,'a',b);assert.equal(g.phrase,'hello');assert.equal(sendGreeting(s,'a',b).id,g.id);
 assert.equal(socialInbox(s,'b').received.length,1);assert.equal(socialInbox(s,'a').sent.length,1);assert.equal(socialInbox(s,'c').received.length,0);
 assert.equal('sender' in g,false);assert.equal('recipient' in g,false);
 assert.throws(()=>replyGreeting(s,'c',{id:g.id,phrase:'thanks'}),/not_found/);
 assert.equal(replyGreeting(s,'b',{id:g.id,phrase:'thanks'}).reply,'thanks');assert.equal(socialInbox(s,'a').sent[0].reply,'thanks');
 assert.equal(replyGreeting(s,'b',{id:g.id,phrase:'thanks'}).reply,'thanks');assert.throws(()=>replyGreeting(s,'b',{id:g.id,phrase:'welcome'}),/already_replied/);
 assert.throws(()=>sendGreeting(s,'a',input()),/rate_limited/);
 assert.throws(()=>sendGreeting(s,'a',{...input(),workId:'private'}),/unavailable/);
 assert.throws(()=>sendGreeting(s,'b',input()),/unavailable/);
 assert.throws(()=>sendGreeting(s,'c',{...input(),phrase:'custom message'}),/invalid_greeting/);
});
test('blocking or disabling stops new greetings; deleting a player removes both directions and block references',()=>{
 const s=setup();socialSettings(s,'b',{enabled:true});const g=sendGreeting(s,'a',input());
 assert.throws(()=>blockGreeting(s,'c',{id:g.id}),/not_found/);blockGreeting(s,'b',{id:g.id});assert.equal(socialInbox(s,'b').received.length,0);
 assert.throws(()=>sendGreeting(s,'a',input(),Date.now()+86400001),/unavailable/);
 assert.equal(socialInbox(s,'b').blocked.length,1);
 blockGreeting(s,'b',{id:g.id,blocked:false});assert.equal(socialInbox(s,'b').received.length,1);assert.equal(socialInbox(s,'b').blocked.length,0);
 blockGreeting(s,'b',{id:g.id});
 socialSettings(s,'b',{enabled:false});assert.throws(()=>sendGreeting(s,'c',input()),/unavailable/);
 removeSocialUser(s,'a');assert.equal(socialInbox(s,'a').sent.length,0);assert.equal(s.socialBlocks.some(x=>x.sender==='a'),false);
});
