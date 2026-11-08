import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trialHTML} from '../public/trial-ui.js';
import {reportHTML} from '../public/admin.js';
import * as admin from '../public/admin.js';
import {trialReport} from '../src/trial.js';
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const ctx={T:k=>k,esc};
test('optional survey separates contact consent and shows only configured no-charge proposals',()=>{
 const state={language:'en'};
 const empty=trialHTML(state,null,[],ctx,{research:{revision:0},offers:[]});
 assert.match(empty,/data-research-survey/);assert.match(empty,/name="interviewConsent"/);assert.doesNotMatch(empty,/name="interviewConsent"[^>]*checked/);assert.doesNotMatch(empty,/data-offer=/);
 const html=trialHTML(state,null,[],ctx,{research:{revision:1,survey:{note:'<script>'},interview:{contact:'a@example.test'}},offers:[{id:'abc',title:'<script>',benefits:'New scenes',amountMinor:500,currency:'USD',interval:'month',category:'learning',version:1}]});
 assert.match(html,/data-offer="abc"/);assert.match(html,/5\.00/);assert.match(html,/No charge/i);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.match(html,/withdraw/i);assert.match(html,/optional/i);
});
test('dashboard explains observation gaps and learning versus building returns',()=>{
 const r=trialReport({identities:[],activity:[],feedback:[]},{from:'2026-11-01',to:'2026-11-07'},Date.UTC(2026,10,7));const html=reportHTML(r)+reportHTML(r,'learning');
 assert.match(html,/首次可观察会话/);assert.match(html,/未观察/);assert.match(html,/学习回访/);assert.match(html,/仅布置/);assert.match(html,/最后观察/);
});
test('pricing and interview sections do not expose unrelated settings and translate response codes',()=>{
 const r={settings:{},offers:[],participants:[{id:'one',survey:{goal:'travel',reason:'difficult',currentTool:'<script>'},responses:{a:{choice:'interested',offer:{currency:'USD',amountMinor:500,interval:'month'}}}}]};
 const interviews=admin.researchAdminHTML(r,'feedback');
 assert.doesNotMatch(interviews,/data-configure-offer/);assert.match(interviews,/旅行/);assert.match(interviews,/太难/);assert.match(interviews,/感兴趣/);assert.match(interviews,/&lt;script/);
 assert.doesNotMatch(admin.researchAdminHTML(r,'pricing'),/自愿反馈与访谈/);
});
test('admin can configure separate disabled plans and sees preserved quote denominators and private interview details',()=>{
 assert.equal(typeof admin.researchAdminHTML,'function');
 const html=admin.researchAdminHTML({settings:{},participants:[],offers:[]});
 assert.match(html,/data-configure-offer="learning"/);assert.match(html,/data-configure-offer="decoration"/);assert.doesNotMatch(html,/name="enabled"[^>]*checked/);assert.match(html,/name="amount"/);assert.match(html,/name="benefits"/);
 const populated=admin.researchAdminHTML({settings:{},participants:[{id:'one',survey:{note:'<script>'},interview:{contact:'a@example.test'},responses:{}}],offers:[{id:'o',version:1,category:'learning',title:'Lessons',amountMinor:500,currency:'USD',interval:'month',viewed:3,interested:1,declined:1,unanswered:1}]});
 assert.match(populated,/a@example.test/);assert.match(populated,/&lt;script&gt;/);assert.match(populated,/33\.3%/);assert.match(populated,/不是付款/);
});
