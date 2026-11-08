import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trialReport} from '../src/trial.js';
import {reportCSV} from '../src/trial-http.js';
const now=Date.UTC(2026,10,7,12),id='a'.repeat(32);
const account={id,country:'US',cohortCountry:'US',countrySource:'ip',language:'en',createdAt:'2026-11-06T12:00:00Z',analytics:false,credentialHash:'SECRET',progress:{private:'PRIVATE'},research:{interview:{contact:'PRIVATE'}}};
test('account directory includes new visitors without analytics, with safe metadata and country provenance',()=>{
 const r=trialReport({identities:[account,{...account,id:'b'.repeat(32),isTest:true}],activity:[]},{},now);
 assert.equal(r.accounts?.length,1);assert.equal(r.accounts[0].countrySource,'ip');assert.equal(r.accounts[0].analytics,false);
 assert.doesNotMatch(JSON.stringify(r),/SECRET|PRIVATE/);
});
test('CSV exports the account directory and country provenance even without behavior consent',()=>{
 const csv=reportCSV(trialReport({identities:[account],activity:[]},{},now));
 assert.match(csv,/country_source/);assert.match(csv,new RegExp(id));assert.match(csv,/"ip"/);assert.doesNotMatch(csv,/SECRET|PRIVATE/);
});
test('direct account detail remains findable outside selected dates but does not invent activity',()=>{
 const r=trialReport({identities:[account],activity:[]},{from:'2026-11-07',to:'2026-11-07',visitor:id},now);
 assert.equal(r.accounts?.[0].id,id);assert.equal(r.visitorUsage.length,0);
 assert.equal(trialReport({identities:[account],activity:[]},{source:'reddit'},now).accounts.length,0);
});
