import {VERSION} from '../public/content.js';
import {randomUUID} from 'node:crypto';
const uuid=/^[a-f0-9-]{36}$/;
const visitor=(s,id)=>{const a=s.identities?.find(x=>x.id===id);if(!a)throw Error('unauthorized');return a;};
export function personalResearch(s,id){return structuredClone(visitor(s,id).research||{revision:0,survey:null,interview:null,responses:{}});}
export function saveSurvey(s,id,b,now=Date.now()){
 const a=visitor(s,id),prior=a.research||{revision:0,responses:{}};
 if(prior.requestId===b.requestId&&uuid.test(b.requestId))return personalResearch(s,id);
 if(b.revision!==prior.revision)throw Error('version_conflict');
 const short=(x,n)=>typeof x==='string'&&x.length<=n;
 if(!uuid.test(b.requestId)||!['','travel','work','family','culture','study','other'].includes(b.goal)||!['','confusing','difficult','boring','content','technical','busy','enjoyed','other'].includes(b.reason)||!short(b.currentTool,200)||!short(b.note,500)||typeof b.interviewConsent!=='boolean'||!short(b.contact,254))throw Error('invalid_research');
 if(b.interviewConsent?!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.contact):b.contact!=='')throw Error('invalid_research');
 const at=new Date(now).toISOString();
 a.research={...prior,revision:prior.revision+1,requestId:b.requestId,survey:{goal:b.goal,currentTool:b.currentTool.trim(),reason:b.reason,note:b.note.trim(),at,version:VERSION},interview:b.interviewConsent?{contact:b.contact.trim(),consentedAt:at,noticeVersion:'interview-v1'}:null};
 return personalResearch(s,id);
}
export function publicOffers(s){return Object.values(s.offerSettings||{}).filter(x=>x.enabled).map(x=>structuredClone(x.offer));}
export function configureOffer(s,b,now=Date.now()){
 if(!['learning','decoration'].includes(b.category)||typeof b.enabled!=='boolean')throw Error('invalid_research');
 const old=s.offerSettings?.[b.category];if(b.revision!==(old?.revision||0))throw Error('version_conflict');
 let offer=old?.offer||null;const revision=b.revision+1;
 if(b.enabled){
  if(!Number.isSafeInteger(b.amountMinor)||b.amountMinor<1||b.amountMinor>10000000||!['USD','EUR','GBP','BRL','CNY'].includes(b.currency)||!['month','year','once'].includes(b.interval)||typeof b.title!=='string'||!b.title.trim()||b.title.length>120||typeof b.benefits!=='string'||!b.benefits.trim()||b.benefits.length>1200)throw Error('invalid_research');
  offer={id:randomUUID(),version:revision,category:b.category,title:b.title.trim(),benefits:b.benefits.trim(),amountMinor:b.amountMinor,currency:b.currency,interval:b.interval,createdAt:new Date(now).toISOString()};
  s.offerCatalog??=[];s.offerCatalog.push(offer);
 }
 s.offerSettings??={};return s.offerSettings[b.category]={revision,enabled:b.enabled,offer};
}
export function respondToOffer(s,id,b,now=Date.now()){
 const a=visitor(s,id),offer=publicOffers(s).find(o=>o.id===b.offerId);
 if(!offer)throw Error('version_conflict');
 if(!['viewed','interested','declined'].includes(b.action)||b.reason!==undefined&&(typeof b.reason!=='string'||b.reason.length>500))throw Error('invalid_research');
 const prior=a.research?.responses?.[offer.id];
 if(b.action!=='viewed'&&!prior)throw Error('invalid_research');
 a.research??={revision:0,survey:null,interview:null,responses:{}};
 a.research.responses??={};
 const response=prior||{offer:structuredClone(offer),viewedAt:new Date(now).toISOString(),choice:null,reason:''};
 if(b.action!=='viewed'){response.choice=b.action;response.reason=(b.reason||'').trim();response.respondedAt=new Date(now).toISOString();}
 a.research.responses[offer.id]=response;return structuredClone(response);
}
export function researchReport(s){
 const participants=(s.identities||[]).filter(a=>a.research&&!a.isTest&&a.role!=='admin').map(a=>({id:a.id,source:a.source,batch:a.batch||'',...personalResearch(s,a.id)}));
 const offers=(s.offerCatalog||[]).map(offer=>{const responses=participants.map(p=>p.responses?.[offer.id]).filter(Boolean);return {...offer,active:publicOffers(s).some(o=>o.id===offer.id),viewed:responses.length,interested:responses.filter(r=>r.choice==='interested').length,declined:responses.filter(r=>r.choice==='declined').length,unanswered:responses.filter(r=>!r.choice).length};});
 return {participants,offers,settings:s.offerSettings||{}};
}
