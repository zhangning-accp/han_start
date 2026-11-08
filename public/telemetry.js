// Product analytics use explicit event fields rather than arbitrary click/input data.
export const usageAreas={village:'新手村',market:'夜市主线练习',practice:'独立复测与问路',build:'建造编辑器',board:'共建与作品浏览',journal:'学习手记',feedback:'访客设置与反馈',unattributed:'旧记录／未归属功能'};
export const behaviorFeatures={
 writing_demo:'观看目标字笔顺',writing_trace_complete:'完成目标字描写',writing_independent_complete:'完成无描线书写',writing_trace_skip:'跳过描写',writing_independent_skip:'跳过无描线书写',writing_trace_retry:'描写检查需重试',writing_independent_retry:'无描线书写需重试',
 greeting_send:'发送玩家问候',greeting_reply:'回礼玩家问候',greeting_settings:'设置玩家问候',greeting_block:'屏蔽问候玩家',greeting_unblock:'取消屏蔽问候玩家',
 correction_open:'打开原文纠错',correction_submit:'提交原文纠错',
 handwriting_open:'展开手写板',handwriting_recognize:'识别手写汉字',handwriting_select:'确认手写候选字',handwriting_clear:'清空手写笔迹',handwriting_undo:'撤销手写一笔',handwriting_error:'手写识别加载失败',
 village_back:'新手村上一步',village_restart:'从头复习新手村',village_resume:'回到新手村最新进度',
 audio_listen:'词句普通语速播放',audio_slow:'词句慢速播放',
 ...Object.fromEntries(Object.entries(usageAreas).filter(([id])=>id!=='unattributed').map(([id,label])=>['view_'+id,'进入'+label])),
 onboarding_start:'开始新手村',village_skip:'跳过新手村',village_revisit:'重访新手村',mode_change:'切换帮助难度',language_change:'切换辅助语言',
 ai_enable:'开启 AI 建议',ai_disable:'关闭 AI 建议',practice_start:'开始复测或问路',share_view:'打开作品共享',contribution_submit:'提交共建内容',public_work_visit:'参观公开作品',
 build_undo:'建造撤销',build_redo:'建造重做',build_restore:'载入历史作品',build_guide:'查看建造引导',feedback_submit:'提交反馈',data_export:'导出个人数据',draft_export:'导出建造草稿'
};
export function usageArea(tab,state,checkId){
 if(tab==='town')return checkId?'practice':state.onboarding?.chapter==='village'?'village':'market';
 return ({build:'build',board:'board',journal:'journal',trial:'feedback'})[tab]||'unattributed';
}
export function bindRequestedDisclosure(details,onOpen){
 if(!details)return;let requested=false;
 details.querySelector('summary').addEventListener('click',()=>{requested=true;});
 details.addEventListener('toggle',()=>{if(details.open&&requested)onOpen();requested=false;});
}
export function learningActivity(e){return e.type==='learning'||(e.type==='action'&&['hello','drink','invite','answer','continue','writing'].includes(e.action))||(e.type==='feature'&&['audio_listen','audio_slow','writing_demo','writing_trace_complete','writing_independent_complete'].includes(e.feature));}
export function buildingActivity(e){return e.type==='action'&&['place','edit','save'].includes(e.action);}
export function productEvents(type,taskId,result,extra={}){
 if(['audio_listen','audio_slow'].includes(type)&&['hello','tea','water','sit','thanks'].includes(taskId))return [{type:'feature',feature:type,lesson:taskId}];
 if(type.startsWith('writing_')&&Object.hasOwn(behaviorFeatures,type)&&['hello','tea','water','sit','thanks'].includes(taskId))return [{type:'feature',feature:type,lesson:taskId},...(type.endsWith('_complete')?[{type:'action',action:'writing'}]:[])];
 if(['greeting_send','greeting_reply'].includes(type))return [{type:'feature',feature:type},{type:'action',action:type}];
 if(type==='village_action')return [{type:'action',action:taskId},{type:'village_step'},...(taskId==='invite'?[{type:'village_complete'}]:[])];
 if(type==='village_navigation'){
  if(['back','restart','resume'].includes(taskId))return [{type:'feature',feature:'village_'+taskId}];
  if(taskId==='skip')return [{type:'feature',feature:'village_skip'},{type:'market_start'}];
  if(taskId==='market')return [{type:'market_start'}];
  return [{type:'village_step'},...(['profile','revisit'].includes(taskId)?[{type:'feature',feature:taskId==='profile'?'onboarding_start':'village_revisit'}]:[])];
 }
 if(type==='ai_result')return [{type:'action',action:'answer'}];
 if(type==='practice_result')return [{type:'learning',taskId,outcome:result,assistance:extra.assistance,attempt:extra.attempt}];
 if(type==='event_complete')return [{type:'action',action:'continue'},...(taskId==='opening'?[{type:'market_complete'}]:[])];
 if(type==='layout_save')return [{type:'action',action:'save'}];
 if(type==='build_edit')return [{type:'action',action:'edit'}];
 if(type==='help_view')return [{type:'help'}];
 if(type==='operation_failure')return [{type:'failure',operation:extra.operation}];
 if(Object.hasOwn(behaviorFeatures,type))return [{type:'feature',feature:type}];
 return [];
}
