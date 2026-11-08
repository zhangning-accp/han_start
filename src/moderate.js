import {readStore,updateStore,moderate,record} from './store.js';
import {snapshot} from './works.js';
const [action,id,reason,reviewer]=process.argv.slice(2);
try{
 if(action==='list')console.log(JSON.stringify(readStore().contributions.map(({owner,...c})=>c),null,2));
 else if(action==='export')console.log(JSON.stringify(readStore(),null,2));
 else if(action==='rollback'){
   if(!reason||!reviewer)throw Error('需要理由和审核者');
   updateStore(s=>{const target=Number(id);const h=s.history.find(h=>h.version===target);if(target!==1&&!h)throw Error('不存在该版本');const restored=target===1?{feature:null,works:[]}:snapshot({history:[h]});s.version++;for(const w of restored.works)w.publishedVersion=s.version;s.history.push({version:s.version,time:new Date().toISOString(),author:'维护者',reviewer,change:`恢复世界版本 ${target}`,reason,feature:restored.feature,snapshot:restored});record(s,'world_publish',{result:'rollback'});});console.log('已创建回滚版本，个人任务不变。');
 }else if(['review','revise','approve','reject','archive','publish'].includes(action))console.log(JSON.stringify(updateStore(s=>moderate(s,id,action,reason,reviewer)),null,2));
 else console.log('用法：npm run moderate -- list\n审核：npm run moderate -- review|revise|approve|reject|archive|publish ID "理由" "审核者"\n发布会启用预审的入口指路牌与问路事件；请只批准相关建议。\n回滚：npm run moderate -- rollback 版本号 "理由" "审核者"\n请先停止本地服务再维护，完成后重启。');
}catch(e){console.error(e.message);process.exitCode=1;}
