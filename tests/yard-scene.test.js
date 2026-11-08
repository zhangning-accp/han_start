import {test} from 'node:test';
import assert from 'node:assert/strict';
import {layoutMarkup,createBuilder} from '../public/builder-ui.js';
import {villageText} from '../public/village-copy.js';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const layout={name:'Existing work',items:[{id:'table',type:'table',x:3,y:0,rotation:90,text:''},{id:'plant',type:'plant',x:1,y:3,rotation:0,text:''},{id:'sign',type:'sign',x:0,y:0,rotation:0,text:'<script>'}]};
test('a saved layout renders a 2D yard with one object per item while retaining all keyboard placement targets',()=>{
 const before=structuredClone(layout),html=layoutMarkup(layout,esc,(_zh,en)=>en,true,'table');
 assert.match(html,/class="yard-background"/);assert.match(html,/data-object="table"/);assert.match(html,/data-object="plant"/);assert.match(html,/data-object="sign"/);
 assert.equal((html.match(/data-cell=/g)||[]).length,20);assert.equal((html.match(/data-object=/g)||[]).length,3);
 assert.match(html,/data-cell="3,1"[^>]*aria-pressed="true"/);assert.match(html,/&lt;script>/);assert.doesNotMatch(html,/<script>|<small>1,1/);assert.deepEqual(layout,before);
 const preview=layoutMarkup(layout,esc,(_zh,en)=>en);assert.doesNotMatch(preview,/data-cell=/);assert.match(preview,/data-object="table"/);
});
test('beginner building explains a front-door tea spot and offers a table instead of an abstract counter',()=>{
 const state={onboarding:{chapter:'village',step:3},buildDraft:{name:'Existing name',items:[]}};
 const builder=createBuilder({state,save(){},log(){},getWorks:()=>[],L:(_zh,en)=>en,V:k=>villageText(k,'en'),esc});
 const html=builder.html();assert.match(html,/front-door tea spot/);assert.match(html,/Invite Xiaoman for tea/);assert.match(html,/>Table</);assert.doesNotMatch(html,/YOUR PLOT|Counters take two cells/);assert.equal(state.buildDraft.name,'Existing name');
});
