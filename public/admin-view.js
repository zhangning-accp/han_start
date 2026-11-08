import {esc,mins,table,rate,dateTime,sceneName,languageName,sourceName,countrySource} from './admin-format.js';
import {countryNames} from './countries.js';
import {launchReportHTML} from './launch-report-ui.js';
import {usageHTML} from './usage-ui.js';
import {correctionDetailsHTML} from './inline-correction.js';
const helpers={esc,mins,table,rate,countryNames};
const statuses={new:'待查看',classified:'已分类',working:'处理中',resolved:'已解决',declined:'暂不处理'};
const categories={confusing:'操作不明白',difficult:'中文太难',translation:'翻译问题',bug:'程序故障',idea:'功能建议',other:'其他'};
export const sections={moderation:['作品审核','预览投稿、填写意见并发布，或退回修改。'],overview:['运营总览','先看有没有人开始，再看是否完成。'],accounts:['账号列表','查看来访者、来源国家和个人使用记录。'],learning:['学习与布置','查看回访、听读练习、功能使用和受阻情况。'],feedback:['反馈与访谈','阅读原文、处理问题，了解为什么离开。'],pricing:['付费意向','配置报价并查看表达兴趣的人数；不代表实际付款。'],settings:['设置与指标说明','管理试运营时间，了解数据如何计算。']};
export function detailQuery(query,id){const p=new URLSearchParams(query);p.set('visitor',id);return '?'+p;}
const meta=r=>`<p class="report-scope">统计范围：${esc(r.filters.from)} 至 ${esc(r.filters.to)}（UTC） · 最近更新 ${dateTime(r.generatedAt)}</p>`;
function overview(r){
 const s=r.summary;
 const cards=[['新增免注册账户',s.newVisitors,'在所选日期内首次建立的匿名账户'],['期间活跃账户',s.activeUsers,'所选日期内有学习或操作，按账户去重'],['有效使用分钟',mins(s.activeSeconds),'排除后台、失焦与空闲时间'],['日活账户',s.dau,'仅所选结束日有操作的账户'],['同意统计 / 已知账户',s.trackedVisitors+' / '+s.knownVisitors,'截至现在的账户状态，不是历史覆盖率'],['意见反馈',s.feedback,'所选范围收到的反馈条数']];
 const countries=r.countries.filter(c=>c.newVisitors||c.activeUsers||c.activeSeconds||r.filters.country);
 return `<div class="metrics">${cards.map(([label,value,hint])=>`<article><small>${label}</small><strong>${value}</strong><span>${hint}</span></article>`).join('')}</div>
 ${launchReportHTML(r,helpers,'first')}
 <section class="panel"><h2>每日使用情况</h2><p>有效分钟是所有账户的合计；0 表示没有已记录的活动，不等于无人访问。</p>${s.activeUsers?table(['日期 UTC','新增账户','活跃账户','有效分钟'],r.daily.map(d=>[d.date,d.newVisitors,d.activeUsers,mins(d.activeSeconds)])):'<p class="empty">暂无活动数据。真实使用并同意统计后显示。</p>'}<details><summary>周活、月活与使用次数</summary><p>截至 ${esc(r.filters.to)}：过去 7 天活跃 ${s.wau} 个账户，过去 30 天活跃 ${s.mau} 个账户；所选期间 ${s.sessions} 次有操作的会话。同一人多次回来可以产生多个会话。</p></details></section>
 <section class="panel"><h2>国家与地区</h2><p>默认按 IP 推测，用户可以更正。新账户按首次已知国家分组，活动按发生时国家分组。国家筛选不会改写历史国家。使用 VPN 时可能不准确；账号详情标明来源。</p>${countries.length?table(['国家 / 地区','新增账户','活跃账户','有效分钟'],countries.map(c=>[countryNames[c.country],c.newVisitors,c.activeUsers,mins(c.activeSeconds)])):'<p class="empty">暂无国家数据。支持越南、印度尼西亚、巴西及其他国家和地区。</p>'}</section>`;
}
export function accountsHTML(r){
 const rows=r.accounts||[],usage=new Map(r.visitorUsage.map(v=>[v.id,v]));
 return `<section class="panel account-directory"><h2>账号列表</h2><p>列出所选日期内新增或有已记录活动的账户。未同意统计的账户也会显示基础信息。点击“查看详情”进入个人页面；返回后保留列表筛选。</p>${table(['账户','国家 / 地区','国家来源','来源渠道 / 批次','统计状态','有效分钟','最后记录位置','操作'],rows.map(a=>{const v=usage.get(a.id);return [`<code title="${esc(a.id)}">${esc(a.id.slice(0,8))}…</code>`,countryNames[a.country]||'未知',countrySource(a.countrySource),esc(sourceName(a.source))+'<small>'+esc(a.batch||'未标记批次')+'</small>',a.analytics?'已同意统计':'未同意统计',v?mins(v.activeSeconds):'无记录',esc(sceneName(v?.lastScene)),`<button data-visitor="${esc(a.id)}">查看详情<span class="sr-only"> ${esc(a.id.slice(0,8))}</span></button>`];}))}<p class="meta">共 ${rows.length} 个账户。账户编号来自设备指纹 MD5，不能当作真实人数；不同浏览器可能合并或拆分。</p></section>`;
}
export function visitorDetailHTML(r,id){
 const a=r.accounts?.find(a=>a.id===id),v=r.visitorUsage.find(v=>v.id===id);
 const back='<button data-back-accounts>← 返回账号列表</button>';
 if(!a)return `${back}<section class="panel"><h2>未找到该账号</h2><p>账号可能已删除或不符合列表的国家、来源等筛选。</p></section>`;
 return `${back}<section class="panel"><p class="eyebrow">个人记录</p><h2>账号详情 · ${esc(id.slice(0,8))}</h2><p>这里仅显示此账号的数据。行为明细沿用列表的日期及筛选条件，不是全站统计。</p><dl class="account-facts"><div><dt>完整账号编号</dt><dd><code>${esc(id)}</code></dd></div><div><dt>国家 / 地区</dt><dd>${countryNames[a.country]} · ${countrySource(a.countrySource)}</dd></div><div><dt>辅助语言</dt><dd>${languageName(a.language)}</dd></div><div><dt>首次建立 UTC</dt><dd>${dateTime(a.createdAt)}</dd></div><div><dt>来源 / 招募批次</dt><dd>${esc(sourceName(a.source))} / ${esc(a.batch||'未标记')}</dd></div><div><dt>行为统计状态</dt><dd>${a.analytics?'已同意统计':'未同意统计；可能只保留此前授权时的记录'}</dd></div><div><dt>最近记录 UTC</dt><dd>${dateTime(v?.lastAt)}</dd></div><div><dt>最后记录位置</dt><dd>${esc(sceneName(v?.lastScene))}</dd></div></dl><p>最后记录位置只表示最后收到的记录，不能确定退出原因。国家来自网络推测时不代表国籍；合并账户的基础信息取最早建立的身份。</p></section>${meta(r)}${v?`<div class="metrics"><article><small>有效使用分钟</small><strong>${mins(v.activeSeconds)}</strong></article><article><small>非计时记录条数</small><strong>${v.events}</strong><span>包含进入、操作和练习记录，不含计时片段，也不是练习次数</span></article></div>${usageHTML(r,helpers,'modules')}${usageHTML(r,helpers,'learning')}`:'<section class="panel"><h2>当前范围没有行为记录</h2><p>可能尚未同意统计、没有符合筛选的记录，或记录已超过 120 天保留期。不能据此判断没有使用。</p></section>'}`;
}
function feedbackHTML(r){return `<section class="panel"><h2>意见跟进</h2><p>保留原文。处理备注会显示给提交反馈的访客。</p>${r.feedback.length?r.feedback.map(f=>`<article class="admin-feedback"><div><span class="badge">${statuses[f.status]}</span> ${countryNames[f.country]} · ${languageName(f.language)} · ${categories[f.category]} · ${dateTime(f.createdAt)}</div><p class="original">${esc(f.text)}</p>${correctionDetailsHTML(f)}${f.history.map(h=>`<p class="review-note">${dateTime(h.time)} · ${statuses[h.status]} · ${esc(h.note)}</p>`).join('')}<form data-feedback="${esc(f.id)}" data-revision="${f.revision}"><label>处理状态<select name="status">${Object.entries(statuses).map(([v,label])=>`<option value="${v}" ${v===f.status?'selected':''}>${label}</option>`).join('')}</select></label><label>优先级<select name="severity"><option value="normal">普通</option><option value="urgent" ${f.severity==='urgent'?'selected':''}>紧急</option></select></label><label class="note-label">处理备注<input name="note" required maxlength="1000"></label><button>保存处理记录</button></form></article>`).join(''):'<p class="empty">暂无反馈。</p>'}</section>`;}
function hoursHTML(r){
 const heatMax=Math.max(1,...r.heatmap.map(h=>h.activeSeconds));
 const heatRows=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=>`<tr><th>${['周一','周二','周三','周四','周五','周六','周日'][i]}</th>${Array.from({length:24},(_,hour)=>{const h=r.heatmap.find(h=>h.weekday===day&&h.hour===hour),level=h?Math.ceil(h.activeSeconds/heatMax*4):0;return `<td class="heat-${level}" title="${hour}:00 · ${h?.activeUsers||0} 位访客">${h?mins(h.activeSeconds):'—'}</td>`;}).join('')}</tr>`).join('');
return `<details class="panel"><summary>展开当地使用时段</summary><section class="panel"><h2>当地使用时段</h2><p>按访客设备时区展示星期 × 小时，每格为有效分钟。国家不会被硬编码成单一时区。未知时区：${mins(r.unknownTimezoneSeconds)} 分钟。</p><div class="table-scroll"><table class="heatmap"><thead><tr><th>当地</th>${Array.from({length:24},(_,i)=>`<th>${i}</th>`).join('')}</tr></thead><tbody>${heatRows}</tbody></table></div></section></details>`;}
function learningDetails(r){return `<details class="panel"><summary>更多学习统计：首次体验、回访批次和步骤人数</summary><p>从首次同意统计开始，24 小时内完成新手村：${rate(r.activation)}。各动作人数独立去重，不把不同批次当作同一转化漏斗。</p>${table(['首次同意统计日期','次日回访','第 7 天回访','第 30 天回访'],r.cohorts.map(c=>[c.date,rate(c.d1),rate(c.d7),rate(c.d30)]))}${table(['动作','独立账户数'],r.funnel.map(f=>[({visit:'已授权访问',village_step:'新手村步骤',village_complete:'新手村完成',market_start:'进入夜市',market_complete:'夜市完成'})[f.type],f.users]))}${table(['新手步骤','独立账户数'],r.steps.map(s=>[esc(sceneName(s.scene)),s.users]))}</details>`;}
export function glossaryHTML(){return `<section class="panel"><h2>指标怎么读</h2>${table(['指标','含义与限制'],[
 ['匿名账户','按设备指纹 MD5 估算，不是实名用户，也不等于真实人数。'],
 ['开始比例','开始新手任务的账户 ÷ 首次可观察会话的账户。未授权行为统计者不进入分母。'],
 ['完成比例','同一首次可观察会话完成任务的账户 ÷ 已开始的账户。'],
 ['次日 / 第 7 天 / 第 30 天回访','从首次同意统计那天（UTC）起算，在对应那一天有操作；不是此前累计回来过。'],
 ['可计算访客 / 仍在观察','对应日期完整结束后才进入分母；尚未到观察日的人不当作流失。'],
 ['学习回访 / 仅布置回访','学习包括听读、中文任务和书写；仅布置表示当日有布置但未观察到学习。'],
 ['无数据 / 0 / —','无数据表示没有符合条件的记录；0 是记录范围内的计数；— 表示无法计算，不能当成 0%。'],
 ['有效分钟 / 人均 / 中位','排除后台和空闲的估计时间；人均是总时间除使用人数；中位是使用时长排序后居中的值。'],
 ['首次通过 / 首次尝试','分子为有记录的第一次作答中通过的次数；不表示学会中文。'],
 ['筛选范围','总览、账号、学习和意见跟进使用行为筛选；首次体验与回访不按功能、设备、帮助模式拆分。报价和访谈是全部日期。'],
 ['数据保留','行为明细保留 120 天。删除身份会移除相关统计；退出统计不再产生新的行为记录。'],
 ['IP 国家','本地免费国家库推测网络所在地；VPN、网络出口和数据库误差会影响结果。不保存原始 IP，不追溯填补历史事件。']
 ])}<p><a href="https://db-ip.com" target="_blank" rel="noreferrer">IP Geolocation by DB-IP</a> · 免费国家库。</p></section>`;}
export function reportHTML(r,section='overview'){
 const body=section==='overview'?overview(r):section==='accounts'?accountsHTML(r):section==='learning'?`${launchReportHTML(r,helpers,'returns')}${usageHTML(r,helpers)}${learningDetails(r)}${hoursHTML(r)}`:section==='feedback'?feedbackHTML(r):section==='settings'?glossaryHTML():'';
 return meta(r)+body;
}
