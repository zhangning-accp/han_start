import {randomBytes,randomUUID,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import {fingerprintSource} from '../public/fingerprint.js';
import {countries,countryCodes} from '../public/countries.js';
export {countries};
export const NOTICE_VERSION='2026-11-07';
const hash=token=>createHash('sha256').update(token).digest('hex');
export function md5Fingerprint(s){
 if(!s||typeof s!=='object'||typeof s.userAgent!=='string'||!s.userAgent||s.userAgent.length>512||typeof s.platform!=='string'||s.platform.length>80||typeof s.timezone!=='string'||s.timezone.length>100||!Array.isArray(s.languages)||s.languages.length>10||s.languages.some(x=>typeof x!=='string'||x.length>40)||['width','height','colorDepth','pixelRatio','cores','touch'].some(k=>!Number.isFinite(s[k])||s[k]<0||s[k]>50000))throw Error('invalid_fingerprint');
 return createHash('md5').update(fingerprintSource(s)).digest('hex');
}
const derive=(password,salt)=>scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
export function publicIdentity(a){const {credentialHash,progress,research,...safe}=a;return safe;}
export function identityForToken(s,token){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;
 return s.identities?.find(a=>a.credentialHash===hash(token))??null;
}
export function openIdentity(s,token,legacyId,now=Date.now(),fingerprint=null,acquisition=null,inferredCountry='UNKNOWN'){
 const digest=fingerprint===null?null:md5Fingerprint(fingerprint);
 const attach=a=>{
  if(!a.accountId&&digest){a.accountId=digest;a.fingerprintVersion=1;}
  a.countrySource??=a.country==='UNKNOWN'?'unknown':'user';
  a.inferredCountry=a.countrySource==='user'&&a.country==='UNKNOWN'?'UNKNOWN':countryCodes.includes(inferredCountry)?inferredCountry:'UNKNOWN';
  if(a.countrySource!=='user'){
   a.country=a.inferredCountry;a.countrySource=a.country==='UNKNOWN'?'unknown':'ip';
   if(a.cohortCountry==='UNKNOWN'&&a.country!=='UNKNOWN')a.cohortCountry=a.country;
  }
  return a;
 };
 const existing=identityForToken(s,token);if(existing){attach(existing);return {identity:publicIdentity(existing),token,progress:existing.progress??null};}
 s.identities??=[];
 const id=/^[a-f0-9-]{36}$/.test(legacyId||'')&&!s.identities.some(a=>a.id===legacyId)?legacyId:randomUUID();
 const freshToken=randomBytes(32).toString('hex'),a={id,credentialHash:hash(freshToken),country:'UNKNOWN',cohortCountry:'UNKNOWN',language:'en',timezone:'',analytics:false,noticeVersion:NOTICE_VERSION,createdAt:new Date(now).toISOString(),source:'direct',isTest:false};
 if(acquisition&&typeof acquisition==='object'){const tag=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(x)?x:'';a.source=tag(acquisition.source)||'direct';a.batch=tag(acquisition.batch);a.acquisitionCaptured=true;}
 attach(a);s.identities.push(a);return {identity:publicIdentity(a),token:freshToken,progress:null};
}
export function profile(input){
 if(![...countries,'AUTO'].includes(input.country)||!['zh','en','vi','id','pt-BR'].includes(input.language)||typeof input.analytics!=='boolean'||input.noticeVersion!==NOTICE_VERSION)throw Error('invalid_profile');
 if(typeof input.timezone!=='string'||input.timezone.length>80)throw Error('invalid_profile');
 if(input.timezone)try{new Intl.DateTimeFormat('en',{timeZone:input.timezone}).format();}catch{throw Error('invalid_profile');}
 return {country:input.country,language:input.language,timezone:input.timezone,analytics:input.analytics,noticeVersion:NOTICE_VERSION};
}
export function setProfile(s,id,input,now=Date.now()){
 const a=s.identities?.find(a=>a.id===id);if(!a)throw Error('unauthorized');const p=profile(input);
 if(p.country==='AUTO'){p.country=a.inferredCountry||'UNKNOWN';p.countrySource=p.country==='UNKNOWN'?'unknown':'ip';}
 else p.countrySource='user';
 if(p.countrySource==='user'&&p.country==='UNKNOWN')a.inferredCountry='UNKNOWN';
 if(p.analytics&&!a.analytics){a.analyticsSince=new Date(now).toISOString();a.cohortAt??=a.analyticsSince;}
 if(!p.analytics&&a.analytics)a.analyticsInterrupted=true;
 if(a.cohortCountry==='UNKNOWN'&&p.country!=='UNKNOWN')a.cohortCountry=p.country;
 Object.assign(a,p);
 if(!a.acquisitionCaptured&&a.source==='direct'&&typeof input.source==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(input.source))a.source=input.source;
 return publicIdentity(a);
}
export function saveProgress(s,id,input){
 const a=s.identities?.find(a=>a.id===id);if(!a)throw Error('unauthorized');
 if(input.revision!==(a.progress?.revision??0))throw Error('version_conflict');
 const v=input.state;
 if(!v||v.schema!==1||!Number.isInteger(v.step)||v.step<0||v.step>5||!Array.isArray(v.events)||JSON.stringify(v).length>180000)throw Error('invalid_progress');
 const allowed=['schema','step','events','results','help','attempts','draft','completedAt','source','batch','language','languageChosen','onboarding','buildDraft','workId','workRevision','author','privateFeedback'];
 const clean=Object.fromEntries(allowed.filter(k=>Object.hasOwn(v,k)).map(k=>[k,structuredClone(v[k])]));
 a.progress={revision:input.revision+1,state:{...clean,id}};return {revision:a.progress.revision};
}
export function setAdminPassword(s,password){
 if(typeof password!=='string'||password.length<12||password.length>128)throw Error('invalid_credentials');
 const salt=randomBytes(16).toString('hex');s.admin={salt,passwordHash:derive(password,salt).toString('hex')};s.adminSessions=[];
}
export function adminLogin(s,password,now=Date.now()){
 if(!s.admin||typeof password!=='string'||password.length>128)throw Error('invalid_login');
 if(!timingSafeEqual(derive(password,s.admin.salt),Buffer.from(s.admin.passwordHash,'hex')))throw Error('invalid_login');
 const token=randomBytes(32).toString('hex');s.adminSessions=(s.adminSessions||[]).filter(x=>x.expires>now).slice(-9);s.adminSessions.push({hash:hash(token),expires:now+12*3600000});return token;
}
export function isAdmin(s,token,now=Date.now()){return typeof token==='string'&&!!s.adminSessions?.some(x=>x.expires>now&&x.hash===hash(token));}
export function adminLogout(s,token){s.adminSessions=(s.adminSessions||[]).filter(x=>x.hash!==hash(token||''));}
