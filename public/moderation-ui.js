import {esc,dateTime} from './admin-format.js';
import {yardMarkup} from './yard-scene.js';
import {statusText} from './i18n.js';
const active=c=>['submitted','reviewing','approved'].includes(c.status);
export function moderationHTML(contributions){
 const pending=contributions.filter(active),done=contributions.filter(c=>!active(c));
 function card(c){
  const layout=c.layout||c.preview;
  return `<article class="panel moderation-card"><h3>${esc(c.layout?.name||({correction:'招牌纠错',build:'作品投稿'}[c.kind]||c.kind))}${c.workRevision?' · r'+c.workRevision:''}</h3><p><strong>${esc(statusText[c.status]?.[0]||c.status)}</strong> · ${esc(c.author)} · ${dateTime(c.created)} UTC</p>${layout?`<div class="moderation-preview">${yardMarkup(layout,esc,zh=>zh)}</div>`:''}${c.kind==='correction'?`<p>当前招牌：${esc(c.preview?.items.find(i=>i.id===c.itemId)?.text||'作品已不可用')}</p><p>建议改为：<strong>${esc(c.replacement)}</strong></p><p>提交基于公开版本 v${esc(c.basePublishedVersion)}；预览为当前公开版本，版本不一致时不能发布。</p>`:''}${!['build','correction'].includes(c.kind)?'<p>此类建议发布后会启用预设的入口指路牌与问路事件；只通过与该内容相符的建议。</p>':''}<p class="submission-text">${esc(c.text)}</p>${c.review?`<p>最近审核：${esc(c.review.reason)} · ${esc(c.review.reviewer)}</p>`:''}${active(c)?`<form data-moderation="${esc(c.id)}" data-status="${esc(c.status)}" data-revision="${c.audit.length}"><label>审核署名<input name="reviewer" required maxlength="80" value="网站管理员"></label><label>审核意见（提交者可见）<textarea name="reason" required maxlength="1000"></textarea></label><div class="review-actions"><button name="action" value="publish" class="primary">${c.status==='approved'?'发布':'通过并发布'}</button>${c.status!=='approved'?'<button name="action" value="revise">要求修改</button><button name="action" value="reject">拒绝</button>':''}</div><p role="status"></p></form>`:''}${c.audit.length?`<details><summary>审核记录</summary>${c.audit.map(a=>`<p>${esc(statusText[a.status]?.[0]||a.status)} · ${dateTime(a.time)} UTC<br>${esc(a.reason||'')} ${esc(a.reviewer||'')}</p>`).join('')}</details>`:''}</article>`;
 }
 return `<section class="panel"><h2>作品审核 · 待处理 ${pending.length}</h2><p>由网站管理员人工审核。检查作品、招牌和公开署名；通过并发布后所有访客可见。这里显示全部投稿，不受统计日期筛选影响。</p><button data-refresh-moderation>刷新审核列表</button></section>${pending.length?pending.slice().reverse().map(card).join(''):'<p class="empty">暂无待处理投稿。</p>'}${done.length?`<details><summary>已处理及已撤回 · ${done.length}</summary>${done.slice().reverse().map(card).join('')}</details>`:''}${contributions.length?'':'<p class="empty">暂无投稿。</p>'}`;
}
export function bindModeration(root,{request,reload}){
 root.querySelector('[data-refresh-moderation]')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;try{await reload();}catch{b.textContent='刷新失败，点击重试';b.disabled=false;}});
 root.querySelectorAll('[data-moderation]').forEach(form=>form.onsubmit=async e=>{
  e.preventDefault();const buttons=[...form.querySelectorAll('button')];if(buttons.some(b=>b.disabled))return;
  const action=e.submitter?.value;if(!action)return;
  buttons.forEach(b=>b.disabled=true);const message=form.querySelector('[role="status"]');message.textContent='正在处理…';
  try{
   await request('contributions','POST',{id:form.dataset.moderation,status:form.dataset.status,revision:Number(form.dataset.revision),action,reason:form.elements.reason.value,reviewer:form.elements.reviewer.value});
  }catch(err){message.textContent=err.message==='409'?'投稿状态或公开版本已变化。请刷新列表后重新核对。':err.message==='401'?'登录已失效，请重新登录。':'操作未完成，请检查审核意见和连接后重试。';buttons.forEach(b=>b.disabled=false);return;}
  message.textContent='处理已保存，正在刷新列表。';
  try{await reload();}catch{message.textContent='处理已保存，但列表刷新失败。请点击刷新审核列表。';}
 });
}
