import {createRecognizer,createHandwritingSession} from './handwriting.js';
let recognizerPromise;
async function loadRecognizer(){
 if(!recognizerPromise)recognizerPromise=fetch('/handwriting-data/medians.json').then(r=>{if(!r.ok)throw Error('load');return r.json();}).then(data=>createRecognizer(data.characters)).catch(e=>{recognizerPromise=null;throw e;});
 return recognizerPromise;
}
export function handwritingHTML({V},{practice=false,guide='',lesson=''}={}){
 const tag=practice?'section':'details',heading=practice?'h3':'summary';
 return `<${tag} id="handwriting" class="handwriting" ${lesson?`data-writing-lesson="${lesson}"`:""} ${practice?'aria-labelledby="handwriting-title"':'open'}><${heading} id="handwriting-title">${V(practice?'writePractice':'handwriting')}</${heading}>${guide||`<p>${V('handwritingHint')}</p>`}<canvas id="handwriting-pad" width="300" height="300" aria-label="${V('writingPad')}"></canvas><div class="actions"><button type="button" id="undo-ink" disabled>${V('undoStroke')}</button><button type="button" id="clear-ink" disabled>${V('clearInk')}</button><button type="button" id="recognize-ink" class="primary" disabled>${V(guide?'checkWriting':'recognizeInk')}</button></div><p id="handwriting-status" role="status" aria-live="polite">${V('writeOne')}</p><div id="handwriting-candidates" class="handwriting-candidates" aria-label="${V('chooseCharacter')}"></div>${practice?`<label for="handwriting-result">${V('writtenText')}</label><input id="handwriting-result" readonly maxlength="240" lang="zh-CN">`:''}${guide?'':`<div class="actions"><button type="button" id="delete-handwritten">${V('deleteCharacter')}</button>${['，','。','？'].map(c=>`<button type="button" data-handwriting-punctuation="${c}" aria-label="${V('addPunctuation')} ${c}">${c}</button>`).join('')}${practice?'':`<button type="button" id="use-keyboard">${V('useKeyboard')}</button>`}</div>`}<small>${V(guide?'writingLimit':'handwritingPrivacy')}</small></${tag}>`;
}
export function bindHandwriting({root=document,V,target,onUse=()=>{},recognize=async strokes=>(await loadRecognizer())(strokes),isDisabled=()=>false,drawGuide=()=>{},hideInk=()=>false,onReady=()=>{},onInk=()=>{}}){
 const $=s=>root.querySelector(s),canvas=$('#handwriting-pad');if(!canvas||!target)return ()=>{};
 const session=createHandwritingSession(),ctx=canvas.getContext('2d'),candidates=$('#handwriting-candidates');
 let pointer=null,ink=[],disposed=false,request=0,working=false;
 const blocked=()=>disposed||target.disabled||isDisabled();
 const status=key=>{$('#handwriting-status').textContent=V(key);};
 function update(){
  $('#undo-ink').disabled=$('#clear-ink').disabled=blocked()||session.strokes.length===0||pointer!==null;
  $('#recognize-ink').disabled=blocked()||working||session.strokes.length===0||pointer!==null;
 }
 function draw(){
  ctx.clearRect(0,0,300,300);ctx.strokeStyle='#d8dfcf';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(150,0);ctx.lineTo(150,300);ctx.moveTo(0,150);ctx.lineTo(300,150);ctx.stroke();ctx.setLineDash([]);
  drawGuide(ctx);
  ctx.strokeStyle='#254f42';ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';
  for(const stroke of (hideInk()?[]:[...session.strokes,ink])){if(!stroke.length)continue;ctx.beginPath();ctx.moveTo(...stroke[0]);for(const p of stroke.slice(1))ctx.lineTo(...p);ctx.stroke();}
 }
 function clearCandidates(){request++;working=false;candidates.replaceChildren();status('writeOne');}
 function point(e){const box=canvas.getBoundingClientRect();return [Math.max(0,Math.min(300,(e.clientX-box.left)*300/box.width)),Math.max(0,Math.min(300,(e.clientY-box.top)*300/box.height))];}
 canvas.onpointerdown=e=>{
  if(blocked()||pointer!==null||e.isPrimary===false||e.button!==0)return;
  e.preventDefault();pointer=e.pointerId;ink=[point(e)];clearCandidates();canvas.setPointerCapture(pointer);draw();update();
 };
 canvas.onpointermove=e=>{if(e.pointerId!==pointer)return;e.preventDefault();const p=point(e);if(ink.length<510&&Math.hypot(p[0]-ink.at(-1)[0],p[1]-ink.at(-1)[1])>1)ink.push(p);draw();};
 canvas.onpointerup=e=>{if(e.pointerId!==pointer)return;ink.push(point(e));const added=session.addStroke(ink);ink=[];pointer=null;draw();update();onInk(session.strokes);if(!added)status('inkLimit');};
 canvas.onpointercancel=()=>{pointer=null;ink=[];clearCandidates();draw();update();};
 $('#undo-ink').onclick=()=>{if(blocked())return;session.undo();clearCandidates();draw();update();onInk(session.strokes);onUse('handwriting_undo');};
 $('#clear-ink').onclick=()=>{if(blocked())return;session.clear();clearCandidates();draw();update();onInk(session.strokes);onUse('handwriting_clear');};
 const append=character=>{if(blocked())return false;if(target.value.length+character.length>240){status('textLimit');return false;}target.value+=character;target.dispatchEvent(new Event('input',{bubbles:true}));return true;};
 $('#recognize-ink').onclick=async()=>{
  if(blocked()||working||pointer!==null||!session.strokes.length)return;
  working=true;const ticket=++request;status('recognizingInk');update();onUse('handwriting_recognize');
  try{
   await session.recognize(recognize);if(disposed||ticket!==request)return;
   candidates.replaceChildren();status(session.candidates.length?'chooseCharacter':'noCharacter');
   for(const candidate of session.candidates){
    const button=document.createElement('button');button.type='button';button.lang='zh-CN';button.textContent=candidate.character;
    button.onclick=()=>{if(!session.candidates.some(c=>c.character===candidate.character)||!append(candidate.character))return;session.commit(candidate.character);clearCandidates();draw();update();status('characterAdded');onUse('handwriting_select');};candidates.append(button);
   }
  }catch{if(!disposed&&ticket===request){status('handwritingError');onUse('handwriting_error');}}
  finally{if(!disposed&&ticket===request){working=false;update();}}
 };
 if($('#delete-handwritten'))$('#delete-handwritten').onclick=()=>{if(blocked())return;target.value=Array.from(target.value).slice(0,-1).join('');target.dispatchEvent(new Event('input',{bubbles:true}));};
 root.querySelectorAll('[data-handwriting-punctuation]').forEach(b=>b.onclick=()=>append(b.dataset.handwritingPunctuation));
 const keyboard=$('#use-keyboard');if(keyboard)keyboard.onclick=()=>{if(blocked())return;target.readOnly=!target.readOnly;keyboard.textContent=V(target.readOnly?'useKeyboard':'useHandwriting');if(!target.readOnly)target.focus();};
 const details=$('#handwriting');details.addEventListener('toggle',()=>{if(details.open)onUse('handwriting_open');});
 onReady({ink:()=>session.strokes,redraw:()=>{draw();update();},clear:()=>{session.clear();clearCandidates();draw();update();}});
 draw();update();
 return ()=>{disposed=true;request++;session.clear();};
}
