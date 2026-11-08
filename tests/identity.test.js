import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openIdentity,identityForToken,publicIdentity,setProfile,saveProgress,setAdminPassword,adminLogin,isAdmin} from '../src/identity.js';
const input={country:'BR',language:'pt-BR',timezone:'America/Sao_Paulo',analytics:true,noticeVersion:'2026-11-07'};
test('anonymous credentials persist identity without registration; a public ID cannot impersonate it',()=>{
 const s={},id=randomUUID(),r=openIdentity(s,null,id);
 assert.equal(r.identity?.id,id);assert.ok(r.token);assert.equal(s.identities.length,1);
 assert.equal(identityForToken(s,r.token)?.id,id);assert.equal(identityForToken(s,id),null);
 assert.equal(openIdentity(s,r.token,null).identity.id,id);
 assert.notEqual(openIdentity(s,null,id).identity.id,id,'cleared credentials create a new visitor instead of claiming an existing identity');
 assert.equal(JSON.stringify(publicIdentity(s.identities[0])).includes('credentialHash'),false);
 assert.equal(JSON.stringify(s).includes(r.token),false);
});
test('country and analysis consent are separate from language and cannot grant admin rights',()=>{
 const s={},id=randomUUID();openIdentity(s,null,id);
 const p=setProfile(s,id,input);assert.equal(p.country,'BR');assert.equal(p.cohortCountry,'BR');assert.equal(p.analytics,true);
 const changed=setProfile(s,id,{...input,country:'VN',language:'en',analytics:false,role:'admin'});assert.equal(changed.country,'VN');assert.equal(changed.cohortCountry,'BR');assert.equal(changed.role,undefined);
 assert.throws(()=>setProfile(s,id,{...input,timezone:'Not/AZone'}),/invalid_profile/);
 assert.equal(isAdmin(s,id),false);
});
test('progress preserves existing gameplay and rejects stale writes; admin login is separate and expires',()=>{
 const s={},id=randomUUID();openIdentity(s,null,id);
 const progress={schema:1,step:2,events:[],onboarding:{step:5,completed:true}};
 assert.equal(saveProgress(s,id,{revision:0,state:progress}).revision,1);
 assert.throws(()=>saveProgress(s,id,{revision:0,state:{...progress,step:0}}),/version_conflict/);
 assert.equal(s.identities[0].progress.state.step,2);
 assert.throws(()=>saveProgress(s,id,{revision:1,state:{...progress,step:99}}),/invalid_progress/);
 const now=Date.now();setAdminPassword(s,'strong admin test password');
 assert.throws(()=>adminLogin(s,'wrong',now),/invalid_login/);
 const token=adminLogin(s,'strong admin test password',now);assert.equal(isAdmin(s,token,now),true);assert.equal(isAdmin(s,token,now+13*3600000),false);
});
