import {test} from 'node:test';
import assert from 'node:assert/strict';
import {migrateOnboarding,advanceVillage,canBuild,buildHint,learningSummary} from '../public/onboarding.js';
const fresh=()=>({schema:1,step:0,events:[],results:{},help:{},attempts:{}});
const layout=()=>({name:'My corner',items:[{id:'a',type:'table',x:0,y:0,rotation:0,text:''},{id:'b',type:'plant',x:3,y:2,rotation:0,text:''}]});
test('back and restart preserve saved work, preferences, records and furthest progress',()=>{
 const original={...fresh(),id:'visitor',language:'vi',step:2,results:{welcome:true},events:[{type:'event_complete'}],workId:'work',buildDraft:layout(),onboarding:{version:1,chapter:'village',mode:'guided',step:3,name:'Mai',drink:'tea',completed:false}};
 const snapshot=structuredClone(original);
 let s=advanceVillage(original,{type:'back'});
 assert.equal(s.onboarding.step,2);assert.equal(s.onboarding.furthestStep,3);assert.equal(s.onboarding.selectedDrink,'tea');assert.equal(canBuild(s),true);
 s=advanceVillage(s,{type:'restart'});assert.equal(s.onboarding.step,0);assert.equal(s.onboarding.chapter,'village');assert.equal(s.onboarding.name,'Mai');assert.equal(s.onboarding.mode,'guided');assert.equal(s.onboarding.completed,false);
 for(const key of ['id','language','step','results','events','workId','buildDraft'])assert.deepEqual(s[key],original[key]);
 s=advanceVillage(s,{type:'back'});assert.equal(s.onboarding.step,0);
 s=migrateOnboarding(JSON.parse(JSON.stringify(s)));
 s=advanceVillage(s,{type:'resume'});assert.equal(s.onboarding.step,3);
 assert.deepEqual(original,snapshot);
});
test('restart from the market preserves completion and supports replay without bypassing new steps',()=>{
 let s=migrateOnboarding(fresh());s.onboarding={...s.onboarding,chapter:'market',step:5,completed:true};
 s=advanceVillage(s,{type:'restart'});assert.equal(s.onboarding.step,0);assert.equal(s.onboarding.completed,true);assert.equal(canBuild(s),true);
 s=advanceVillage(s,{type:'resume'});assert.equal(s.onboarding.step,5);
 let newUser=migrateOnboarding(fresh());newUser=advanceVillage(newUser,{type:'resume'});assert.equal(newUser.onboarding.step,0);
 newUser=advanceVillage(newUser,{type:'profile',name:'Ana',mode:'starter'});assert.equal(newUser.onboarding.furthestStep,1);
 newUser=advanceVillage(newUser,{type:'back'});newUser=advanceVillage(newUser,{type:'resume'});assert.equal(newUser.onboarding.step,1);
});
test('drink selections can be changed repeatedly without completing the lesson',()=>{
 let s=migrateOnboarding(fresh());s.onboarding.step=2;
 const original=structuredClone(s);
 s=advanceVillage(s,{type:'select_drink',value:'tea'});
 assert.equal(s.onboarding.step,2);assert.equal(s.onboarding.selectedDrink,'tea');assert.equal(s.onboarding.drink,undefined);
 s=advanceVillage(s,{type:'select_drink',value:'water'});
 assert.equal(s.onboarding.step,2);assert.equal(s.onboarding.selectedDrink,'water');assert.deepEqual(original.events,s.events);
 assert.throws(()=>advanceVillage(s,{type:'select_drink',value:'coffee'}),/village_action/);
 s=advanceVillage(s,{type:'drink',value:s.onboarding.selectedDrink});assert.equal(s.onboarding.step,3);assert.equal(s.onboarding.drink,'water');
 assert.equal(original.onboarding.selectedDrink,undefined);
});
test('new users enter the village; legacy progress and works survive migration and revisit',()=>{
 const next=migrateOnboarding(fresh());assert.equal(next.onboarding.chapter,'village');assert.equal(next.onboarding.mode,'starter');assert.equal(next.onboarding.step,0);
 const old={...fresh(),step:3,workId:'saved',buildDraft:layout(),events:[{type:'event_complete',taskId:'welcome'}]};
 const migrated=migrateOnboarding(old);assert.equal(migrated.onboarding.chapter,'market');assert.equal(migrated.onboarding.mode,'independent');
 const revisit=advanceVillage(migrated,{type:'revisit'});assert.equal(revisit.onboarding.chapter,'village');assert.equal(revisit.step,3);assert.deepEqual(revisit.buildDraft,old.buildDraft);assert.deepEqual(revisit.events,old.events);
 assert.deepEqual(migrateOnboarding(revisit),revisit);assert.equal(old.onboarding,undefined);
});
test('village progresses by valid actions, saves a real layout, and does not complete market tasks',()=>{
 let s=migrateOnboarding(fresh());assert.equal(canBuild(s),false);
 assert.throws(()=>advanceVillage(s,{type:'hello'}),/village_action/);
 assert.throws(()=>advanceVillage(s,{type:'profile',name:' ',mode:'starter'}),/village_profile/);
 s=advanceVillage(s,{type:'profile',name:'Nguyễn An',mode:'guided'});assert.equal(s.onboarding.step,1);assert.equal(s.onboarding.name,'Nguyễn An');
 s=advanceVillage(s,{type:'hello'});assert.equal(s.onboarding.step,2);
 assert.throws(()=>advanceVillage(s,{type:'drink',value:'coffee'}),/village_action/);
 s=advanceVillage(s,{type:'drink',value:'water'});assert.equal(canBuild(s),true);assert.equal(s.onboarding.step,3);
 assert.throws(()=>advanceVillage(s,{type:'saved',work:{id:'x',revision:1,layout:{name:'Empty',items:[]}}}),/village_layout/);
 assert.throws(()=>advanceVillage(s,{type:'saved',work:{layout:layout()}}),/village_layout/);
 const bad=layout();bad.items[1].x=0;bad.items[1].y=0;assert.throws(()=>advanceVillage(s,{type:'saved',work:{id:'x',revision:1,layout:bad}}));
 s=advanceVillage(s,{type:'saved',work:{id:'x',revision:1,layout:layout()}});assert.equal(s.onboarding.step,4);
 assert.throws(()=>advanceVillage(s,{type:'invite',words:['谢谢','请坐']}),/village_action/);
 s=advanceVillage(s,{type:'invite',words:['请坐','谢谢']});assert.equal(s.onboarding.step,5);assert.equal(s.onboarding.completed,true);assert.equal(s.step,0);assert.deepEqual(s.results,{});
 s=advanceVillage(s,{type:'market'});assert.equal(s.onboarding.chapter,'market');assert.equal(canBuild(s),true);
});
test('skip, resume and difficulty changes preserve progress without pretending completion',()=>{
 let s=advanceVillage(migrateOnboarding(fresh()),{type:'profile',name:'Ana',mode:'starter'});
 s=advanceVillage(s,{type:'skip'});assert.equal(s.onboarding.chapter,'market');assert.equal(s.onboarding.completed,false);
 s=advanceVillage(s,{type:'revisit'});assert.equal(s.onboarding.step,1);
 s=advanceVillage(s,{type:'mode',mode:'independent'});assert.equal(s.onboarding.mode,'independent');assert.equal(s.onboarding.step,1);
 assert.throws(()=>advanceVillage(s,{type:'mode',mode:'unknown'}),/village_profile/);
});
test('building hints follow layout and assisted successes are separate from independent ones',()=>{
 assert.equal(buildHint({items:[]}),'table');assert.equal(buildHint({items:[{type:'table'}]}),'plant');assert.equal(buildHint(layout()),'save');
 assert.deepEqual(learningSummary([{type:'village_action',result:'success',assistance:'chips'},{type:'first_answer',result:'success',assistance:'chips'},{type:'first_answer',result:'success',assistance:'independent'},{type:'first_answer',result:'retry',assistance:'independent'},{type:'first_answer',result:'success'}]),{assisted:2,independent:1});
});
