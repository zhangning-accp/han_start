import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {openIdentity} from '../src/identity.js';

test('greetings require private credentials, survive restart, remain private and follow opt-out/block/deletion',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'han-social-')),s={schema:1,version:1,contributions:[],events:[],history:[]};
 const people=['a','b','c'].map(()=>openIdentity(s,'',null));
 s.works=[{id:'shared',owner:people[1].identity.id}];s.history=[{snapshot:{works:[{id:'shared',layout:{name:'Shared corner'}}]}}];
 fs.writeFileSync(path.join(dir,'world.json'),JSON.stringify(s));let child,base;
 const start=async()=>{child=spawn(process.execPath,['src/server.js'],{env:{...process.env,PORT:'0',HAN_DATA_DIR:dir,DEEPSEEK_API_KEY:'',HAN_PUBLIC_ORIGIN:''},stdio:'pipe'});const output=await new Promise((resolve,reject)=>{child.stdout.once('data',d=>resolve(String(d)));child.once('error',reject);child.once('exit',()=>reject(Error('server exited')));});base='http://127.0.0.1:'+output.match(/127\.0\.0\.1:(\d+)/)[1];};
 const stop=()=>new Promise(resolve=>{child.once('exit',resolve);child.kill();});
 const req=async(url,user,body,method=body?'POST':'GET',marker=true)=>{const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(marker?{'X-Han-Request':'1'}:{}),...(user===undefined?{}:{Cookie:'han_visitor_0='+people[user].token})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
 try{
  await start();assert.equal((await req('/api/social')).status,401);
  assert.equal((await req('/api/social',1)).data.enabled,false);
  assert.equal((await req('/api/social/settings',1,{enabled:true},'POST',false)).status,403);
  assert.equal((await req('/api/social/settings',1,{enabled:true})).status,200);
  const world=await req('/api/world');assert.equal(world.data.works[0].greetingsEnabled,true);assert.ok(!JSON.stringify(world.data).includes(people[1].identity.id));
  const data={id:randomUUID(),workId:'shared',name:'QA visitor',phrase:'hello'};
  assert.equal((await req('/api/social/send',0,data)).status,201);
  assert.equal((await req('/api/social/send',0,data)).status,201);
  assert.equal((await req('/api/social',2)).data.received.length,0);
  assert.equal((await req('/api/social/reply',2,{id:data.id,phrase:'thanks'})).status,400);
  await stop();await start();
  const inbox=(await req('/api/social',1)).data;assert.equal(inbox.received.length,1);assert.equal(inbox.received[0].name,'QA visitor');assert.ok(!JSON.stringify(inbox).includes(people[0].identity.id));
  assert.equal((await req('/api/social/reply',1,{id:data.id,phrase:'thanks'})).status,200);
  assert.equal((await req('/api/mine',0)).data.social.sent[0].reply,'thanks');
  await req('/api/social/block',1,{id:data.id});assert.equal((await req('/api/social',1)).data.received.length,0);
  assert.equal((await req('/api/social/send',0,{...data,id:randomUUID()})).status,400);
  await req('/api/social/settings',1,{enabled:false});assert.equal((await req('/api/world')).data.works[0].greetingsEnabled,false);
  await req('/api/mine',0,undefined,'DELETE');assert.equal((await req('/api/social',1)).data.received.length,0);
 }finally{if(child?.exitCode===null)await stop();}
});
