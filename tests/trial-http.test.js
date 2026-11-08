import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {setAdminPassword} from '../src/identity.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'han-trial-http-')),port=33220,base=`http://127.0.0.1:${port}`;
const store={schema:1,version:1,contributions:[],events:[],history:[],ai:{day:'',calls:0,tokens:0}};
setAdminPassword(store,'trial admin testing password');fs.writeFileSync(path.join(dir,'world.json'),JSON.stringify(store));
let child;
before(async()=>{child=spawn(process.execPath,['src/server.js'],{env:{...process.env,PORT:String(port),HAN_DATA_DIR:dir,DEEPSEEK_API_KEY:''},stdio:'pipe'});await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('server exit '+code)));});});
after(()=>child?.kill());
test('handwriting modules, data and license are served locally, without exposing arbitrary files',async()=>{
 for(const name of ['admin-view.js','admin-format.js','countries.js','handwriting.js','handwriting-ui.js','handwriting-data/ARPHICPL.txt','handwriting-data/NOTICE.txt','handwriting-data/COPYING.txt'])assert.equal((await fetch(`${base}/${name}`)).status,200,name);
 const r=await fetch(`${base}/handwriting-data/medians.json`,{headers:{'Accept-Encoding':'gzip'}});assert.equal(r.status,200);assert.equal(r.headers.get('content-encoding'),'gzip');assert.match(r.headers.get('content-type'),/application\/json/);const data=await r.json();assert.ok(data.characters.length>9000);assert.match(data.notice,/2026-11-07/);
 const plain=await fetch(`${base}/handwriting-data/medians.json`,{headers:{'Accept-Encoding':'identity'}});assert.equal(plain.headers.get('content-encoding'),null);assert.equal((await plain.json()).characters.length,data.characters.length);
 assert.equal((await fetch(`${base}/handwriting-data/private.json`)).status,404);
});
test('Mandarin phrase clips are served locally with an audio MIME type',async()=>{
 for(const id of ['hello','tea','water','sit','thanks']){
  const r=await fetch(`${base}/audio/${id}.wav`);assert.equal(r.status,200,id);assert.equal(r.headers.get('content-type'),'audio/wav');
  const wav=Buffer.from(await r.arrayBuffer());assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.ok(wav.length>4000);
 }
 assert.equal((await fetch(`${base}/audio/missing.wav`)).status,404);
 assert.equal((await fetch(`${base}/phrase-audio.js`)).status,200);
});
const request=async(route,{method='GET',data,cookie='',id='',marker=true}={})=>{
 const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(marker?{'X-Han-Request':'1'}:{}),...(cookie?{Cookie:cookie}:{}),...(id?{Authorization:'Bearer '+id}:{})},body:data?JSON.stringify(data):undefined});
 return {status:r.status,body:r.headers.get('content-type')?.includes('json')?await r.json():await r.text(),cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers};
};
test('voluntary interviews work without analytics, require separate consent and support export, withdrawal and deletion',async()=>{
 const a=await request('/api/identity',{method:'POST',data:{}}),b=await request('/api/identity',{method:'POST',data:{}});
 const data={requestId:randomUUID(),revision:0,goal:'travel',currentTool:'Books',reason:'difficult',note:'Instructions unclear',interviewConsent:false,contact:'tester@example.test'};
 assert.equal((await request('/api/research/survey',{method:'POST',cookie:a.cookie,data})).status,400,'contact must not be saved without consent');
 data.interviewConsent=true;
 const saved=await request('/api/research/survey',{method:'POST',cookie:a.cookie,data});assert.equal(saved.status,200);assert.equal(saved.body.revision,1);
 assert.equal((await request('/api/research/survey',{method:'POST',cookie:a.cookie,data})).body.revision,1,'retry is idempotent');
 assert.equal((await request('/api/research',{cookie:a.cookie})).body.interview.contact,data.contact);
 assert.equal((await request('/api/research',{cookie:b.cookie})).body.interview,null);
 assert.equal((await request('/api/admin/research',{cookie:a.cookie})).status,401);
 const own=await request('/api/mine',{cookie:a.cookie});assert.equal(own.body.research.interview.contact,data.contact);assert.equal(own.body.identity.analytics,false);
 const stale={...data,requestId:randomUUID(),contact:'changed@example.test'};assert.equal((await request('/api/research/survey',{method:'POST',cookie:a.cookie,data:stale})).status,409);
 const withdraw={...data,requestId:randomUUID(),revision:1,interviewConsent:false,contact:''};assert.equal((await request('/api/research/survey',{method:'POST',cookie:a.cookie,data:withdraw})).status,200);
 assert.equal((await request('/api/research',{cookie:a.cookie})).body.interview,null);
 await request('/api/mine',{method:'DELETE',cookie:a.cookie});assert.equal((await request('/api/research',{cookie:a.cookie})).status,401);
 await request('/api/mine',{method:'DELETE',cookie:b.cookie});
});
test('price proposals start hidden, require admin configuration, preserve quotes and count interest without charging',async()=>{
 const a=await request('/api/identity',{method:'POST',data:{}});
 assert.deepEqual((await request('/api/research/offers',{cookie:a.cookie})).body,[]);
 const config={category:'learning',revision:0,enabled:true,title:'More everyday lessons',benefits:'New learning scenes',amountMinor:500,currency:'USD',interval:'month'};
 assert.equal((await request('/api/admin/offer',{method:'POST',cookie:a.cookie,data:config})).status,401);
 const admin=await request('/api/admin/login',{method:'POST',data:{password:'trial admin testing password'}});
 assert.equal((await request('/api/admin/offer',{method:'POST',cookie:admin.cookie,data:{...config,amountMinor:-1}})).status,400);
 const setting=await request('/api/admin/offer',{method:'POST',cookie:admin.cookie,data:config});assert.equal(setting.status,200);
 const offer=(await request('/api/research/offers',{cookie:a.cookie})).body[0];assert.equal(offer.amountMinor,500);assert.equal(offer.category,'learning');
 const vote={offerId:offer.id,action:'interested',reason:'Useful lessons'};
 assert.equal((await request('/api/research/offer',{method:'POST',cookie:a.cookie,data:vote})).status,400,'a response needs a viewed quote');
 const viewed={offerId:offer.id,action:'viewed'};
 assert.equal((await request('/api/research/offer',{method:'POST',cookie:a.cookie,data:viewed})).status,200);
 await request('/api/research/offer',{method:'POST',cookie:a.cookie,data:viewed});
 assert.equal((await request('/api/research/offer',{method:'POST',cookie:a.cookie,data:vote})).status,200);
 const report=(await request('/api/admin/research',{cookie:admin.cookie})).body;
 assert.equal(report.offers[0].viewed,1);assert.equal(report.offers[0].interested,1);assert.equal(report.offers[0].declined,0);
 assert.equal((await request('/api/admin/offer',{method:'POST',cookie:admin.cookie,data:config})).status,409);
 await request('/api/admin/offer',{method:'POST',cookie:admin.cookie,data:{...config,revision:1,amountMinor:700}});
 const personal=(await request('/api/mine',{cookie:a.cookie})).body.research;assert.equal(personal.responses[offer.id].offer.amountMinor,500);
 assert.equal((await request('/api/research/offer',{method:'POST',cookie:a.cookie,data:vote})).status,409,'retired quote cannot accept new answers');
 await request('/api/admin/offer',{method:'POST',cookie:admin.cookie,data:{category:'learning',revision:2,enabled:false}});
 assert.deepEqual((await request('/api/research/offers',{cookie:a.cookie})).body,[]);
 await request('/api/mine',{method:'DELETE',cookie:a.cookie});
 assert.equal((await request('/api/admin/research',{cookie:admin.cookie})).body.offers[0].viewed,0);
});
test('inline correction is stored in SQLite, private, deduplicated and removed with its owner',async()=>{
 assert.equal((await fetch(base+'/inline-correction.js')).status,200);
 const a=await request('/api/identity',{method:'POST',data:{}}),b=await request('/api/identity',{method:'POST',data:{}});
 const correction={key:'phrase.tea.meaning',original:'我要茶',displayed:'Wrong',replacement:'Tôi muốn trà',reason:''};
 const data={id:randomUUID(),category:'translation',language:'vi',mode:'starter',scene:'village:2',correction};
 assert.equal((await request('/api/feedback',{method:'POST',data})).status,401);
 assert.equal((await request('/api/feedback',{method:'POST',cookie:a.cookie,data})).status,201);
 await request('/api/feedback',{method:'POST',cookie:a.cookie,data});
 const saved=await request('/api/feedback',{cookie:a.cookie});assert.equal(saved.body.length,1);assert.deepEqual(saved.body[0].correction,correction);
 assert.equal((await request('/api/feedback',{cookie:b.cookie})).body.length,0);
 await request('/api/mine',{method:'DELETE',cookie:a.cookie});await request('/api/mine',{method:'DELETE',cookie:b.cookie});
});
test('anonymous onboarding secures legacy work, operations data is admin-only, export and deletion cover new records',async()=>{
 const id=randomUUID(),created=await request('/api/identity',{method:'POST',id,data:{}});
 assert.equal(created.status,200);assert.equal(created.body.identity.id,id);assert.match(created.headers.get('set-cookie'),/HttpOnly/);assert.match(created.headers.get('set-cookie'),/SameSite=Strict/);
 const cookie=created.cookie;
 assert.equal((await request('/api/mine',{id})).status,401,'known visitor ID is not an auth credential');
 assert.equal((await request('/api/mine',{id,cookie})).status,200);
 assert.equal((await request('/api/admin/report')).status,401);
 assert.equal((await request('/api/admin/report',{id,cookie})).status,401);
 const p={country:'VN',language:'vi',timezone:'Asia/Ho_Chi_Minh',analytics:true,noticeVersion:'2026-11-07',role:'admin'};
 assert.equal((await request('/api/identity/profile',{method:'POST',cookie,data:p,marker:false})).status,403);
 assert.equal((await request('/api/identity/profile',{method:'POST',cookie,data:p})).status,200);
 const ev={id:randomUUID(),type:'action',action:'hello',at:new Date().toISOString(),scene:'village',mode:'starter',language:'vi',timezone:p.timezone,device:'mobile',sessionId:randomUUID()};
 assert.equal((await request('/api/trial/events',{method:'POST',cookie,data:{events:[ev,ev]}})).body.accepted,1);
 const f=await request('/api/feedback',{method:'POST',cookie,data:{id:randomUUID(),category:'bug',text:'The instructions need more detail',scene:'village',language:'vi',mode:'starter'}});assert.equal(f.status,201);
 const mine=await request('/api/mine',{cookie});assert.equal(mine.body.feedback.length,1);assert.equal(mine.body.activity.length,1);assert.equal(JSON.stringify(mine.body).includes('credentialHash'),false);
 const login=await request('/api/admin/login',{method:'POST',data:{password:'trial admin testing password'}});assert.equal(login.status,200);
 const report=await request('/api/admin/report',{cookie:login.cookie});assert.equal(report.status,200);assert.equal(report.body.summary.newVisitors,1);assert.equal(report.body.summary.activeUsers,1);assert.equal(report.body.countries.find(c=>c.country==='VN').activeUsers,1);
 const other=await request('/api/identity',{method:'POST',data:{}});
 assert.equal((await request('/api/admin/report?visitor='+other.body.identity.id,{cookie:login.cookie})).body.summary.activeUsers,0);
 assert.equal((await request('/api/admin/report?area=build',{cookie:login.cookie})).body.summary.activeUsers,0);
 const filtered=await request('/api/admin/report?visitor='+id,{cookie:login.cookie});assert.equal(filtered.body.visitorUsage.length,1);
 const exported=await request('/api/admin/export?visitor='+id,{cookie:login.cookie});assert.match(exported.body,/account_id/);assert.match(exported.body,new RegExp(id));
 assert.equal((await request('/api/admin/export',{cookie:login.cookie})).headers.get('content-type').includes('text/csv'),true);
 assert.equal((await request('/api/admin/feedback',{method:'POST',cookie:login.cookie,data:{id:f.body.id,status:'working',severity:'urgent',note:'Investigating',revision:1}})).body.status,'working');
 assert.equal((await request('/api/mine','GET')).status,401);
 assert.equal((await request('/api/mine',{method:'DELETE',cookie})).status,200);
 const after=await request('/api/admin/report',{cookie:login.cookie});assert.equal(after.body.summary.knownVisitors,1);assert.equal(after.body.summary.activeUsers,0);assert.equal(after.body.feedback.length,0);
 assert.equal((await request('/api/identity/me',{cookie})).body.identity,null);
});

test('city artwork is served as SVG for the shared visual theme',async()=>{
 for(const asset of ['city-frieze.svg','learning-scroll.svg','community-scroll.svg','rail-scroll.svg']){const r=await fetch(base+'/'+asset);assert.equal(r.status,200,asset);assert.equal(r.headers.get('content-type'),'image/svg+xml');assert.match(await r.text(),/<svg/);}
});
