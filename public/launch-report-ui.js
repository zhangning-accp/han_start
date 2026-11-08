import {sceneName} from './admin-format.js';
export function launchReportHTML(r,{table,esc,rate},section='all'){
 const a=r.acquisition;if(!a)return '';
 const first=`<section class="panel"><h2>首次可观察会话</h2><p>按所选日期内新建浏览器身份统计；不是全部页面浏览量。首次同意统计后观察同一会话最多24小时，晚同意不代表首次访问。未同意、退出统计或记录不可用的访客属于未观察，不算流失。未满24小时：${a.pending}。功能、模式和设备筛选不改变本节首次会话口径。</p>${table(['已识别','可观察','未观察','开始新手任务','同会话完成'],[[a.identified,a.observed,a.unobserved,a.started,a.completed]])}<p>开始比例：${a.startRate===null?'—':(a.startRate*100).toFixed(1)+'%'}（开始 / 可观察）；完成比例：${a.completionRate===null?'—':(a.completionRate*100).toFixed(1)+'%'}（完成 / 开始）。不是严格退出率。</p><h3>最后观察位置</h3><p>仅表示最后收到的记录，不能据此确定退出时间或原因。</p>${table(['位置','人数'],a.lastSteps.map(x=>[esc(sceneName(x.scene)),x.users]))}</section>`;
 const returns=`<section class="panel"><h2>学习回访与仅布置回访</h2><p>总回访包含有效学习和其他动作；学习含听读、中文任务及书写。仅布置表示当天有布置动作、无已观察到的学习动作。仅是行为证据，不代表学会。三者使用相同的成熟观察样本，不按功能区、设备或帮助模式裁剪回访行为；旧版未保留的词句不会补造。</p>${table(['回访日','总回访','学习回访','仅布置'],['d1','d7','d30'].map(k=>[({d1:'次日',d7:'第 7 天',d30:'第 30 天'})[k],rate(r.retention[k]),rate(r.learningRetention[k]),rate(r.buildOnlyRetention[k])]))}<h3>逐句听读</h3>${table(['词句','人数','播放次数','慢速次数'],r.audioLessons.map(x=>[({hello:'你好',tea:'茶',water:'水',sit:'坐',thanks:'谢谢'})[x.lesson]||esc(x.lesson),x.users,x.uses,x.slow]))}</section>`;
 return section==='first'?first:section==='returns'?returns:first+returns;
}
