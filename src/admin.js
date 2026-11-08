import {randomBytes} from 'node:crypto';
import {readStore,updateStore} from './store.js';
import {setAdminPassword} from './identity.js';
const [action,value]=process.argv.slice(2);
if(action==='init'){
 if(readStore().admin){console.error('管理口令已存在。需要重置时运行 npm run admin -- reset。');process.exitCode=1;}
 else{const password=randomBytes(18).toString('base64url');updateStore(s=>setAdminPassword(s,password));console.log('管理口令（请保存到密码管理器）：\n'+password+'\n在 /admin.html 登录。');}
}else if(action==='reset'){
 const password=randomBytes(18).toString('base64url');updateStore(s=>setAdminPassword(s,password));console.log('新管理口令（旧会话已撤销）：\n'+password);
}else if(action==='mark-test'){
 updateStore(s=>{const a=s.identities?.find(a=>a.id===value);if(!a)throw Error('访客不存在');a.isTest=true;});console.log('该访客已标记为测试数据。');
}else console.log('在项目目录执行：\nnpm run admin -- init\nnpm run admin -- reset\nnpm run admin -- mark-test 访客ID');
