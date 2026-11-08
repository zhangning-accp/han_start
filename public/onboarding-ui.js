import {writingPracticeHTML,writingLessonFor} from './writing-practice-ui.js';
import {villageText,achievementFacts} from './village-copy.js';
import {modes,buildHint,villageProgress} from './onboarding.js';
import {evaluate} from './content.js';
export const villageSteps=['setup','hello','drink','build','invite'];
export function bindSetupProfile(root,{state,save,onAction,saveSettings,errorText}){
 const $=s=>root.querySelector(s),form=$('#village-profile');if(!form)return;
 $('#trial-country')?.addEventListener('change',()=>{state.onboarding.setupCountry=$('#trial-country').value;save();});
 $('#trial-consent')?.addEventListener('change',()=>{state.onboarding.setupAnalytics=$('#trial-consent').checked;save();});
 let saving=false;
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(saving)return;
  const v=state.onboarding;
  if(v.setupStep<2){
   if(v.setupStep===0&&!v.name.trim()){$('#nickname').value='';$('#nickname').reportValidity();return;}
   onAction({type:'setup_next'});return;
  }
  saving=true;const button=e.submitter;button.disabled=true;$('#setup-error').textContent='';
  try{await saveSettings();onAction({type:'profile',name:v.name.trim(),mode:v.mode});}
  catch{$('#setup-error').textContent=errorText;button.disabled=false;}
  finally{saving=false;}
 });
}
export function navigationHTML(state,tab,busy,{V}){
 const button=(id,label)=>`<button data-tab="${id}" class="${tab===id?'active':''}" ${busy?'disabled':''}>${V(label)}</button>`;
 return button('town','learnNav')+button('journal','progressNav')+button('culture','cultureNav')+(state.onboarding.completed||state.step>=4?`<details class="optional-nav"><summary>${V('optionalNav')}</summary><div>${button('build','personalCorner')}${button('board','visitNav')}</div></details>`:'');
}
export function progressHTML(state,{V}){
 return `<section class="paper"><h2>${V('progressNav')}</h2><p>${V('progressHint')}</p><div class="chapter-progress"><article><h3>${V('chapter1')}</h3><strong>${villageProgress(state.onboarding)} / 5</strong><progress max="5" value="${villageProgress(state.onboarding)}" aria-label="${V('chapter1')}"></progress></article><article><h3>${V('chapter2')}</h3><strong>${state.step} / 5</strong><progress max="5" value="${state.step}" aria-label="${V('chapter2')}"></progress></article></div><button class="primary" data-go="town">${V('resumeLesson')} →</button> <button data-village="revisit">${V(state.onboarding.completed?'reviewPhrases':'revisit')}</button></section>`;
}
export function modeOptions(mode,V){return modes.map(id=>`<option value="${id}" ${mode===id?'selected':''}>${V(id)}</option>`).join('');}
export function learningControls(state,{V}){
 const v=state.onboarding;
 const replay=`<div class="replay-controls"><div class="actions">${v.chapter==='village'?`<button type="button" data-village="back" ${v.step===0?'disabled':''}>← ${V('previousStep')}</button>`:''}<button type="button" data-village="restart">↺ ${V('restartVillage')}</button>${v.chapter==='village'&&v.step<villageProgress(v)?`<button type="button" data-village="resume">${V('resumeVillage')} →</button>`:''}</div><small>${V('replayHint')}</small></div>`;
 return replay+`<details class="learning-options"><summary>${V('options')}</summary><label for="learning-mode">${V('difficulty')}</label><select id="learning-mode">${modeOptions(state.onboarding.mode,V)}</select><p>${V('modeHint')}</p><button data-village="revisit">${V('revisit')}</button> <button data-village="skip">${V('skip')}</button><small>${V('skipHint')}</small></details>`;
}
export function villageHTML(state,{V,esc,profile='',R=(_key,_original,text)=>esc(text)}){
 const words=key=>R("village."+key,villageText(key,"zh"),V(key));
 const v=state.onboarding;
 const phrases={hello:['你好','Nǐ hǎo','helloMeaning'],tea:['🍵 我要茶','Wǒ yào chá','teaRequest'],water:['💧 我要水','Wǒ yào shuǐ','waterRequest'],sit:['请坐','Qǐng zuò','sit'],thanks:['谢谢','Xièxie','thanks']};
 const phrase=(id,action='')=>{const [text,pinyin,meaning]=phrases[id];return `<article class="phrase-card"><strong lang="zh-CN">${R("phrase."+id+".chinese",text,text)}</strong><span>${R("phrase."+id+".pinyin",text,pinyin)}</span><small>${R("phrase."+id+".meaning",text,V(meaning))}</small><div class="audio-actions">${[1,0.75].map(speed=>`<button type="button" data-audio="${id}" data-speed="${speed}" aria-label="${V(speed===1?'listen':'listenSlow')} · ${text}">${speed===1?'▶':'◷'} ${V(speed===1?'listen':'listenSlow')}</button>`).join('')}</div>${action}</article>`;};
 const audioStatus=`<p id="audio-status" class="audio-status" role="status" aria-live="polite">${V('repeatHint')}</p><button type="button" id="stop-audio" hidden>${V('stopAudio')}</button>`;
 let action='';
 if(v.step===0){
  const step=v.setupStep||0;
  action=`<p class="setup-progress">${V('setupProgress')} · ${step+1} / 3</p><form id="village-profile">${step===0?`<label for="nickname">${V('nickname')}</label><input id="nickname" autocomplete="nickname" maxlength="24" required value="${esc(v.name)}"><small>${V('nameHint')}</small>`:step===1?`<label for="start-mode">${V('difficulty')}</label><select id="start-mode">${modeOptions(v.mode,V)}</select><p>${V('modeHint')}</p>`:profile}<p id="setup-error" role="status"></p><div class="setup-actions">${step?`<button type="button" data-village="setup_back">← ${V('previousStep')}</button>`:''}<button class="primary">${V(step===2?'begin':'setupNext')} →</button></div></form>`;
 }

 if(v.step===1)action=`<p>${words('helloHint')}</p>${phrase('hello')}${audioStatus}<button class="primary full" data-village="hello">${V('continueLesson')} →</button>`;
 if(v.step===2)action=`<p class="village-response">👋 ${V('greeted')}</p><p>${words('drinkHint')}</p><div class="drink-options">${['tea','water'].map(id=>phrase(id,`<button type="button" class="phrase-select" data-drink="${id}" aria-pressed="${v.selectedDrink===id}">${V(v.selectedDrink===id?'selected':'chooseDrink')} · ${V(id)}</button>`)).join('')}</div>${audioStatus}<button id="confirm-drink" class="primary full" ${v.selectedDrink?'':'disabled'}>${V('continueLesson')} →</button>`;
 if(v.step===3)action=`<p class="village-response">${v.drink==='tea'?'🍵':'💧'} ${V('delivered')}</p><p>${words('buildHint')}</p><button class="primary full" data-go="build">${V('enterBuild')} →</button>`;
 if(v.step===4)action=`<p class="village-response">✓ ${V('savedCorner')}</p><p>${words('inviteHint')}</p><div class="drink-options">${['sit','thanks'].map(id=>phrase(id,`<button type="button" data-invite="${phrases[id][0]}">${V('addPhrase')} · ${phrases[id][0]}</button>`)).join('')}</div>${audioStatus}<output id="invitation" class="invitation" aria-live="polite"></output><p id="invite-feedback" role="status"></p><div class="actions"><button id="clear-invite">${V('clear')}</button><button id="send-invite" class="primary" disabled>${V('sendInvite')} →</button></div>`;
 if(v.step===5)action=`<p class="village-response">✦ ${esc(v.name)} · ${V('done')}</p><p>${words('finish')}</p><details class="phrase-review"><summary>${V('reviewPhrases')}</summary><div class="drink-options">${Object.keys(phrases).map(id=>phrase(id)).join('')}</div>${audioStatus}</details><p>${words('marketHint')}</p><button class="primary full" data-village="market">${V('nextChapter')} →</button><button data-go="build" class="full">${V('build')}</button>`;
 return `<div class="village-layout ${v.step===0?'setup-layout':'lesson-layout'}"><div class="village-scene"><div class="section-label">QINGHE STREET <span>01</span></div><div class="village-illustration" aria-hidden="true"><div class="sun"></div><div class="little-house"><span>青禾街</span><div>🚪</div></div><div class="garden">🌿 🪑 🍵</div></div><h2>${V('title')}</h2><p>${words('intro')}</p><ol class="village-steps">${villageSteps.map((id,i)=>`<li class="${i<v.step?'done':i===v.step?'now':''}" ${i===v.step?'aria-current="step"':''}><span>${i<v.step?'✓':i+1}</span>${V(id)}</li>`).join('')}</ol><div class="village-progress"><progress max="5" value="${v.step}" aria-label="${V('chapter1')}"></progress><span>${v.step} / 5</span></div></div><article class="paper village-task"><div class="section-label">${V('chapter1')}<span>${Math.min(v.step+1,5)} / 5</span></div><h2>${V(v.step===0?['nickname','difficulty','setupCountry'][v.setupStep||0]:villageSteps[v.step]||'done')}</h2><div class="lesson-action">${action}</div>${[1,2,4,5].includes(v.step)?writingPracticeHTML({V},writingLessonFor(v)):''}</article></div>`;
}
export function buildGuideHTML(layout,V){return `<aside class="build-guide" role="status"><strong>${V('guide')}</strong><p>${V(buildHint(layout)+'Hint')}</p></aside>`;}
export function practicePlan(task,mode,name=''){
 // Keep the profile name intact; use the authored example when the legacy judge cannot read it.
 if(!evaluate('welcome','我叫'+name+'。').ok)name='小雨';
 const part=(text,key)=>({text,key});
 const plans={
  welcome:{chips:[part('我叫','myName'),part(name||'小雨',null),part('。',null)],before:'我叫',options:[part(name||'小雨',null),part('Ana',null)],after:'。'},
  notice:{chips:[part('星期六','saturday'),part('晚上七点，','seven'),part('在公共广场。','square')],before:'',options:[part('星期六','saturday'),part('星期日','sunday')],after:'晚上七点，在公共广场。'},
  stall:{chips:[part('我想卖茶，','sellTea'),part('在东边摆摊。','eastStall')],before:'我想卖茶，在',options:[part('东边','eastStall'),part('西边','west')],after:'摆摊。'},
  table:{chips:[part('能借一张桌子吗？','borrow'),part('我六点来拿，','six'),part('因为七点夜市开始。','because')],before:'能借一张桌子吗？我',options:[part('六点','six'),part('四点','four')],after:'来拿，因为七点夜市开始。'},
  opening:{chips:[part('今晚七点','tonight'),part('来广场东边找我。','eastSquare')],before:'今晚七点来广场',options:[part('东边','eastStall'),part('西边','west')],after:'找我。'}
 };
 return mode==='independent'?null:plans[task.id]??null;
}
export function practiceHTML(task,mode,isCheck,{V,esc},name=''){
 if(isCheck||mode==='independent')return '';
 const p=practicePlan(task,mode,name);if(!p)return '';
 return `<div class="practice-help">${task.id==='welcome'&&name&&p.options[0].text!==name?`<p>${V('practiceName')}</p>`:''}<p>${V(mode==='starter'?'chipsHint':'frameHint')}</p>${mode==='starter'?`<div class="word-bank">${p.chips.map(c=>`<button type="button" data-chip="${esc(c.text)}"><span lang="zh-CN">${esc(c.text)}</span>${c.key?`<small>${V(c.key)}</small>`:''}</button>`).join('')}</div>`:`<p lang="zh-CN">${esc(p.before)} <strong>___</strong> ${esc(p.after)}</p><select id="sentence-choice" aria-label="${V('frameHint')}">${p.options.map(c=>`<option value="${esc(c.text)}">${esc(c.text)}${c.key?' · '+V(c.key):''}</option>`).join('')}</select><button type="button" id="fill-sentence">${V('fill')}</button>`}<button type="button" id="clear-answer">${V('clear')}</button></div>`;
}

export function cultureHTML({V}){
 return `<section class="culture-page"><div class="culture-intro"><div class="section-label">${V('cultureNav')} <span>HAN START</span></div><h2>${V('achievementTitle')}</h2><p>${V('achievementIntro')}</p><small>${V('achievementScope')}</small><img class="achievement-landscape" src="/city-frieze.svg" alt="${V('cultureLandscape')}" width="800" height="130"></div><div class="culture-grid achievement-grid">${achievementFacts.map((item,i)=>{const key='achievement'+item.id;return `<article class="paper culture-card"><img src="/${item.image}" alt="${V(key+'Title')}" width="800" height="130"><div class="culture-caption"><span class="culture-number">0${i+1}</span><h3>${V(key+'Title')}</h3><p class="achievement-fact">${V(key+'Metric')}</p><p class="achievement-label">${V(key+'Label')}</p><p class="achievement-change">${V(key+'Change')}</p><details><summary>${V('achievementSources')}</summary><p>${V(key+'Detail')}</p>${item.sources.map(source=>`<a href="${source.url}" target="_blank" rel="noreferrer">${V(source.label)} ↗</a><small>${source.date}</small>`).join('')}</details></div></article>`;}).join('')}</div></section>`;
}
