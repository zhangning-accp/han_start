import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writingPracticeHTML,writingLessonFor,bindWritingPractice} from '../public/writing-practice-ui.js';
import {villageText} from '../public/village-copy.js';
import {villageHTML} from '../public/onboarding-ui.js';
import {migrateOnboarding} from '../public/onboarding.js';
import {writingTemplates} from '../public/writing-data.js';
const ctx={V:key=>villageText(key,'en')};
test('every beginner writing exercise is visible immediately and cannot be collapsed',()=>{
 const s=migrateOnboarding({step:0});
 for(const step of [1,2,4,5]){
  s.onboarding.step=step;const html=villageHTML(s,{...ctx,esc:s=>s});
  assert.match(html,/<section id="handwriting"/);
  assert.doesNotMatch(html,/<details id="handwriting"|<summary>Try handwriting/);
  assert.match(html,/<h3 id="handwriting-title">/);
 }
});
test('guided writing gives a target, meaning, demo, trace and independent stages and a skip option',()=>{
 const html=writingPracticeHTML(ctx,'water');
 assert.match(html,/data-writing-lesson="water"/);assert.match(html,/shuǐ/);assert.match(html,/id="writing-demo"/);assert.match(html,/id="writing-independent"[^>]*disabled/);assert.match(html,/id="writing-skip"/);assert.doesNotMatch(html,/data-handwriting-punctuation/);
 assert.equal(writingLessonFor({step:2,selectedDrink:'tea'}),'tea');assert.equal(writingLessonFor({step:1}),'hello');
});
test('village drink choice determines the writing target without blocking lesson continuation',()=>{
 const s=migrateOnboarding({step:0});s.onboarding.step=2;s.onboarding.selectedDrink='tea';
 const html=villageHTML(s,{...ctx,esc:s=>s});assert.match(html,/data-writing-lesson="tea"/);assert.doesNotMatch(html,/id="confirm-drink"[^>]*disabled/);
});
function fixture(){
 const nodes=new Map(),root={querySelector:id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},value:'',addEventListener(){},replaceChildren(){},dispatchEvent(){}});return nodes.get(id);},querySelectorAll:()=>[]};
 root.querySelector('#handwriting').dataset.writingLesson='water';
 const canvas=root.querySelector('#handwriting-pad');canvas.getContext=()=>new Proxy({},{get:()=>()=>{}});canvas.getBoundingClientRect=()=>({left:0,top:0,width:300,height:300});canvas.setPointerCapture=()=>{};
 const write=strokes=>{for(const stroke of strokes){const e=point=>({clientX:point[0],clientY:point[1],pointerId:1,button:0,preventDefault(){}});canvas.onpointerdown(e(stroke[0]));for(const p of stroke.slice(1,-1))canvas.onpointermove(e(p));canvas.onpointerup(e(stroke.at(-1)));}};
 return {root,get:root.querySelector,write};
}
test('actual pad distinguishes trace, independent and skip events, and disposed animation callbacks cannot restart',()=>{
 const {root,get,write}=fixture(),events=[],scheduled=[];
 const dispose=bindWritingPractice({root,V:k=>k,onUse:(...a)=>events.push(a),schedule:fn=>{scheduled.push(fn);return scheduled.length;},cancel(){}});
 write(writingTemplates['水']);get('#recognize-ink').onclick();assert.equal(get('#handwriting-result').value,'水');assert.equal(get('#writing-independent').disabled,false);assert.ok(events.some(e=>e[0]==='writing_trace_complete'));
 get('#writing-independent').onclick();assert.equal(get('#handwriting-result').value,'');get('#writing-skip').onclick();assert.ok(events.some(e=>e[0]==='writing_independent_skip'));assert.ok(!events.some(e=>e[0]==='writing_independent_complete'));
 get('#writing-retry').onclick();write(writingTemplates['水']);get('#recognize-ink').onclick();assert.ok(events.some(e=>e[0]==='writing_independent_complete'));
 get('#writing-demo').onclick();const callback=scheduled.at(-1);dispose();const count=scheduled.length;callback();assert.equal(scheduled.length,count);
});
test('a cancelled demo callback cannot advance a later replay',()=>{
 const {root,get}=fixture(),scheduled=[];const dispose=bindWritingPractice({root,V:k=>k,schedule:fn=>{scheduled.push(fn);return scheduled.length;},cancel(){}});
 get('#writing-demo').onclick();const stale=scheduled[0];get('#writing-demo').onclick();get('#writing-demo').onclick();const count=scheduled.length;stale();assert.equal(scheduled.length,count);dispose();
});
