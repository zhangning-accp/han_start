import {handwritingHTML,bindHandwriting} from './handwriting-ui.js';
import {createWritingPractice} from './writing-practice.js';
import {writingTemplates} from './writing-data.js';
import {sampleStroke} from './handwriting.js';
export const writingLessons={hello:{character:'你',pinyin:'nǐ',meaning:'writeYou',phrase:'你好'},tea:{character:'茶',pinyin:'chá',meaning:'writeTea',phrase:'我要茶'},water:{character:'水',pinyin:'shuǐ',meaning:'writeWater',phrase:'我要水'},sit:{character:'坐',pinyin:'zuò',meaning:'writeSit',phrase:'请坐'},thanks:{character:'谢',pinyin:'xiè',meaning:'writeThanks',phrase:'谢谢'}};
export function writingLessonFor(v){return v.step===1?'hello':v.step===2?(v.selectedDrink||v.drink||'water'):v.step===4?'sit':'thanks';}
export function writingPracticeHTML({V},lesson='water'){
 const t=writingLessons[lesson];
 const guide=`<div class="writing-goal"><span>${V('writeGoal')}</span><strong lang="zh-CN">${t.character}</strong><span>${t.pinyin} · ${V(t.meaning)}</span><small>${V('writeFrom')}：${t.phrase}</small></div><div class="actions"><button type="button" id="writing-demo">${V('watchWriting')}</button><button type="button" id="writing-independent" disabled>${V('writingIndependent')}</button></div><p id="writing-stage">${V('writingTrace')}</p><p id="writing-guide">${V('writingTraceHint')}</p><div class="actions"><button type="button" id="writing-retry">${V('writingRetry')}</button><button type="button" id="writing-skip">${V('writingSkip')}</button></div>`;
 return handwritingHTML({V},{practice:true,guide,lesson});
}
export function bindWritingPractice({root=document,V,onUse=()=>{},isDisabled=()=>false,schedule=setTimeout,cancel=clearTimeout}){
 const $=s=>root.querySelector(s),lesson=$('#handwriting')?.dataset.writingLesson,t=writingLessons[lesson];if(!t)return ()=>{};
 const template=writingTemplates[t.character],p=createWritingPractice(template);let pad,disposed=false,demo=false,frame=0,timer,generation=0;
 const status=text=>{$('#handwriting-status').textContent=text;};
 function line(ctx,stroke,color,width){if(!stroke.length)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...stroke[0]);for(const point of stroke.slice(1))ctx.lineTo(...point);ctx.stroke();}
 function guide(ctx){
  if(demo){const index=Math.floor(frame/12),portion=frame%12;template.forEach((stroke,i)=>{if(i<index)line(ctx,stroke,'#8ba091',6);if(i===index)line(ctx,sampleStroke(stroke).slice(0,portion+1),'#b46539',7);});return;}
  if(p.stage!=='trace')return;
  template.forEach((stroke,i)=>{line(ctx,stroke,'#d7ddce',14);ctx.fillStyle='#557460';ctx.beginPath();ctx.arc(...stroke[0],4,0,Math.PI*2);ctx.fill();ctx.font='12px system-ui';ctx.fillText(String(i+1),stroke[0][0]+6,stroke[0][1]-6);});
 }
 const disposePad=bindHandwriting({root,V,target:$('#handwriting-result'),onUse,drawGuide:guide,hideInk:()=>demo,isDisabled:()=>isDisabled()||demo||p.finished||p.skipped,onReady:api=>{pad=api;}});
 function update(){
  $('#writing-independent').disabled=!p.traceDone||demo||isDisabled();$('#writing-skip').disabled=p.skipped||demo||p.finished;$('#writing-retry').disabled=demo;$('#writing-demo').textContent=V(demo?'stopWritingDemo':'watchWriting');
  $('#writing-stage').textContent=V(p.stage==='trace'?'writingTrace':'writingIndependent');$('#writing-guide').textContent=V(p.stage==='trace'?'writingTraceHint':'writingIndependentHint');pad.redraw();
 }
 function stop(){generation++;cancel(timer);demo=false;if(!disposed)update();}
 $('#writing-demo').onclick=()=>{if(disposed||isDisabled())return;if(demo){stop();return;}demo=true;const ticket=++generation;frame=0;onUse('writing_demo',lesson);update();const tick=()=>{if(disposed||!demo||ticket!==generation)return;frame++;if(frame>=template.length*12){stop();return;}pad.redraw();timer=schedule(tick,65);};timer=schedule(tick,65);};
 $('#recognize-ink').onclick=()=>{
  if(disposed||demo||isDisabled()||p.finished||p.skipped)return;
  const result=p.check(pad.ink());
  if(result.ok){$('#handwriting-result').value=t.character;status(V(p.stage==='trace'?'writingTraceDone':'writingIndependentDone'));onUse('writing_'+p.stage+'_complete',lesson);}
  else{const message=result.reason==='count'?V('writingCount')+' '+template.length:result.stroke?V('writingStroke')+' '+result.stroke+' — '+V(result.reason==='direction'?'writingDirection':'writingShape'):V(result.reason==='small'?'writingSmall':'writingEmpty');status(message);onUse('writing_'+p.stage+'_retry',lesson);}
  update();
 };
 $('#writing-independent').onclick=()=>{if(disposed||demo||isDisabled()||!p.independent())return;pad.clear();$('#handwriting-result').value='';status(V('writingIndependentHint'));update();};
 $('#writing-retry').onclick=()=>{if(disposed||demo||isDisabled())return;p.retry();pad.clear();$('#handwriting-result').value='';status(V(p.stage==='trace'?'writingTraceHint':'writingIndependentHint'));update();};
 $('#writing-skip').onclick=()=>{if(disposed||demo||isDisabled()||p.finished||p.skipped)return;p.skip();status(V('writingSkipped'));onUse('writing_'+p.stage+'_skip',lesson);update();};
 const onVisibility=()=>{if(root.hidden)stop();};root.addEventListener?.('visibilitychange',onVisibility);
 update();status(V('writingTraceHint'));
 return ()=>{disposed=true;cancel(timer);demo=false;root.removeEventListener?.('visibilitychange',onVisibility);disposePad();};
}
