import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handwritingHTML,bindHandwriting} from '../public/handwriting-ui.js';
import {villageHTML} from '../public/onboarding-ui.js';
import {migrateOnboarding} from '../public/onboarding.js';
const ctx={V:k=>k,esc:s=>String(s)};
test('a cancelled touch keeps earlier strokes and selected characters never submit the answer',async()=>{
 const nodes=new Map(),root={querySelector:id=>{if(!nodes.has(id))nodes.set(id,{value:'',replaceChildren(){this.children=[];},append(node){(this.children??=[]).push(node);},addEventListener(){},dispatchEvent(){}});return nodes.get(id);},querySelectorAll:()=>[]};
 const canvas=root.querySelector('#handwriting-pad');canvas.getContext=()=>new Proxy({},{get:()=>()=>{}});canvas.getBoundingClientRect=()=>({left:0,top:0,width:300,height:300});canvas.setPointerCapture=()=>{};
 const target={value:'我',dispatchEvent(){},focus(){}},previous=globalThis.document;
 globalThis.document={createElement:()=>({})};let captured;
 try{
  const dispose=bindHandwriting({root,V:k=>k,target,recognize:async strokes=>{captured=strokes;return [{character:'水'}];}});
  const event=(x,y)=>({clientX:x,clientY:y,pointerId:1,button:0,preventDefault(){}});
  canvas.onpointerdown(event(20,50));canvas.onpointerup(event(220,50));
  canvas.onpointerdown(event(50,20));canvas.onpointercancel();
  await root.querySelector('#recognize-ink').onclick();assert.equal(captured?.length,1,'a cancelled new stroke must not undo a completed stroke');
  const button=root.querySelector('#handwriting-candidates').children[0];button.onclick();assert.equal(target.value,'我水');assert.equal(root.querySelector('#recognize-ink').disabled,true);
  root.querySelector('#delete-handwritten').onclick();assert.equal(target.value,'我');dispose();button.onclick();assert.equal(target.value,'我');
 }finally{globalThis.document=previous;}
});
test('handwriting offers a writing pad, explicit recognition and editable candidate output',()=>{
 const html=handwritingHTML(ctx);
 assert.match(html,/<canvas[^>]*id="handwriting-pad"/);assert.match(html,/id="recognize-ink"/);
 assert.match(html,/id="undo-ink"/);assert.match(html,/id="clear-ink"/);assert.match(html,/id="handwriting-candidates"/);
 assert.match(html,/id="delete-handwritten"/);assert.match(html,/id="use-keyboard"/);
 assert.doesNotMatch(html,/autofocus|https:\/\//);
});
test('beginner phrases offer handwriting practice without adding a required writing gate',()=>{
 const s=migrateOnboarding({step:0});
 for(const step of [1,2,4,5]){s.onboarding.step=step;const html=villageHTML(s,ctx);assert.match(html,/id="handwriting-pad"/);assert.match(html,/id="handwriting-result"/);assert.doesNotMatch(html,/id="handwriting-result"[^>]*required/);}
 s.onboarding.step=0;assert.doesNotMatch(villageHTML(s,ctx),/id="handwriting-pad"/);
});
