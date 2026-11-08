import {test} from 'node:test';
import assert from 'node:assert/strict';
import {villageHTML,practicePlan,practiceHTML} from '../public/onboarding-ui.js';
import {migrateOnboarding} from '../public/onboarding.js';
import {tasks,evaluate} from '../public/content.js';
import {createBuilder} from '../public/builder-ui.js';
import {villageCopy,villageText} from '../public/village-copy.js';
const context={V:key=>key,esc:s=>String(s).replaceAll('<','&lt;').replaceAll('"','&quot;')};
test('phrase lessons separate replay and slow audio from choosing and continuing',()=>{
 const s=migrateOnboarding({step:0});s.onboarding.step=1;
 let html=villageHTML(s,context);
 assert.match(html,/data-audio="hello" data-speed="1"/);assert.match(html,/data-audio="hello" data-speed="0.75"/);
 assert.match(html,/<button[^>]*data-village="hello"[^>]*>continueLesson/);
 s.onboarding.step=2;html=villageHTML(s,context);
 assert.match(html,/id="confirm-drink"[^>]*disabled/);
 for(const phrase of ['tea','water'])assert.match(html,new RegExp(`data-audio="${phrase}"`));
 s.onboarding.selectedDrink='tea';html=villageHTML(s,context);
 assert.match(html,/data-drink="tea" aria-pressed="true"/);assert.doesNotMatch(html,/id="confirm-drink"[^>]*disabled/);
 s.onboarding.step=5;html=villageHTML(s,context);
 for(const phrase of ['hello','tea','water','sit','thanks'])assert.match(html,new RegExp(`data-audio="${phrase}"`));
});
test('village shows only the current action; Chinese keyboard is never required',()=>{
 const s=migrateOnboarding({step:0});
 let html=villageHTML(s,context);assert.match(html,/id="village-profile"/);assert.match(html,/maxlength="24"/);s.onboarding.setupStep=1;assert.match(villageHTML(s,context),/value="starter"/);assert.doesNotMatch(html,/data-drink/);
 s.onboarding.step=1;html=villageHTML(s,context);assert.match(html,/你好/);assert.match(html,/Nǐ hǎo/);assert.doesNotMatch(html,/<textarea/);
 s.onboarding.step=2;html=villageHTML(s,context);assert.match(html,/data-drink="water"/);assert.match(html,/data-drink="tea"/);
 s.onboarding.step=3;html=villageHTML(s,context);assert.match(html,/data-go="build"/);assert.doesNotMatch(html,/data-invite/);
 s.onboarding.step=4;html=villageHTML(s,context);assert.match(html,/data-invite="请坐"/);assert.match(html,/data-invite="谢谢"/);assert.doesNotMatch(html,/<textarea/);
 s.onboarding.step=5;s.onboarding.name='<img src=x>';html=villageHTML(s,context);assert.match(html,/data-village="market"/);assert.doesNotMatch(html,/<img src=x>/);
});
test('all village instructions are available in each pilot language',()=>{
 for(const [key,row] of Object.entries(villageCopy)){
  assert.equal(row.length,5,key);assert.ok(row.every(s=>typeof s==='string'&&s.trim()),key);
  for(const lang of ['vi','id','pt-BR'])assert.notEqual(villageText(key,lang),key);
 }
});
test('intro builder guides one action at a time and advances only after successful server save',async()=>{
 const state={onboarding:{chapter:'village',step:3},buildDraft:{name:'Corner',items:[]}};
 let saved=null,fail=true;const events=[];
 const builder=createBuilder({state,save(){},log(...args){events.push(args);},api:async()=>{if(fail)throw Error('offline');return {id:'work',revision:1,layout:structuredClone(state.buildDraft)};},refresh:async()=>{},getWorks:()=>[],L:(zh,en)=>en,V:key=>key,esc:context.esc,notify(){},render(){},share(){},onSaved:w=>{saved=w;}});
 const html=builder.html();assert.match(html,/tableHint/);assert.doesNotMatch(html,/data-tool="sign"/);assert.doesNotMatch(html,/请把招牌/);
 state.buildDraft.items=[{id:'a',type:'table',x:0,y:0,rotation:0,text:''}];assert.match(builder.html(),/plantHint/);
 state.buildDraft.items.push({id:'b',type:'plant',x:3,y:2,rotation:0,text:''});assert.match(builder.html(),/saveHint/);
 const nodes=new Map();const previous=globalThis.document;
 globalThis.document={querySelectorAll:()=>[],querySelector:id=>{if(!nodes.has(id))nodes.set(id,{addEventListener(){}});return nodes.get(id);}};
 try{
  builder.bind();const button=nodes.get('#save-work');await button.onclick({currentTarget:button});assert.equal(saved,null);assert.equal(state.workId,undefined);assert.equal(button.disabled,false);assert.ok(events.some(e=>e[0]==='operation_failure'&&e[3].operation==='build_save'));
  fail=false;await button.onclick({currentTarget:button});assert.equal(saved.id,'work');assert.equal(saved.layout.items.length,2);assert.equal(state.workRevision,1);
 }finally{globalThis.document=previous;}
});
test('market supports chips and sentence frames while independent checks stay unaided',()=>{
 for(const task of tasks){
  const starter=practicePlan(task,'starter','Ana');assert.ok(starter.chips.length>=2);assert.equal(evaluate(task.id,starter.chips.map(c=>c.text).join('')).ok,true,task.id);
  const guided=practicePlan(task,'guided','Ana');assert.ok(guided.options.length>=2);assert.equal(evaluate(task.id,guided.before+guided.options[0].text+guided.after).ok,true,task.id);
  assert.match(practiceHTML(task,'starter',false,context,'Ana'),/data-chip/);
  assert.match(practiceHTML(task,'guided',false,context,'Ana'),/id="sentence-choice"/);
  assert.equal(practiceHTML(task,'starter',true,context),'');assert.equal(practiceHTML(task,'independent',false,context),'');
 }
 for(const name of ["D'Ávila",'A'.repeat(24),'🌿']){
  const plan=practicePlan(tasks[0],'starter',name);
  assert.equal(evaluate('welcome',plan.chips.map(c=>c.text).join('')).ok,true,'Any accepted nickname must have a usable beginner reply');
 }
});
