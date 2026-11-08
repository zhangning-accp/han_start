import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {submitFeedback,reviewFeedback} from '../src/trial.js';
import {correctableHTML,createCorrectionDraft} from '../public/inline-correction.js';
import {villageHTML} from '../public/onboarding-ui.js';
import {migrateOnboarding} from '../public/onboarding.js';
import {villageText} from '../public/village-copy.js';

const correction={key:'village.tea.meaning',original:'我要茶',displayed:'Incorrect tea translation',replacement:'Tôi muốn trà',reason:''};
const input=()=>({id:randomUUID(),category:'translation',text:'',language:'vi',mode:'starter',scene:'village:2',correction:{...correction}});
test('beginner drink cards offer correction directly beside Chinese, pinyin and translation',()=>{
 const s=migrateOnboarding({step:0});s.onboarding.step=2;
 const html=villageHTML(s,{V:k=>villageText(k,'vi'),esc:s=>s,R:(key,original,displayed)=>correctableHTML({key,original,displayed,language:'vi',scene:'village:2',mode:'starter'})});
 for(const key of ['phrase.tea.chinese','phrase.tea.pinyin','phrase.tea.meaning','phrase.water.meaning'])assert.ok(html.includes(key),key);
 assert.match(html,/data-drink="tea"/);assert.match(html,/data-audio="tea"/);
});
test('inline correction preserves the exact text and context, accepts optional explanation and never changes public content',()=>{
 const s={identities:[{id:'visitor',country:'VN'}],version:1,publicText:'Incorrect tea translation'},b=input();
 const f=submitFeedback(s,'visitor',b);
 assert.deepEqual(f.correction,correction);assert.equal(f.status,'new');assert.equal(f.country,'VN');assert.equal(f.language,'vi');
 assert.equal(submitFeedback(s,'visitor',b).id,f.id);assert.equal(s.feedback.length,1,'retry must not duplicate');
 reviewFeedback(s,f.id,{status:'resolved',severity:'normal',note:'Checked; content update follows',revision:1},'admin');
 assert.equal(s.publicText,'Incorrect tea translation');assert.equal(s.version,1);
 b.correction.replacement='changed';assert.equal(f.correction.replacement,correction.replacement,'stored snapshot must be detached');
});
test('text has an adjacent correction entry and escaped original text, with no navigation or nested form',()=>{
 const html=correctableHTML({...correction,displayed:'<img src=x>',language:'vi',scene:'village:2',mode:'starter'});
 assert.match(html,/&lt;img src=x&gt;/);assert.match(html,/data-correction/);assert.match(html,/textarea/);assert.match(html,/Tôi muốn trà|Đề xuất/);
 assert.doesNotMatch(html,/<img|<form|href=/);
});
test('failed correction keeps draft and retry ID; double submission is ignored and success does not replace original text',async()=>{
 let release,calls=[],fail=true;
 const target={...correction,language:'vi',scene:'village:2',mode:'starter'};
 const draft=createCorrectionDraft(target,{uuid:()=> 'request-1',send:b=>{calls.push(b);return new Promise((resolve,reject)=>{release=()=>fail?reject(Error('offline')):resolve({status:'new'});});}});
 draft.edit('replacement','Tôi muốn trà');const pending=draft.submit();await draft.submit();assert.equal(calls.length,1);release();await pending;
 assert.equal(draft.status,'error');assert.equal(draft.replacement,'Tôi muốn trà');fail=false;const retry=draft.submit();release();await retry;
 assert.equal(draft.status,'sent');assert.equal(calls[0].id,calls[1].id);assert.equal(target.displayed,correction.displayed);
});
test('invalid inline corrections leave feedback unchanged',()=>{
 for(const patch of [{replacement:''},{replacement:'Incorrect tea translation'},{replacement:'x'.repeat(601)},{key:'<script>'},{original:null},{displayed:''},{reason:'x'.repeat(301)}]){
  const s={identities:[{id:'visitor'}],feedback:[]},b=input();Object.assign(b.correction,patch);
  assert.throws(()=>submitFeedback(s,'visitor',b),/invalid_feedback/);assert.equal(s.feedback.length,0);
 }
});
