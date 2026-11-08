const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy={
 fix:['纠错','Suggest a correction','Đề xuất sửa','Usulkan koreksi','Sugerir correção'],
 original:['原句','Original','Câu gốc','Teks asli','Original'],
 displayed:['当前文字','Current text','Nội dung hiện tại','Teks saat ini','Texto atual'],
 replacement:['建议改成','Suggested text','Đề xuất','Teks usulan','Texto sugerido'],
 reason:['原因（可不填）','Reason (optional)','Lý do (không bắt buộc)','Alasan (opsional)','Motivo (opcional)'],
 send:['提交建议','Send suggestion','Gửi đề xuất','Kirim usulan','Enviar sugestão'],
 close:['收起','Close','Đóng','Tutup','Fechar'],
 pending:['正在提交…','Sending…','Đang gửi…','Mengirim…','Enviando…'],
 sent:['已收到，待人工核对。你可以继续学习。','Received for review. You can keep learning.','Đã nhận để kiểm tra. Bạn có thể tiếp tục học.','Diterima untuk ditinjau. Kamu bisa lanjut belajar.','Recebido para revisão. Você pode continuar aprendendo.'],
 error:['未提交成功，草稿已保留，请重试。','Could not send. Your draft is kept; please retry.','Chưa gửi được. Bản nháp được giữ lại; hãy thử lại.','Gagal mengirim. Draf disimpan; coba lagi.','Não foi possível enviar. Rascunho mantido; tente novamente.'],
 invalid:['请填写与当前文字不同的建议（1–600 字）。','Enter a different suggestion (1–600 characters).','Nhập đề xuất khác (1–600 ký tự).','Masukkan usulan berbeda (1–600 karakter).','Insira uma sugestão diferente (1–600 caracteres).'],
 note:['仅提交给维护者，核对后人工更新。收起不会丢失本次草稿。','Private suggestion for the maintainer to check and update. Closing keeps this draft.','Đề xuất riêng cho người quản lý kiểm tra và cập nhật. Đóng vẫn giữ bản nháp.','Usulan pribadi untuk diperiksa dan diperbarui pengelola. Menutup tetap menyimpan draf.','Sugestão privada para revisão e atualização pela equipe. Fechar mantém o rascunho.']
};
export const correctionText=(key,lang)=>copy[key]?.[({zh:0,en:1,vi:2,id:3,'pt-BR':4})[lang]??1]??key;
export function correctableHTML(target){
 const C=k=>correctionText(k,target.language);
 return `<span class="correctable" data-correction="${esc(JSON.stringify(target))}"><span>${esc(target.displayed)}</span><button type="button" class="correction-toggle text-button" aria-expanded="false">✎ ${C('fix')}</button><span class="correction-editor" hidden role="group" aria-label="${C('fix')}"><span class="correction-original">${C('original')}：${esc(target.original)}<br>${C('displayed')}：${esc(target.displayed)}</span><label>${C('replacement')}<textarea data-replacement maxlength="600" rows="2">${esc(target.displayed)}</textarea></label><label>${C('reason')}<textarea data-reason maxlength="300" rows="2"></textarea></label><small>${C('note')}</small><span class="actions"><button type="button" data-send-correction>${C('send')}</button><button type="button" data-close-correction>${C('close')}</button></span><span data-correction-status role="status" aria-live="polite"></span></span></span>`;
}
export function createCorrectionDraft(target,{send,uuid=()=>crypto.randomUUID()}){
 let requestId=null;
 const draft={replacement:target.displayed,reason:'',status:'',open:false,
  edit(field,value){if(draft.status==='pending'||draft.status==='sent'||!['replacement','reason'].includes(field))return;draft[field]=value;requestId=null;draft.status='';},
  async submit(){
   if(['pending','sent'].includes(draft.status))return;
   if(!draft.replacement.trim()||draft.replacement.trim()===target.displayed.trim()||draft.replacement.length>600||draft.reason.length>300){draft.status='invalid';return;}
   requestId??=uuid();draft.status='pending';
   try{await send({id:requestId,category:'translation',text:draft.reason||draft.replacement,language:target.language,mode:target.mode,scene:target.scene,correction:{key:target.key,original:target.original,displayed:target.displayed,replacement:draft.replacement,reason:draft.reason}});draft.status='sent';}catch{draft.status='error';}
  }
 };return draft;
}
export function bindCorrections(root,{drafts,send,onEvent=()=>{}}){
 for(const node of root.querySelectorAll('[data-correction]')){
  const target=JSON.parse(node.dataset.correction),key=JSON.stringify(target);
  if(!drafts.has(key))drafts.set(key,createCorrectionDraft(target,{send}));
  const draft=drafts.get(key),get=s=>node.querySelector(s),editor=get('.correction-editor'),toggle=get('.correction-toggle'),replacement=get('[data-replacement]'),reason=get('[data-reason]'),submit=get('[data-send-correction]'),status=get('[data-correction-status]');
  const update=()=>{editor.hidden=!draft.open;toggle.setAttribute('aria-expanded',String(draft.open));replacement.value=draft.replacement;reason.value=draft.reason;replacement.disabled=reason.disabled=submit.disabled=['pending','sent'].includes(draft.status);status.textContent=draft.status?correctionText(draft.status,target.language):'';};
  toggle.onclick=()=>{draft.open=!draft.open;if(draft.open)onEvent('correction_open');update();};
  get('[data-close-correction]').onclick=()=>{draft.open=false;update();toggle.focus();};
  replacement.oninput=()=>draft.edit('replacement',replacement.value);reason.oninput=()=>draft.edit('reason',reason.value);
  submit.onclick=async()=>{const pending=draft.submit();update();await pending;update();if(draft.status==='sent')onEvent('correction_submit');else if(draft.status==='error')onEvent('operation_failure',null,null,{operation:'feedback'});};
  update();
 }
}
export function correctionDetailsHTML(f,lang='zh'){
 if(!f.correction)return '';
 const C=k=>correctionText(k,lang),c=f.correction;
 return `<div class="correction-review"><small>${esc(f.scene)} · ${esc(f.language)} · ${esc(c.key)}</small>${['original','displayed','replacement','reason'].map(k=>`<p><strong>${C(k)}：</strong>${esc(c[k])}</p>`).join('')}</div>`;
}
