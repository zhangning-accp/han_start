import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {productEvents} from '../public/telemetry.js';
import {VERSION} from '../public/content.js';
import {acceptEvents,trialReport,submitFeedback} from '../src/trial.js';
import {reportCSV} from '../src/trial-http.js';
const t=Date.UTC(2026,10,1),day=86400000;
test('repeat listening preserves the phrase and current version without free text',()=>{
 assert.deepEqual(productEvents('audio_listen','tea',null,{text:'secret'}),[{type:'feature',feature:'audio_listen',lesson:'tea'}]);
 const id=randomUUID(),s={identities:[{id,analytics:true,country:'OTHER'}]};
 const event={id:randomUUID(),sessionId:randomUUID(),type:'feature',feature:'audio_slow',lesson:'water',version:VERSION,scene:'village:2',language:'en',mode:'starter',device:'mobile',at:new Date(t).toISOString()};
 acceptEvents(s,id,[event],t);assert.equal(s.activity[0].lesson,'water');assert.equal(s.activity[0].version,VERSION);
 assert.throws(()=>acceptEvents(s,id,[{...event,id:randomUUID(),lesson:'private text'}],t),/invalid_event/);
 const f=submitFeedback(s,id,{id:randomUUID(),category:'idea',text:'More content',language:'en',mode:'starter',scene:'village'},t);assert.equal(f.version,VERSION);
});
test('overall, learning and building-only returns have distinct exact-day denominators',()=>{
 const ids=[randomUUID(),randomUUID(),randomUUID()];
 const s={identities:ids.map(id=>({id,analytics:true,country:'OTHER',createdAt:new Date(t).toISOString()})),activity:[]};
 const add=(id,kind,task)=>acceptEvents(s,id,productEvents(kind,task).map(e=>({...e,id:randomUUID(),sessionId:randomUUID(),at:new Date(t+day+1).toISOString(),area:kind==='build_edit'?'build':'village',scene:'village:2',language:'en',mode:'starter',device:'desktop'})),t+day+2);
 add(ids[0],'build_edit');add(ids[1],'audio_listen','tea');add(ids[2],'build_edit');add(ids[2],'audio_slow','water');
 const r=trialReport(s,{from:'2026-11-01',to:'2026-11-03'},t+2*day);
 assert.equal(r.retention.d1.returned,3);assert.equal(r.learningRetention.d1.returned,2);assert.equal(r.buildOnlyRetention.d1.returned,1);
 assert.equal(r.learningRetention.d1.eligible,3);assert.equal(r.audioLessons.find(x=>x.lesson==='tea').uses,1);
 const build=trialReport(s,{from:'2026-11-01',to:'2026-11-03',area:'build'},t+2*day);
 assert.equal(build.buildOnlyRetention.d1.returned,1,'filtering a view cannot turn mixed learners into building-only returns');
 const csv=reportCSV(r);assert.match(csv,/learning_returned/);assert.match(csv,/first_observed/);assert.match(csv,/audio_lesson/);
 s.identities[1].analyticsInterrupted=true;
 assert.equal(trialReport(s,{from:'2026-11-01',to:'2026-11-03'},t+2*day).learningRetention.d1.eligible,2);
});
test('offline events from the previous client do not poison newer batches or invent phrase/version data',()=>{
 const id=randomUUID(),s={identities:[{id,analytics:true,country:'OTHER'}]},event={id:randomUUID(),sessionId:randomUUID(),type:'feature',feature:'audio_listen',scene:'village:1',language:'en',mode:'starter',device:'mobile',at:new Date(t).toISOString()};
 assert.doesNotThrow(()=>acceptEvents(s,id,[event],t));assert.equal(s.activity[0].lesson,undefined);assert.equal(s.activity[0].version,'unknown');
});
