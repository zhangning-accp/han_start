import {buildHint} from './onboarding.js';
import {buildGuideHTML} from './onboarding-ui.js';
import {GRID,components,occupant,reviseLayout,validateLayout} from './building.js';
export {yardMarkup as layoutMarkup} from './yard-scene.js';
import {yardMarkup as layoutMarkup,pieceIcon} from './yard-scene.js';
export function showSubmissionStatus(root,message){
 root.querySelector('.sharing-options').open=true;
 const receipt=root.querySelector('#submit-result');receipt.textContent=message;
 receipt.focus();receipt.scrollIntoView({block:'center'});
}
export function createBuilder({state,save,log,api,refresh,getWorks,L,esc,notify,render,share,V,onSaved=()=>{}}){
 let undo=[],redo=[],selected=null,tool='table',message='';
 const draft=()=>state.buildDraft;
 const intro=()=>state.onboarding?.chapter==='village'&&state.onboarding.step===3;
 function enter(){
  const w=getWorks().find(w=>w.id===state.workId)||getWorks().at(-1);
  if(!draft())state.buildDraft=structuredClone(w?.layout||{name:intro()?V('personalCorner'):L('我的夜市摊位','My night-market stall'),items:[]});
  if(w&&!state.workId){state.workId=w.id;state.workRevision=w.revision;}
  log(w?'work_revisit':'build_start',null,null,{workId:state.workId??null});save();
 }
 function apply(action){try{const next=reviseLayout(draft(),action);undo.push(structuredClone(draft()));redo=[];state.buildDraft=next;message='';log('build_edit');save();render();}catch(e){log('operation_failure',null,null,{operation:'build_edit'});notify(e.message);}}
 function html(){
  const w=getWorks().find(w=>w.id===state.workId),item=draft().items.find(i=>i.id===selected);
  const tutorial=intro();
  return `<div class="builder-layout"><article class="paper"><div class="section-label">${V('courtyard')}<span>${L('私人草稿','Private draft')}</span></div><h2>${V('courtyard')}</h2>${tutorial?buildGuideHTML(draft(),V):''}<details class="build-options"><summary>${V('buildOptions')}</summary>${tutorial?`<p>${V('courtyardGoal')}</p>`:''}<p>${V('courtyardControls')}</p>${!tutorial?`<p class="build-language">请把招牌放在桌子旁边。<br><small>Qǐng bǎ zhāopái fàng zài zhuōzi pángbiān. · ${L('你可以自由决定具体位置，布局不按审美评分。','Try putting your sign beside the counter. The exact layout is your choice, not a language score.')}</small></p>`:''}<label for="work-name">${L('作品名','Work name')}</label><input id="work-name" maxlength="32" value="${esc(draft().name)}"><button id="export-draft">${L('导出草稿','Export draft')}</button></details><div class="palette">${Object.entries(components).filter(([id])=>!tutorial||['table','plant'].includes(id)).map(([id,c])=>`<button data-tool="${id}" class="${tool===id&&!selected?'primary':''}">${pieceIcon(id)}<span>${id==='table'?V('sceneTable'):id==='plant'?V('scenePlant'):L(c.zh,c.en)}</span> <small>≤${c.limit}</small></button>`).join('')}</div><div class="plot-label">${V('sceneHome')}</div>${layoutMarkup(draft(),esc,L,true,selected)}<div class="plot-label entrance">${V('sceneStreet')}</div><p role="status">${message?L('已保存。退出再来时，作品仍在。','Saved. Your work will be here when you return.'):tutorial?(buildHint(draft())==='save'?V('sceneReady'):''):L('至少放置摊台、招牌及一个装饰。','Include a counter, a sign, and a lantern or plant. You may place up to eight pieces.')}</p><div class="actions"><button id="undo" ${undo.length?'':'disabled'}>${L('撤销','Undo')}</button><button id="redo" ${redo.length?'':'disabled'}>${L('重做','Redo')}</button><button id="rotate" ${item?'':'disabled'}>${L('旋转选中组件','Rotate selection')}</button><button id="remove-piece" ${item?'':'disabled'}>${L('移除选中组件','Remove selection')}</button></div>${item?.type==='sign'?`<label for="sign-text">${L('招牌文字 · 最多24字','Sign text · up to 24 characters')}</label><input id="sign-text" maxlength="24" value="${esc(item.text)}"><button id="apply-sign">${L('更新招牌','Update sign')}</button>`:''}<div class="actions build-save-actions"><button id="save-work" class="primary">${L('保存个人作品','Save private work')}</button></div><p class="muted">${L('草稿自动保留在此浏览器；保存后建立本机作品版本，不自动公开。','Draft changes stay in this browser. Saving creates a private local version, never an automatic public post.')}</p></article><aside><article class="paper"><h2>${L('已保存的作品','Your saved work')}</h2>${w?`<h3>${esc(w.layout.name)} · r${w.revision}</h3>${layoutMarkup(w.layout,esc,L)}<p>${L('作品已私密保存。可申请公开分享，由网站管理员审核后发布。','Your work is saved privately. You can request public sharing after review by a website administrator.')}</p>${!tutorial?`<button id="share-work">${L('提交这个版本供审核','Share this version for review')}</button>`:''}<h3>${L('个人版本历史','Private version history')}</h3><select id="restore-version">${w.versions.slice().reverse().map(v=>`<option value="${v.revision}">r${v.revision} · ${esc(v.layout.name)}</option>`).join('')}</select><button id="restore-work">${L('将该版本载入草稿','Load version into draft')}</button><p class="muted">${L('保存恢复的草稿会产生新版本，不删除历史。','Save the restored draft to create a new revision. Earlier versions remain intact.')}</p>`:`<p>${L('还没有保存的作品。先摆放你喜欢的布局吧。','No saved work yet. Start with a layout you like.')}</p>`}</article><article class="paper"><h3>${L('阿禾记得你的约定','A-He remembers')}</h3><p>${state.step<4?V('gift'):L('“你说六点来拿桌子，因为七点夜市开始。谢谢你等我修好！现在这张桌子由你安排。”','“You agreed to collect the table at six because the market starts at seven. Thanks for waiting while I fixed it. Now it’s yours to arrange.”')}</p></article><button data-go="town">${L('回到街上','Back to the street')}</button></aside></div>`;
 }
 function bind(){
  const $=s=>document.querySelector(s);

  document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;selected=null;render();});
  document.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.cell.split(',').map(Number),hit=occupant(draft(),x,y);if(hit){selected=hit.id;render();}else if(selected)apply({type:'update',id:selected,x,y});else apply({type:'place',item:{id:crypto.randomUUID(),type:tool,x,y,rotation:0,text:tool==='sign'?'欢迎光临':''}});});
  $('#work-name').oninput=e=>{undo.push(structuredClone(draft()));redo=[];state.buildDraft.name=e.target.value;save();};
  $('#undo').onclick=()=>{if(undo.length){redo.push(structuredClone(draft()));state.buildDraft=undo.pop();log('build_undo');selected=null;save();render();}};
  $('#redo').onclick=()=>{if(redo.length){undo.push(structuredClone(draft()));state.buildDraft=redo.pop();log('build_redo');selected=null;save();render();}};
  $('#rotate').onclick=()=>{const item=draft().items.find(i=>i.id===selected);if(item)apply({type:'update',id:selected,rotation:item.rotation===90?0:90});};
  $('#remove-piece').onclick=()=>{apply({type:'remove',id:selected});selected=null;render();};
  $('#apply-sign')?.addEventListener('click',()=>apply({type:'update',id:selected,text:$('#sign-text').value}));
  $('#save-work').onclick=async e=>{const button=e.currentTarget;button.disabled=true;try{validateLayout(draft());const work=await api('works','POST',{id:state.workId,revision:state.workRevision,layout:draft()});state.workId=work.id;state.workRevision=work.revision;log('layout_save',null,'saved',{workId:work.id,revision:work.revision});save();await refresh();message='saved';onSaved(work);render();}catch(err){log('operation_failure',null,null,{operation:'build_save'});notify(err.message);button.disabled=false;}};
  $('#restore-work')?.addEventListener('click',()=>{const w=getWorks().find(w=>w.id===state.workId),v=w.versions.find(v=>v.revision===Number($('#restore-version').value));undo.push(structuredClone(draft()));redo=[];state.buildDraft=structuredClone(v.layout);log('build_restore');state.workRevision=w.revision;save();render();});
  $('#share-work')?.addEventListener('click',()=>{const w=getWorks().find(w=>w.id===state.workId);try{validateLayout(w.layout,{complete:true});log('share_view',null,null,{workId:w.id});share(w);}catch(e){notify(e.message);}});
  $('#export-draft').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({schema:1,layout:draft()},null,2)],{type:'application/json'}));a.download='han-start-layout.json';a.click();log('draft_export');setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
 }
 return {enter,html,bind};
}
