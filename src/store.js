import {VERSION} from '../public/content.js';
import path from 'node:path';
import {openDatabase} from './database.js';
import {snapshot,publishContribution} from './works.js';
export const dataDir=path.resolve(process.env.HAN_DATA_DIR||'data');
export const initial=()=>({schema:1,version:1,contributions:[],history:[],events:[],ai:{day:'',calls:0,tokens:0}});
let database;
const storage=()=>database??=openDatabase(dataDir,initial);
export function readStore(){return storage().read();}
export function updateStore(fn){return storage().update(fn);}
export function backupStore(destination){return storage().backup(destination);}
export function pruneActivity(now){return storage().pruneActivity(now);}
export function record(s,type,extra={}){s.events.push({type,time:new Date().toISOString(),productVersion:VERSION,contentVersion:s.version,batch:'local-v1',source:'local',userId:'maintainer',taskId:null,result:null,help:0,...extra});}
export function publicWorld(s){const current=snapshot(s);current.works=current.works.map(w=>({...w,greetingsEnabled:s.identities?.some(a=>a.id===s.works?.find(own=>own.id===w.id)?.owner&&a.socialEnabled===true)??false}));return {version:s.version,...current,history:s.history.map(({snapshot,...entry})=>entry)};}
// Called inside updateStore so an unsuccessful publication also rolls back review/approval.
export function moderateSubmission(s,b){
 const c=s.contributions.find(c=>c.id===b.id);if(!c)throw Error('not_found');
 if(b.status!==c.status||b.revision!==c.audit.length)throw Error('version_conflict');
 if(!['publish','revise','reject'].includes(b.action)||typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>1000||typeof b.reviewer!=='string'||!b.reviewer.trim()||b.reviewer.length>80)throw Error('invalid_review');
 if(!['submitted','reviewing',...(b.action==='publish'?['approved']:[])].includes(c.status))throw Error('invalid_review');
 const reason=b.reason.trim(),reviewer=b.reviewer.trim();
 if(c.status==='submitted')moderate(s,c.id,'review',reason,reviewer);
 if(b.action==='publish'&&c.status==='reviewing')moderate(s,c.id,'approve',reason,reviewer);
 return moderate(s,c.id,b.action,reason,reviewer);
}
export function moderate(s,id,action,reason,reviewer){
 const c=s.contributions.find(c=>c.id===id);if(!c)throw Error('找不到贡献');
 if(!reason?.trim()||!reviewer?.trim())throw Error('必须提供理由和审核者');
 const allowed={review:['submitted'],revise:['reviewing'],approve:['reviewing'],reject:['reviewing'],archive:['withdrawn','rejected','changes'],publish:['approved']};
 if(!allowed[action]?.includes(c.status))throw Error('不允许的状态转换');
 const next=action==='publish'?publishContribution(s,c,reviewer):null;
 c.status={review:'reviewing',revise:'changes',approve:'approved',reject:'rejected',archive:'archived',publish:'published'}[action];
 c.review={reviewer,reason,time:new Date().toISOString()};c.audit.push({status:c.status,...c.review});
 if(action==='publish'){
   s.version++;c.targetVersion=s.version;
   s.history.push({version:s.version,time:c.review.time,author:c.author,reviewer,contributionId:c.id,workId:c.workId,kind:c.kind,change:c.text,feature:next.feature,reason,snapshot:next});
   record(s,'world_publish',{result:'published'});
 }else record(s,'review_decision',{result:c.status});
 return c;
}

