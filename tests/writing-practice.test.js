import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkWriting,createWritingPractice} from '../public/writing-practice.js';
import {productEvents} from '../public/telemetry.js';
import {acceptEvents} from '../src/trial.js';
import {randomUUID} from 'node:crypto';
const cross=[[[40,140],[140,140],[260,140]],[[150,40],[150,150],[150,260]]];
test('writing requires the target stroke count, shape and direction, not arbitrary ink',()=>{
 assert.equal(checkWriting([],cross,'trace').ok,false);
 assert.equal(checkWriting(cross.slice(0,1),cross,'trace').reason,'count');
 assert.equal(checkWriting(cross.slice().reverse(),cross,'trace').ok,false);
 assert.equal(checkWriting(cross.map(s=>s.slice().reverse()),cross,'trace').ok,false);
 assert.equal(checkWriting([[[0,0],[299,299]],[[299,0],[0,299]]],cross,'trace').ok,false);
 assert.equal(checkWriting(cross.map(s=>s.map(([x,y])=>[x+3,y-2])),cross,'trace').ok,true);
 assert.equal(checkWriting(cross.map(s=>s.map(([x,y])=>[x*.75+25,y*.75+30])),cross,'independent').ok,true);
});
test('writing analytics separate tracing, independent work and skipping, storing target IDs but never ink',()=>{
 const now=Date.now(),s={identities:[{id:'v',analytics:true,country:'BR'}]};
 for(const feature of ['writing_demo','writing_trace_complete','writing_independent_complete','writing_trace_skip','writing_independent_skip','writing_trace_retry','writing_independent_retry']){
  const events=productEvents(feature,'water',null,{ink:['private'],text:'private'});assert.equal(events[0]?.feature,feature);assert.equal(events[0]?.lesson,'water');assert.ok(!JSON.stringify(events).includes('private'));
  const event={...events[0],id:randomUUID(),sessionId:randomUUID(),at:new Date(now).toISOString(),scene:'village:2',mode:'starter',language:'pt-BR',timezone:'',device:'mobile'};
  assert.equal(acceptEvents(s,'v',[event],now).accepted,1);assert.equal(s.activity.at(-1).lesson,'water');
  assert.throws(()=>acceptEvents(s,'v',[{...event,id:randomUUID(),lesson:'private'}],now),/invalid_event/);
 }
});
test('trace and independent completion are distinct; skipping cannot count as completion',()=>{
 const p=createWritingPractice(cross);assert.equal(p.independent(),false);
 assert.equal(p.check([]).ok,false);assert.equal(p.traceDone,false);
 assert.equal(p.check(cross).ok,true);assert.equal(p.traceDone,true);assert.equal(p.independentDone,false);
 assert.equal(p.independent(),true);assert.equal(p.stage,'independent');p.skip();assert.equal(p.independentDone,false);
 p.retry();assert.equal(p.check(cross).ok,true);assert.equal(p.independentDone,true);
});
