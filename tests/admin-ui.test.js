import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportHTML} from '../public/admin.js';
import {trialReport} from '../src/trial.js';
import fs from 'node:fs';

test('each pilot country has a selectable option in the operations filter',()=>{
 const html=fs.readFileSync(new URL('../public/admin.html',import.meta.url),'utf8');
 for(const [code,name] of [['VN','越南'],['ID','印度尼西亚'],['BR','巴西']])assert.match(html,new RegExp('<option value="'+code+'">'+name+'</option>'));
});
test('operations dashboard distinguishes visitors from registrations, shows empty data and mature denominators',()=>{
 const r=trialReport({identities:[],activity:[],feedback:[]},{from:'2026-11-01',to:'2026-11-07'},Date.UTC(2026,10,7,12));
 const html=reportHTML(r);assert.match(html,/新增免注册账户/);assert.doesNotMatch(html,/注册人数/);assert.match(html,/暂无/);assert.match(html,/UTC/);assert.match(html,/观察/);assert.match(html,/越南/);assert.match(html,/印度尼西亚/);assert.match(html,/巴西/);
 r.feedback=[{id:'x',text:'<script>bad</script>',status:'new',category:'bug',country:'BR',language:'pt-BR',createdAt:'2026-11-07',revision:1,severity:'normal',history:[]}];
 assert.doesNotMatch(reportHTML(r,'feedback'),/<script>bad/);assert.match(reportHTML(r,'feedback'),/&lt;script/);
});

test('feature ranking shows users, uses, frequency and denominator without claiming unmeasured features are unused',()=>{
 const r=trialReport({identities:[],activity:[]},{from:'2026-11-01',to:'2026-11-07'},Date.UTC(2026,10,7,12));
 let html=reportHTML(r,'learning');
 assert.match(html,/功能使用排行/);assert.match(html,/暂无已采集的功能使用记录/);
 assert.match(html,/尚未单独采集/);assert.match(html,/不能据此判断无人使用/);
 r.featureUsage={visitors:4,rows:[{id:'help',label:'查看学习帮助',users:3,uses:9,usesPerUser:3,reach:.75}]};
 html=reportHTML(r,'learning');assert.match(html,/使用人数/);assert.match(html,/使用次数/);assert.match(html,/人均次数/);assert.match(html,/75\.0%/);assert.match(html,/4 位访客/);
 assert.doesNotMatch(html,/暂无已采集的功能使用记录/);
 assert.match(html,/功能区有效时长/);assert.match(html,/国家 × 功能/);assert.match(html,/练习尝试与受阻/);assert.match(reportHTML(r,'accounts'),/账号列表|MD5/);
});
