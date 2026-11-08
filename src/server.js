import {personalResearch} from './research.js';
import {socialInbox} from './social.js';
import {trialRoute,requestOwner,cookieToken} from './trial-http.js';
import {removeTrialUser} from './trial.js';
import {identityForToken,publicIdentity} from './identity.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {readStore,updateStore,publicWorld,record,pruneActivity} from './store.js';
import {respond} from './ai.js';
import {saveWork,prepareContribution} from './works.js';
const root=fileURLToPath(new URL('../public/',import.meta.url));
const port=Number(process.env.PORT||3210);
const publicOrigin=process.env.HAN_PUBLIC_ORIGIN?new URL(process.env.HAN_PUBLIC_ORIGIN).origin:null;
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>262144)throw Error('请求过长');}return JSON.parse(s||'{}');}
const owner=requestOwner;
const publicContribution=c=>{const {owner,...rest}=c;return rest;};
export const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'");res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 try{
  const localHosts=[`127.0.0.1:${server.address().port}`,`localhost:${server.address().port}`];
  if(!localHosts.includes(req.headers.host)&&req.headers.host!==(publicOrigin?new URL(publicOrigin).host:null)){json(res,403,{error:'不允许此访问域名'});return;}
  const expectedOrigin=localHosts.includes(req.headers.host)?'http://'+req.headers.host:publicOrigin;
  if(req.headers.origin&&req.headers.origin!==expectedOrigin){json(res,403,{error:'不允许跨来源请求'});return;}
  const url=new URL(req.url,'http://localhost'),pathname=url.pathname;
  if(req.method!=='GET'&&identityForToken(readStore(),cookieToken(req))&&req.headers['x-han-request']!=='1')return json(res,403,{error:'forbidden'});
  if(await trialRoute(req,res,{pathname,url,json,body}))return;
  if(pathname==='/api/world'&&req.method==='GET')return json(res,200,publicWorld(readStore()));
  if(pathname==='/api/config'&&req.method==='GET')return json(res,200,{aiConfigured:!!process.env.DEEPSEEK_API_KEY,trial:readStore().trial||{startDate:null,days:90}});
  if(pathname==='/api/respond'&&req.method==='POST'){const userId=owner(req);const b=await body(req);return json(res,200,await respond({...b,userId}));}
  if(pathname==='/api/mine'&&req.method==='GET'){const id=owner(req);const s=readStore();return json(res,200,{research:s.identities?.some(a=>a.id===id)?personalResearch(s,id):null,social:socialInbox(s,id),identity:s.identities?.find(a=>a.id===id)?publicIdentity(s.identities.find(a=>a.id===id)):null,activity:(s.activity||[]).filter(e=>e.userId===id),feedback:(s.feedback||[]).filter(f=>f.owner===id).map(({owner,...f})=>f),works:(s.works??[]).filter(w=>w.owner===id).map(publicContribution),contributions:s.contributions.filter(c=>c.owner===id).map(publicContribution),events:s.events.filter(e=>e.userId===id)});}
  if(pathname==='/api/works'&&req.method==='POST'){
   const id=owner(req),b=await body(req);const work=updateStore(s=>{const w=saveWork(s,id,b);record(s,'layout_save',{userId:id,workId:w.id,result:'saved'});return publicContribution(w);});return json(res,200,work);
  }
  if(pathname==='/api/contributions'&&req.method==='POST'){
    const id=owner(req),b=await body(req);
    if(b.consent!==true||typeof b.text!=='string'||b.text.trim().length<8||b.text.length>600||typeof b.author!=='string'||b.author.length>24)throw Error('请确认公开说明，填写 8–600 字的建议和 24 字以内署名');
    const result=updateStore(s=>{
      const own=s.contributions.filter(c=>c.owner===id);
      if(own.filter(c=>Date.now()-Date.parse(c.created)<3600000).length>=5)throw Error('每小时最多提交五条，请稍后再来');
      const details=prepareContribution(s,id,b);
      if(own.some(c=>c.text===b.text.trim()&&c.workRevision===details.workRevision&&c.replacement===details.replacement&&!['withdrawn','archived'].includes(c.status)))throw Error('duplicate');
      const c={id:randomUUID(),owner:id,author:b.author.trim()||'匿名邻居',text:b.text.trim(),original:b.text.trim(),kind:['build','correction','场景需求','中文纠错','活动创意'].includes(b.kind)?b.kind:'场景需求',baseVersion:s.version,targetVersion:null,status:'submitted',created:new Date().toISOString(),audit:[],...details};
      s.contributions.push(c);record(s,'contribution_submit',{userId:id,result:'submitted'});return publicContribution(c);
    });return json(res,201,result);
  }
  if(pathname==='/api/contributions/update'&&req.method==='POST'){
    const id=owner(req),b=await body(req);const c=updateStore(s=>{const c=s.contributions.find(c=>c.id===b.id&&c.owner===id);if(!c)throw Error('找不到自己的投稿');
      if(b.action==='withdraw'&&['submitted','reviewing','changes','approved'].includes(c.status))c.status='withdrawn';
      else if(b.action==='resubmit'&&c.status==='changes'&&typeof b.text==='string'&&b.text.trim().length>=8&&b.text.length<=600){const details=prepareContribution(s,id,{...c,...b,kind:c.kind});c.audit.push({status:c.status,time:new Date().toISOString(),text:c.text,layout:c.layout,replacement:c.replacement});Object.assign(c,details);c.text=b.text.trim();c.status='submitted';}
      else throw Error('当前状态不能执行此操作');c.audit.push({status:c.status,time:new Date().toISOString(),text:c.text});return publicContribution(c);});return json(res,200,c);
  }
  if(pathname==='/api/mine'&&req.method==='DELETE'){
    const id=owner(req);updateStore(s=>{removeTrialUser(s,id);const removed=s.contributions.filter(c=>c.owner===id),ids=new Set(removed.map(c=>c.id)),workIds=new Set((s.works??[]).filter(w=>w.owner===id).map(w=>w.id)),names=new Set(removed.map(c=>c.author));s.works=(s.works??[]).filter(w=>w.owner!==id);s.contributions=s.contributions.filter(c=>c.owner!==id);s.events=s.events.filter(e=>e.userId!==id);s.history=s.history.map(h=>{const copy=structuredClone(h);if(ids.has(copy.contributionId)){copy.author='Deleted user';copy.change='Contribution deleted';copy.contributionId=null;}if(copy.snapshot){copy.snapshot.works=copy.snapshot.works.filter(w=>!workIds.has(w.id));for(const w of copy.snapshot.works){w.editors=w.editors.map(n=>names.has(n)?'Deleted user':n);for(const c of removed)if(c.kind==='correction'&&c.workId===w.id){const item=w.layout.items.find(i=>i.id===c.itemId);if(item&&item.text===c.replacement)item.text='招牌';}}}return copy;});});return json(res,200,{deleted:true});
  }
  if(pathname.startsWith('/api/'))return json(res,404,{error:'无此接口'});
  const files=Object.fromEntries(['rail-scroll.svg','learning-scroll.svg','community-scroll.svg','city-frieze.svg','moderation-ui.js','admin-format.js','countries.js','admin-view.js','research-ui.js','research-admin.js','launch-report-ui.js','yard-scene.js','writing-practice-ui.js','writing-practice.js','writing-data.js','lesson-copy.js','social-ui.js','inline-correction.js','handwriting.js','handwriting-ui.js','handwriting-data/medians.json','handwriting-data/ARPHICPL.txt','handwriting-data/COPYING.txt','handwriting-data/NOTICE.txt','index.html','phrase-audio.js','audio/character-hello.wav','audio/character-tea.wav','audio/character-water.wav','audio/character-sit.wav','audio/character-thanks.wav','audio/hello.wav','audio/tea.wav','audio/water.wav','audio/sit.wav','audio/thanks.wav','app.js','style.css','content.js','building.js','builder-ui.js','i18n.js','translations.js','onboarding.js','onboarding-ui.js','village-copy.js','trial-client.js','telemetry.js','fingerprint.js','trial-ui.js','trial-copy.js','admin.html','usage-ui.js','admin.js','admin.css'].map(f=>['/'+f,f]));files['/']='index.html';
  if(req.method!=='GET'||!files[pathname])return json(res,404,{error:'未找到页面'});
  const f=files[pathname];res.setHeader('Content-Type',f.endsWith('.svg')?'image/svg+xml':f.endsWith('.json')?'application/json; charset=utf-8':f.endsWith('.txt')?'text/plain; charset=utf-8':f.endsWith('.wav')?'audio/wav':f.endsWith('.js')?'text/javascript; charset=utf-8':f.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');if(f==='handwriting-data/medians.json'){res.setHeader('Vary','Accept-Encoding');if(/(?:^|,)\s*gzip\s*(?:,|$)/i.test(req.headers['accept-encoding']||'')){res.setHeader('Content-Encoding','gzip');res.end(fs.readFileSync(path.join(root,f+'.gz')));return;}}res.end(fs.readFileSync(path.join(root,f)));
 }catch(e){const codes=['invalid_research','unavailable','invalid_greeting','already_replied','unauthorized','identity_changed','forbidden','rate_limited','invalid_profile','invalid_event','invalid_feedback','invalid_filter','invalid_progress','invalid_login','not_found','invalid_layout','invalid_component','component_limit','out_of_bounds','collision','missing_components','not_owner','version_conflict','invalid_correction','duplicate'];json(res,['unauthorized','invalid_login','identity_changed'].includes(e.message)?401:e.message==='forbidden'?403:e.message==='rate_limited'?429:e.message==='version_conflict'?409:400,{error:codes.includes(e.message)?e.message:'request_failed'});}
});
pruneActivity();
const maintenance=setInterval(()=>{try{pruneActivity();}catch{console.error('Activity retention maintenance failed; retrying in one hour.');}},3600000);
maintenance.unref();server.on('close',()=>clearInterval(maintenance));
server.listen(port,'127.0.0.1',()=>{
 const actualPort=server.address().port;
 if(process.env.HAN_PORT_FILE)fs.writeFileSync(process.env.HAN_PORT_FILE,String(actualPort)+'\n',{mode:0o600});
 console.log(`青禾街服务 http://127.0.0.1:${actualPort}`);
});
