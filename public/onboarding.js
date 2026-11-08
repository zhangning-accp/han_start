import {validateLayout} from './building.js';
// Village state is separate from existing market progress.
export const modes=['starter','guided','independent'];
export function villageProgress(v){return Math.max(v.furthestStep||0,v.step,v.completed?5:0);}
export function migrateOnboarding(state){
 const next=structuredClone(state);
 const returning=state.step>0||!!state.workId||Object.keys(state.attempts||{}).length>0;
 next.onboarding??={version:1,chapter:returning?'market':'village',mode:returning?'independent':'starter',step:0,name:'',completed:false};
 next.onboarding.furthestStep=villageProgress(next.onboarding);
 next.onboarding.selectedDrink??=next.onboarding.drink;
 if(![0,1,2].includes(next.onboarding.setupStep))next.onboarding.setupStep=0;
 return next;
}
export function advanceVillage(state,action){
 const next=migrateOnboarding(state),v=next.onboarding;
 if(action.type==='mode'){
  if(!modes.includes(action.mode))throw Error('village_profile');
  v.mode=action.mode;return next;
 }
 if(action.type==='skip'){v.chapter='market';return next;}
 if(action.type==='revisit'){v.chapter='village';return next;}
 if(action.type==='restart'){v.chapter='village';v.step=0;v.setupStep=0;return next;}
 if(action.type==='resume'){v.chapter='village';v.step=v.furthestStep;return next;}
 if(action.type==='market'&&v.completed){v.chapter='market';return next;}
 if(v.chapter!=='village')throw Error('village_action');
 if(v.step===0&&['setup_next','setup_back'].includes(action.type)){
  if(action.type==='setup_next'&&v.setupStep===0&&!v.name?.trim())throw Error('village_profile');
  v.setupStep=Math.max(0,Math.min(2,v.setupStep+(action.type==='setup_next'?1:-1)));return next;
 }
 if(action.type==='back'){v.step=Math.max(0,v.step-1);return next;}
 if(v.step===2&&action.type==='select_drink'&&['water','tea'].includes(action.value)){
  v.selectedDrink=action.value;return next;
 }
 if(v.step===0&&action.type==='profile'){
  const name=typeof action.name==='string'?action.name.trim():'';
  if(!name||name.length>24||!modes.includes(action.mode))throw Error('village_profile');
  v.name=name;v.mode=action.mode;
 }else if(v.step===1&&action.type==='hello'){
  // A click is assisted practice, never an independent language assessment.
 }else if(v.step===2&&action.type==='drink'&&['water','tea'].includes(action.value)){
  v.drink=action.value;
 }else if(v.step===3&&action.type==='saved'){
  if(!action.work?.id||!Number.isInteger(action.work.revision)||action.work.revision<1)throw Error('village_layout');
  const layout=validateLayout(action.work.layout);
  if(buildHint(layout)!=='save')throw Error('village_layout');
  v.workId=action.work.id;
 }else if(v.step===4&&action.type==='invite'&&JSON.stringify(action.words)===JSON.stringify(['请坐','谢谢'])){
  v.completed=true;
 }else throw Error('village_action');
 v.step++;v.furthestStep=Math.max(v.furthestStep,v.step);return next;
}
export function canBuild(state){return state.step>=4||!!state.onboarding&&villageProgress(state.onboarding)>=3;}
export function buildHint(layout){
 if(!layout.items.some(i=>i.type==='table'))return 'table';
 if(!layout.items.some(i=>i.type==='plant'))return 'plant';
 return 'save';
}
export function learningSummary(events){
 const summary={assisted:0,independent:0};
 for(const e of events){
  if(!['village_action','first_answer'].includes(e.type)||e.result!=='success')continue;
  if(e.assistance==='independent')summary.independent++;
  else if(e.assistance)summary.assisted++;
 }
 return summary;
}
