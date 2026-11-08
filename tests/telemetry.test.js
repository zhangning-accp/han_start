import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as telemetry from '../public/telemetry.js';
test('handwriting analytics count actions without sending strokes or the selected text',()=>{
 for(const feature of ['handwriting_open','handwriting_recognize','handwriting_select','handwriting_clear','handwriting_undo','handwriting_error'])assert.deepEqual(telemetry.productEvents(feature,null,null,{strokes:[[1,2]],text:'水'}),[{type:'feature',feature}]);
});
test('back, restart and resume are navigation uses, not new completed learning steps',()=>{
 for(const action of ['back','restart','resume']){
  assert.deepEqual(telemetry.productEvents('village_navigation',action),[{type:'feature',feature:'village_'+action}]);
  assert.ok(telemetry.behaviorFeatures['village_'+action]);
 }
});
test('product events preserve learning evidence and feature choices without free text',()=>{
 assert.equal(typeof telemetry.productEvents,'function');
 const events=telemetry.productEvents('practice_result','welcome','retry',{assistance:'guided',attempt:2,text:'private answer',name:'private name'});
 assert.deepEqual(events,[{type:'learning',taskId:'welcome',outcome:'retry',assistance:'guided',attempt:2}]);
 assert.deepEqual(telemetry.productEvents('public_work_visit',null,null,{workId:'private-id'}),[{type:'feature',feature:'public_work_visit'}]);
 assert.deepEqual(telemetry.productEvents('village_navigation','skip'),[{type:'feature',feature:'village_skip'},{type:'market_start'}]);
 assert.deepEqual(telemetry.productEvents('typed_secret',null,null,{text:'secret'}),[]);
});
test('usage areas distinguish learning, building, community and personal pages',()=>{
 assert.equal(typeof telemetry.usageArea,'function');
 assert.equal(telemetry.usageArea('town',{onboarding:{chapter:'village'}},null),'village');
 assert.equal(telemetry.usageArea('town',{onboarding:{chapter:'market'}},null),'market');
 assert.equal(telemetry.usageArea('town',{},'delayed'),'practice');
 assert.equal(telemetry.usageArea('build',{},null),'build');
 assert.equal(telemetry.usageArea('trial',{},null),'feedback');
});
test('automatic translation disclosure is not mistaken for a user asking for help',()=>{
 const callbacks={},summary={addEventListener:(name,fn)=>callbacks['summary:'+name]=fn},details={open:true,querySelector:()=>summary,addEventListener:(name,fn)=>callbacks[name]=fn};let calls=0;
 assert.equal(typeof telemetry.bindRequestedDisclosure,'function');
 telemetry.bindRequestedDisclosure(details,()=>calls++);
 callbacks.toggle();assert.equal(calls,0,'initial open and rerender are not requests');
 details.open=false;callbacks['summary:click']();callbacks.toggle();assert.equal(calls,0);
 details.open=true;callbacks['summary:click']();callbacks.toggle();assert.equal(calls,1);
 callbacks.toggle();assert.equal(calls,1);
});
