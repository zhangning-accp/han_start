import {snapshot} from './works.js';
import {randomUUID} from 'node:crypto';
const phrases=['hello','welcome','thanks'];
const person=(s,id)=>s.identities?.find(a=>a.id===id);
const blocked=(s,recipient,sender)=>s.socialBlocks?.some(b=>b.recipient===recipient&&b.sender===sender);
const safe=g=>{const {sender,recipient,...visible}=g;return structuredClone(visible);};
const listed=a=>a?.socialListed===true&&a.socialEnabled===true&&!a.isTest&&a.role!=='admin';
const directorySettings=a=>({listed:listed(a),displayName:a?.socialName||'',publicId:a?.socialPublicId||null});
export function playerDirectory(s,id,query=''){
 if(!person(s,id))throw Error('unauthorized');
 if(typeof query!=='string'||query.length>24)throw Error('invalid_greeting');
 const q=query.trim().toLocaleLowerCase();
 const players=(s.identities||[]).filter(a=>a.id!==id&&listed(a)&&!blocked(s,id,a.id)&&!blocked(s,a.id,id)&&a.socialName.toLocaleLowerCase().includes(q))
  .map(a=>({id:a.socialPublicId,name:a.socialName})).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 return {players:players.slice(0,50),total:players.length};
}
export function socialInbox(s,id){
 const publicWorks=snapshot(s).works.filter(w=>s.works?.some(own=>own.id===w.id&&own.owner===id)).length;
 return {enabled:person(s,id)?.socialEnabled===true,directory:directorySettings(person(s,id)),publicWorks,blocked:(s.socialBlocks||[]).filter(b=>b.recipient===id).map(b=>s.greetings?.find(g=>g.recipient===id&&g.sender===b.sender)).filter(Boolean).map(g=>({id:g.id,name:g.name})),received:(s.greetings||[]).filter(g=>g.recipient===id&&!blocked(s,id,g.sender)).map(safe).reverse(),sent:(s.greetings||[]).filter(g=>g.sender===id).map(safe).reverse()};
}
export function socialSettings(s,id,b){
 const a=person(s,id);if(!a)throw Error('unauthorized');
 if(typeof b.enabled!=='boolean'||(b.listed!==undefined&&typeof b.listed!=='boolean')||(b.displayName!==undefined&&(typeof b.displayName!=='string'||b.displayName.length>24)))throw Error('invalid_greeting');
 const join=b.enabled&&(b.listed??a.socialListed??false),name=(b.displayName??a.socialName??'').trim();
 if(join&&(!name||/[\u0000-\u001f\u007f]/.test(name)))throw Error('invalid_greeting');
 a.socialEnabled=b.enabled;a.socialListed=join;
 if(join){a.socialName=name;a.socialPublicId??=randomUUID();}
 else{delete a.socialName;delete a.socialPublicId;}
 return {enabled:a.socialEnabled,directory:directorySettings(a)};
}
export function sendGreeting(s,id,b,now=Date.now()){
 if(!person(s,id))throw Error('unauthorized');
 if(!/^[a-f0-9-]{36}$/.test(b.id)||!phrases.includes(b.phrase)||typeof b.name!=='string'||!b.name.trim()||b.name.length>24)throw Error('invalid_greeting');
 if((b.playerId!==undefined)===(b.workId!==undefined))throw Error('invalid_greeting');
 const old=(s.greetings||[]).find(g=>g.id===b.id);
 if(old){if(old.sender!==id)throw Error('invalid_greeting');return safe(old);}
 const work=b.playerId===undefined?snapshot(s).works.find(w=>w.id===b.workId):null;
 const recipient=b.playerId!==undefined?(s.identities||[]).find(a=>listed(a)&&a.socialPublicId===b.playerId):person(s,s.works?.find(w=>w.id===work?.id)?.owner);
 const owner=recipient?.id;
 if(!owner||owner===id||!recipient.socialEnabled||blocked(s,owner,id)||blocked(s,id,owner))throw Error('unavailable');
 const own=(s.greetings||[]).filter(g=>g.sender===id&&now-Date.parse(g.createdAt)<86400000);
 if(own.length>=10||own.some(g=>g.recipient===owner))throw Error('rate_limited');
 const g={id:b.id,sender:id,recipient:owner,workId:work?.id??null,workName:work?.layout.name??null,...(!work?{recipientName:recipient.socialName}:{}),name:b.name.trim(),phrase:b.phrase,reply:null,createdAt:new Date(now).toISOString()};
 (s.greetings??=[]).push(g);return safe(g);
}
export function replyGreeting(s,id,b,now=Date.now()){
 const g=s.greetings?.find(g=>g.id===b.id&&g.recipient===id&&!blocked(s,id,g.sender)&&!blocked(s,g.sender,id));
 if(!g)throw Error('not_found');if(!phrases.includes(b.phrase))throw Error('invalid_greeting');
 if(g.reply&&g.reply!==b.phrase)throw Error('already_replied');
 if(!g.reply){g.reply=b.phrase;g.repliedAt=new Date(now).toISOString();}return safe(g);
}
export function blockGreeting(s,id,b){
 const g=s.greetings?.find(g=>g.id===b.id&&g.recipient===id);if(!g)throw Error('not_found');
 if(b.blocked===false){s.socialBlocks=(s.socialBlocks||[]).filter(x=>x.recipient!==id||x.sender!==g.sender);return {blocked:false};}
 if(!blocked(s,id,g.sender))(s.socialBlocks??=[]).push({recipient:id,sender:g.sender});return {blocked:true};
}
export function removeSocialUser(s,id){
 s.greetings=(s.greetings||[]).filter(g=>g.sender!==id&&g.recipient!==id);
 s.socialBlocks=(s.socialBlocks||[]).filter(b=>b.sender!==id&&b.recipient!==id);
}
