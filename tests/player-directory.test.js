import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as social from '../src/social.js';
import {randomUUID} from 'node:crypto';
import {removeTrialUser} from '../src/trial.js';
const setup=()=>({identities:[{id:'a',credentialHash:'SECRET'},{id:'b',country:'VN',accountId:'PRIVATE'},{id:'c'}],works:[],history:[]});
test('directory membership requires separate opt-in and publishes only a public name and opaque ID',()=>{
 const s=setup();social.socialSettings(s,'b',{enabled:true});
 assert.equal(social.socialInbox(s,'b').directory?.listed,false);
 social.socialSettings(s,'b',{enabled:true,listed:true,displayName:'  Lin  '});
 assert.equal(typeof social.playerDirectory,'function');
 const list=social.playerDirectory(s,'a');assert.equal(list.total,1);assert.equal(list.players[0].name,'Lin');
 assert.match(list.players[0].id,/^[a-f0-9-]{36}$/);assert.deepEqual(Object.keys(list.players[0]).sort(),['id','name']);
 assert.doesNotMatch(JSON.stringify(list),/PRIVATE|SECRET|VN/);
 assert.equal(social.playerDirectory(s,'b').players.length,0);
 assert.equal(social.playerDirectory(s,'a','lin').total,1);assert.equal(social.playerDirectory(s,'a','other').total,0);
 assert.throws(()=>social.playerDirectory(s,'missing'),/unauthorized/);
});
test('directory greetings work without a public work, share quotas with work greetings, and honor withdrawal, block and deletion',()=>{
 const s=setup();social.socialSettings(s,'b',{enabled:true,listed:true,displayName:'Lin'});
 const playerId=social.playerDirectory(s,'a').players[0].id;
 const b={id:randomUUID(),playerId,name:'Ana',phrase:'hello'},g=social.sendGreeting(s,'a',b,100000);
 assert.equal(g.recipientName,'Lin');assert.equal(g.workId,null);assert.equal(social.sendGreeting(s,'a',b,100001).id,g.id);
 assert.equal(social.socialInbox(s,'b').received[0].name,'Ana');
 assert.throws(()=>social.sendGreeting(s,'b',{...b,id:randomUUID()}),/unavailable/);
 assert.throws(()=>social.sendGreeting(s,'a',{...b,id:randomUUID(),workId:'w'}),/invalid_greeting/);
 s.works=[{id:'w',owner:'b'}];s.history=[{snapshot:{works:[{id:'w',layout:{name:'Tea'}}]}}];
 assert.throws(()=>social.sendGreeting(s,'a',{id:randomUUID(),workId:'w',name:'Ana',phrase:'hello'},100002),/rate_limited/);
 social.blockGreeting(s,'b',{id:g.id});assert.equal(social.playerDirectory(s,'a').total,0);assert.equal(social.playerDirectory(s,'b').total,0);
 assert.throws(()=>social.sendGreeting(s,'a',{...b,id:randomUUID()},100000000),/unavailable/);
 social.blockGreeting(s,'b',{id:g.id,blocked:false});
 assert.equal(social.replyGreeting(s,'b',{id:g.id,phrase:'thanks'}).reply,'thanks');
 social.socialSettings(s,'b',{enabled:true,listed:false});
 assert.throws(()=>social.sendGreeting(s,'c',{...b,id:randomUUID()}),/unavailable/);
 social.socialSettings(s,'b',{enabled:true,listed:true,displayName:'Lin'});
 assert.notEqual(social.playerDirectory(s,'a').players[0].id,playerId,'rejoining does not reactivate a withdrawn public ID');
 removeTrialUser(s,'b');assert.equal(social.playerDirectory(s,'a').total,0);assert.equal(social.socialInbox(s,'a').sent.length,0);
});
test('directory excludes test/admin accounts, limits results and permits narrowing by nickname',()=>{
 const s=setup();for(let i=0;i<55;i++){s.identities.push({id:'p'+i});social.socialSettings(s,'p'+i,{enabled:true,listed:true,displayName:'Player '+i});}
 s.identities.find(a=>a.id==='p0').isTest=true;s.identities.find(a=>a.id==='p1').role='admin';
 const r=social.playerDirectory(s,'a');assert.equal(r.total,53);assert.equal(r.players.length,50);
 assert.equal(social.playerDirectory(s,'a','Player 54').players.length,1);
});
test('invalid settings are atomic; opting out removes listing and disabling reception does not silently relist later',()=>{
 const s=setup();social.socialSettings(s,'b',{enabled:true,listed:true,displayName:'Lin'});
 const before=structuredClone(s);
 for(const data of [{enabled:true,listed:true,displayName:' '},{enabled:true,listed:true,displayName:'x'.repeat(25)},{enabled:true,listed:'yes',displayName:'Lin'}]){
  assert.throws(()=>social.socialSettings(s,'b',data),/invalid_greeting/);assert.deepEqual(s,before);
 }
 social.socialSettings(s,'b',{enabled:false});assert.equal(social.playerDirectory(s,'a').total,0);
 social.socialSettings(s,'b',{enabled:true});assert.equal(social.playerDirectory(s,'a').total,0);
 social.socialSettings(s,'b',{enabled:true,listed:true,displayName:'Lin'});
 social.socialSettings(s,'b',{enabled:true,listed:false});assert.equal(social.playerDirectory(s,'a').total,0);
 assert.equal(s.identities[1].socialName,undefined);
});
