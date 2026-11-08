import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {setAdminPassword} from '../src/identity.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'han-review-')),port=33491,base=`http://127.0.0.1:${port}`;
const store={schema:1,version:1,contributions:[],events:[],history:[],ai:{day:'',calls:0,tokens:0}};
setAdminPassword(store,'review testing password');fs.writeFileSync(path.join(dir,'world.json'),JSON.stringify(store));
let child,admin;
const req=async(route,method='GET',data,cookie='',marker=true)=>{
 const r=await fetch(base+'/api/'+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie,...(marker?{'X-Han-Request':'1'}:{})},body:data?JSON.stringify(data):undefined});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
};
before(async()=>{child=spawn(process.execPath,['src/server.js'],{env:{...process.env,PORT:String(port),HAN_DATA_DIR:dir,DEEPSEEK_API_KEY:''},stdio:'pipe'});await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('server exit '+code)));});admin=(await req('admin/login','POST',{password:'review testing password'})).cookie;});
after(()=>child?.kill());
const layout={name:'Tea garden',items:[{id:'a',type:'table',x:0,y:0,rotation:0,text:''},{id:'b',type:'sign',x:2,y:0,rotation:0,text:'欢迎光临'},{id:'c',type:'plant',x:0,y:2,rotation:0,text:''}]};
async function submit(){
 const cookie=(await req('identity','POST',{})).cookie;
 const w=(await req('works','POST',{layout},cookie)).body;
 const c=await req('contributions','POST',{kind:'build',workId:w.id,workRevision:1,basePublishedVersion:0,text:'My lovely tea garden',author:'Builder',consent:true},cookie);
 assert.equal(c.status,201);return {cookie,w,c:c.body};
}
const decision=(c,action,extra={})=>req('admin/contributions','POST',{id:c.id,status:c.status,revision:c.audit.length,action,reason:'Checked the submitted work',reviewer:'网站管理员',...extra},admin);
test('review queue requires admin access; publication is audited and uses the submitted snapshot',async()=>{
 const {cookie,w,c}=await submit();
 assert.equal((await req('admin/contributions')).status,401);
 assert.equal((await req('admin/contributions','GET',null,cookie)).status,401);
 const queue=await req('admin/contributions','GET',null,admin);assert.equal(queue.status,200);
 const item=queue.body.find(x=>x.id===c.id);assert.deepEqual(item.layout,layout);assert.equal(item.owner,undefined);
 const payload={id:c.id,status:c.status,revision:0,action:'publish',reason:'Looks good',reviewer:'管理员'};
 assert.equal((await req('admin/contributions','POST',payload,cookie)).status,401);
 assert.equal((await req('admin/contributions','POST',payload,admin,false)).status,403);
 assert.equal((await decision(c,'publish',{reason:' '})).status,400);
 await req('works','POST',{id:w.id,revision:1,layout:{...layout,name:'Private new revision'}},cookie);
 const published=await decision(c,'publish');assert.equal(published.status,200);assert.equal(published.body.status,'published');
 assert.deepEqual(published.body.audit.map(x=>x.status),['reviewing','approved','published']);
 const world=(await req('world')).body;assert.equal(world.works.find(x=>x.id===w.id).layout.name,'Tea garden');
 assert.equal((await decision(c,'publish')).status,409);
 assert.deepEqual((await req('world')).body,world);
 assert.equal((await req('mine','GET',null,cookie)).body.contributions[0].review.reviewer,'网站管理员');
});
test('change requests, rejection, withdrawal and deleted submissions cannot be overwritten by stale reviews',async()=>{
 const {cookie,c}=await submit();
 const changed=await decision(c,'revise');assert.equal(changed.status,200);assert.equal(changed.body.status,'changes');
 assert.equal((await decision(changed.body,'publish')).status,400);
 assert.equal((await req('contributions/update','POST',{id:c.id,action:'resubmit',text:'Updated description for my garden'},cookie)).status,200);
 assert.equal((await decision(c,'reject')).status,409,'same status after resubmission still has a different audit revision');
 const latest=(await req('mine','GET',null,cookie)).body.contributions[0];
 assert.equal((await decision(latest,'reject')).body.status,'rejected');
 const other=await submit();await req('contributions/update','POST',{id:other.c.id,action:'withdraw'},other.cookie);
 assert.equal((await decision(other.c,'publish')).status,409);
 await req('mine','DELETE',null,other.cookie);assert.equal((await decision(other.c,'publish')).status,400);
});
test('conflicting publication rolls back every automatic review step',async()=>{
 const {cookie,w,c}=await submit();
 const second=(await req('contributions','POST',{kind:'build',workId:w.id,workRevision:1,basePublishedVersion:0,text:'Another description of my garden',author:'Builder',consent:true},cookie)).body;
 assert.equal((await decision(c,'publish')).status,200);
 const world=(await req('world')).body;
 assert.equal((await decision(second,'publish')).status,409);
 const unchanged=(await req('mine','GET',null,cookie)).body.contributions.find(x=>x.id===second.id);
 assert.equal(unchanged.status,'submitted');assert.deepEqual(unchanged.audit,[]);assert.deepEqual((await req('world')).body,world);
});
