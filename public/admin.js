import {reportHTML,visitorDetailHTML,detailQuery,sections} from './admin-view.js';
export {reportHTML,visitorDetailHTML,detailQuery};
import {countryNames} from './countries.js';
import {researchAdminHTML,bindResearchAdmin} from './research-admin.js';
import {moderationHTML,bindModeration} from './moderation-ui.js';
export {moderationHTML,bindModeration};
export {researchAdminHTML};
async function start(){
 const $=s=>document.querySelector(s);let query='',section=Object.hasOwn(sections,location.hash.slice(1))?location.hash.slice(1):'overview',visitor=null,generation=0;
 const request=async(path,method='GET',data)=>{const res=await fetch('/api/admin/'+path,{method,headers:{'Content-Type':'application/json','X-Han-Request':'1'},body:data?JSON.stringify(data):undefined});if(!res.ok)throw Error(String(res.status));return res;};
 function error(e){$('#admin-notice').textContent=e.message==='401'?'请检查管理口令或重新登录。':e.message==='429'?'尝试过于频繁，请稍后重试。':'操作未完成。请检查日期、连接或数据版本，再重试。';}
 const now=new Date();$('#to').value=now.toISOString().slice(0,10);$('#from').value=new Date(now-6*86400000).toISOString().slice(0,10);
 function filters(){const params=new URLSearchParams();for(const [key,selector] of [['from','#from'],['to','#to'],['country','#country'],['language','#filter-language'],['mode','#filter-mode'],['device','#filter-device'],['source','#filter-source'],['batch','#filter-batch'],['visitor','#filter-visitor'],['area','#filter-area']]){const value=$(selector).value;if(value)params.set(key,value);}return '?'+params;}
 async function load(){
  const current=++generation,nextQuery=visitor?detailQuery(filters(),visitor):filters();
  const selected=section,selectedVisitor=visitor;
  $('#report').setAttribute('aria-busy','true');$('#export-csv').disabled=true;
  try{
   const [r,research,contributions]=await Promise.all([selected==='moderation'?null:request('report'+nextQuery).then(r=>r.json()),['pricing','feedback'].includes(selected)?request('research').then(r=>r.json()):null,selected==='moderation'?request('contributions').then(r=>r.json()):null]);
   if(current!==generation)return;query=nextQuery;
   $('#login-panel').hidden=true;$('#dashboard').hidden=false;$('#logout').hidden=false;
   $('#section-title').textContent=selectedVisitor?'账号详情':sections[selected][0];$('#section-hint').textContent=selectedVisitor?'仅查看当前账号，返回列表后保留原有筛选。':sections[selected][1];
   $('#filters').hidden=!!selectedVisitor||['pricing','settings','moderation'].includes(selected);
   $('#settings-panel').hidden=selected!=='settings';$('#export-csv').hidden=['pricing','settings','moderation'].includes(selected);
   document.querySelectorAll('[data-section]').forEach(b=>{b.setAttribute('aria-current',b.dataset.section===selected?'page':'false');});
   $('#report').innerHTML=selected==='moderation'?moderationHTML(contributions):selectedVisitor?visitorDetailHTML(r,selectedVisitor):selected==='pricing'?researchAdminHTML(research,'pricing'):reportHTML(r,selected)+(selected==='feedback'?researchAdminHTML(research,'feedback'):'');
   bindResearchAdmin($('#report'),{request,reload:load});bindModeration($('#report'),{request,reload:load});if(r){$('#trial-start').value=r.trial.startDate||'';$('#trial-days').value=String(r.trial.days);}$('#admin-notice').textContent='';
   document.querySelectorAll('[data-visitor]').forEach(button=>button.onclick=async()=>{visitor=button.dataset.visitor;try{await load();$('#section-title').focus();}catch(err){error(err);}});
   $('[data-back-accounts]')?.addEventListener('click',async()=>{visitor=null;section='accounts';try{await load();$('#section-title').focus();}catch(err){error(err);}});
   document.querySelectorAll('[data-feedback]').forEach(form=>form.onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await request('feedback','POST',{id:form.dataset.feedback,revision:Number(form.dataset.revision),status:form.elements.status.value,severity:form.elements.severity.value,note:form.elements.note.value});await load();}catch(err){error(err);b.disabled=false;}});
  }finally{if(current===generation){$('#report').setAttribute('aria-busy','false');$('#export-csv').disabled=false;}}
 }
 for(const button of document.querySelectorAll('[data-section]'))button.onclick=async()=>{
  visitor=null;section=button.dataset.section;history.replaceState(null,'','#'+section);
  try{await load();}catch(err){error(err);}
 };
 for(const [code,name] of Object.entries(countryNames))if(![...$('#country').options].some(o=>o.value===code))$('#country').add(new Option(name,code));
 $('#admin-login').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await request('login','POST',{password:$('#admin-password').value});$('#admin-password').value='';await load();}catch(err){error(err);}finally{e.submitter.disabled=false;}};
 $('#filters').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await load();}catch(err){error(err);}finally{e.submitter.disabled=false;}};
 $('#logout').onclick=async()=>{try{await request('logout','POST',{});location.reload();}catch(err){error(err);}};
 $('#trial-settings').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await request('settings','POST',{startDate:$('#trial-start').value||null,days:Number($('#trial-days').value)});$('#admin-notice').textContent='试运营设置已保存。';}catch(err){error(err);}finally{e.submitter.disabled=false;}};
 $('#export-csv').onclick=async()=>{try{const r=await request('export'+query),url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download='han-start-trial.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(err){error(err);}};
 try{await load();}catch(e){if(e.message!=='401')error(e);}
}
if(typeof document!=='undefined')void start();
