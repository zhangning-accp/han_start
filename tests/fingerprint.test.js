import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fp from '../public/fingerprint.js';
import {createHash} from 'node:crypto';
import {openIdentity,identityForToken,md5Fingerprint} from '../src/identity.js';
import {trialReport} from '../src/trial.js';
test('browser signals become a stable digest without storing their raw values',async()=>{
 assert.equal(typeof fp.fingerprintSource,'function');
 const signals={userAgent:'test browser',platform:'test',languages:['vi'],width:390,height:844,colorDepth:24,pixelRatio:2,cores:8,touch:5,timezone:'Asia/Ho_Chi_Minh'};
 const a=md5Fingerprint(signals),b=md5Fingerprint({...signals,width:844,height:390});
 assert.equal(a,createHash('md5').update(fp.fingerprintSource(signals)).digest('hex'));assert.match(a,/^[a-f0-9]{32}$/);assert.equal(a,b);assert.notEqual(a,md5Fingerprint({...signals,cores:4}));
});
test('matching fingerprints group estimated accounts but never grant private access',()=>{
 const s={},now=Date.UTC(2026,10,7,1),fingerprint={userAgent:'test',platform:'test',languages:['vi'],width:390,height:844,colorDepth:24,pixelRatio:2,cores:8,touch:5,timezone:'Asia/Ho_Chi_Minh'};
 const a=openIdentity(s,null,null,now,fingerprint),b=openIdentity(s,null,null,now+1000,fingerprint);
 assert.match(a.identity.accountId,/^[a-f0-9]{32}$/);assert.equal(a.identity.accountId,b.identity.accountId);
 assert.notEqual(a.identity.id,b.identity.id);assert.equal(identityForToken(s,b.token).id,b.identity.id);assert.equal(identityForToken(s,fingerprint),null);
 assert.equal(openIdentity(s,a.token,null,now+2000,{...fingerprint,cores:4}).identity.accountId,a.identity.accountId,'credential keeps its account if browser attributes drift');
 const report=trialReport(s,{from:'2026-11-07',to:'2026-11-07'},now+3000);assert.equal(report.summary.newVisitors,1);assert.equal(report.summary.browserIdentities,2);
 assert.throws(()=>openIdentity(s,null,null,now,'raw browser metadata'),/invalid_fingerprint/);
});
