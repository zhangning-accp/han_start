import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profileFields,trialHTML} from '../public/trial-ui.js';
import {trialCopy,trialText} from '../public/trial-copy.js';
const context={T:key=>trialText(key,'en'),esc:s=>String(s??'').replaceAll('<','&lt;').replaceAll('"','&quot;')};
test('automatic country stays visibly inferred until the visitor chooses a manual override',()=>{
 const html=profileFields({country:'US',inferredCountry:'US',countrySource:'ip'},context);
 assert.match(html,/value="AUTO" selected/);assert.match(html,/United States/);assert.match(html,/IP/);assert.match(html,/value="JP"/);
 assert.match(profileFields({country:'UNKNOWN',countrySource:'user'},context),/value="UNKNOWN" selected/);
});
test('visitor settings require no signup, keep analysis optional and country independent',()=>{
 const html=profileFields({country:'BR',analytics:false},context);
 assert.match(html,/value="BR" selected/);assert.match(html,/type="checkbox"/);assert.doesNotMatch(html,/checked/);assert.doesNotMatch(html,/type="password"|type="email"/);
 assert.match(html,/120/);assert.match(html,/MD5/);assert.doesNotMatch(html,/No .*device fingerprinting/);
});
test('visitor can see the MD5 account identifier without a login form',()=>{
 const id='a'.repeat(32),html=trialHTML({}, {accountId:id},[],context);
 assert.match(html,new RegExp(id));assert.doesNotMatch(html,/type="password"/);
});
test('feedback is available without registration and its original text is safely displayed',()=>{
 const html=trialHTML({feedbackDraft:'draft'},null,[{id:'one',text:'<script>alert(1)</script>',category:'bug',status:'new',createdAt:'2026-11-07',history:[]}],context);
 assert.match(html,/id="trial-feedback"/);assert.match(html,/&lt;script/);assert.doesNotMatch(html,/<script>/);assert.match(html,/draft/);
 for(const [key,row] of Object.entries(trialCopy)){assert.equal(row.length,5,key);assert.ok(row.every(Boolean),key);}
});
