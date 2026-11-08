import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openIdentity,setProfile,NOTICE_VERSION} from '../src/identity.js';
const profile=country=>({country,language:'en',timezone:'UTC',analytics:false,noticeVersion:NOTICE_VERSION});
test('IP country is a labelled default, accepts global countries, and never replaces a manual choice',()=>{
 const s={};const a=openIdentity(s,null,null,Date.now(),null,null,'US');
 assert.equal(a.identity.country,'US');assert.equal(a.identity.countrySource,'ip');
 assert.equal(a.identity.cohortCountry,'US');
 assert.equal(setProfile(s,a.identity.id,{...profile('AUTO')}).countrySource,'ip');
 setProfile(s,a.identity.id,profile('JP'));
 const reopened=openIdentity(s,a.token,null,Date.now(),null,null,'BR').identity;
 assert.equal(reopened.country,'JP');assert.equal(reopened.countrySource,'user');
 setProfile(s,a.identity.id,profile('UNKNOWN'));
 assert.equal(s.identities[0].inferredCountry,'UNKNOWN','declining a country also clears the stored IP estimate');
 assert.equal(openIdentity(s,a.token,null,Date.now(),null,null,'US').identity.country,'UNKNOWN');
 assert.equal(s.identities[0].inferredCountry,'UNKNOWN','a later visit must respect country opt-out');
});
test('unknown lookup stays unknown; a returning legacy country is treated as a manual choice',()=>{
 const s={};const a=openIdentity(s,null,null,Date.now(),null,null,'ZZ');
 assert.equal(a.identity.country,'UNKNOWN');assert.equal(a.identity.countrySource,'unknown');
 s.identities[0].country='VN';delete s.identities[0].countrySource;
 assert.equal(openIdentity(s,a.token,null,Date.now(),null,null,'US').identity.country,'VN');
 assert.equal(s.identities[0].countrySource,'user');
});
