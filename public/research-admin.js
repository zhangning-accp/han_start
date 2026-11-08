const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={travel:'旅行',work:'工作',family:'家庭交流',culture:'文化兴趣',study:'学习或考试',other:'其他',confusing:'不明白怎么操作',difficult:'中文太难',boring:'有点无聊',content:'内容不够',technical:'访问或播放故障',busy:'暂时没时间',enjoyed:'喜欢这种方式',interested:'感兴趣',declined:'暂不考虑'};
const label=x=>labels[x]||'未填写';
const category={learning:'学习内容',decoration:'布置装饰'},period={month:'每月',year:'每年',once:'一次性'};
const money=o=>`${esc(o.currency)} ${(o.amountMinor/100).toFixed(2)} / ${period[o.interval]}`;
export function researchAdminHTML(report,section='all'){
 const {settings={},offers=[],participants=[]}=report;
 const pricing=`<section class="panel"><h2>报价意向配置</h2><p>默认不展示。启用后只登记意向，不扣费、不创建订阅。金额、权益和周期修改后生成新报价版本，旧记录保留原价。请用目标用户读得懂的语言填写标题和权益。</p><div class="report-columns">${Object.entries(category).map(([key,label])=>{
 const setting=settings[key]||{revision:0,enabled:false},o=setting.offer||{};
 return `<form data-configure-offer="${key}" data-revision="${setting.revision}"><h3>${label}</h3><label><input type="checkbox" name="enabled" ${setting.enabled?'checked':''}>向访客展示</label><label>标题<input name="title" maxlength="120" value="${esc(o.title)}"></label><label>具体权益<textarea name="benefits" maxlength="1200">${esc(o.benefits)}</textarea></label><label>金额<input name="amount" type="number" min="0.01" max="100000" step="0.01" value="${o.amountMinor?(o.amountMinor/100).toFixed(2):''}"></label><label>币种<select name="currency">${['USD','EUR','GBP','BRL','CNY'].map(x=>`<option ${o.currency===x?'selected':''}>${x}</option>`).join('')}</select></label><label>收费周期<select name="interval">${Object.entries(period).map(([v,l])=>`<option value="${v}" ${o.interval===v?'selected':''}>${l}</option>`).join('')}</select></label><button>保存${label}方案</button><p role="status" data-offer-config-status></p></form>`;
 }).join('')}</div></section><section class="panel"><h2>报价意向结果（全部日期）</h2><p>按浏览器凭证去重，不等于真实人数。兴趣比例 = 感兴趣 / 展开过报价；不是付款或付费转化。此节不受上方行为筛选影响，已删除用户不计入。</p>${offers.length?offers.map(o=>`<article><h3>${category[o.category]} · ${esc(o.title)} · v${o.version} ${o.active?'展示中':'已停用'}</h3><p>${money(o)}</p><p>看过 ${o.viewed} · 感兴趣 ${o.interested} · 暂不考虑 ${o.declined} · 未回答 ${o.unanswered} · 兴趣比例 ${o.viewed?(100*o.interested/o.viewed).toFixed(1)+'%':'—'}</p></article>`).join(''):'<p>尚未配置或展示报价。</p>'}</section>`;
 const feedback=`<section class="panel"><h2>自愿反馈与访谈（全部日期，仅管理员）</h2><p>联系方式仅用于已同意的一次体验访谈，不用于营销。撤回后不再显示。报价评论也是自愿研究资料。</p>${participants.length?participants.map(p=>`<article class="admin-feedback"><small>${esc(p.id)} · ${esc(p.source)} / ${esc(p.batch)}</small>${p.survey?`<p>学习目的：${esc(label(p.survey.goal))} · 当前方式：${esc(p.survey.currentTool)} · 体验：${esc(label(p.survey.reason))}</p><p>${esc(p.survey.note)}</p>`:''}${p.interview?`<p>已同意一次访谈：${esc(p.interview.contact)} · ${esc(p.interview.consentedAt)}</p>`:'<p>未授权联系。</p>'}${Object.values(p.responses||{}).filter(r=>r.choice).map(r=>`<p>${esc(r.offer.title)} · ${money(r.offer)} · ${esc(label(r.choice))}：${esc(r.reason)}</p>`).join('')}</article>`).join(''):'<p>暂无自愿研究资料。</p>'}</section>`;
 return section==='pricing'?pricing:section==='feedback'?feedback:pricing+feedback;
}
export function bindResearchAdmin(root,{request,reload}){
 root.querySelectorAll('[data-configure-offer]').forEach(form=>form.onsubmit=async e=>{
  e.preventDefault();const button=e.submitter,fields=form.elements,status=form.querySelector('[data-offer-config-status]');button.disabled=true;
  try{await request('offer','POST',{category:form.dataset.configureOffer,revision:Number(form.dataset.revision),enabled:fields.enabled.checked,title:fields.title.value,benefits:fields.benefits.value,amountMinor:Math.round(Number(fields.amount.value)*100),currency:fields.currency.value,interval:fields.interval.value});await reload();}catch{status.textContent='未保存，输入已保留。检查金额、标题和权益；如版本已变化，请刷新后核对。';button.disabled=false;}
 });
}
