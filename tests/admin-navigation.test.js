import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as admin from '../public/admin.js';
import {trialReport} from '../src/trial.js';
const report=()=>trialReport({identities:[],activity:[],feedback:[]},{from:'2026-11-01',to:'2026-11-07'},Date.UTC(2026,10,7,12));
test('overview is focused; behavior, feedback and account pages are separate destinations',()=>{
 const r=report(),html=admin.reportHTML(r);
 assert.match(html,/首次可观察会话/);assert.doesNotMatch(html,/功能使用排行|意见跟进|个人使用明细|练习尝试与受阻/);
 assert.match(admin.reportHTML(r,'learning'),/练习尝试与受阻/);
 assert.doesNotMatch(admin.reportHTML(r,'learning'),/意见跟进/);
 assert.match(admin.reportHTML(r,'feedback'),/意见跟进/);
 assert.match(admin.reportHTML(r,'accounts'),/账号列表/);
});
test('account detail is clearly named and scoped, shows translated stages and preserves the list query',()=>{
 assert.equal(typeof admin.visitorDetailHTML,'function');
 assert.equal(typeof admin.detailQuery,'function');
 const query='?from=2026-11-01&to=2026-11-07&source=reddit';const id='a'.repeat(32);
 const scoped=admin.detailQuery(query,id);assert.equal(new URLSearchParams(scoped).get('source'),'reddit');assert.equal(new URLSearchParams(scoped).get('visitor'),id);assert.doesNotMatch(query,/visitor/);
 const r=report();r.accounts=[{id,country:'US',countrySource:'ip',analytics:false,createdAt:'2026-11-05T10:20:00Z',language:'en'}];r.visitorUsage=[{id,lastScene:'village:2',lastAt:'2026-11-05T10:22:00Z',activeSeconds:60,events:3,modules:[]}];
 const html=admin.visitorDetailHTML(r,id);
 assert.match(html,/账号详情/);assert.match(html,/返回账号列表/);assert.match(html,/IP 推测/);assert.match(html,/未同意统计/);assert.match(html,/点饮品/);assert.doesNotMatch(html,/>village:2<|周活|月活/);
 assert.match(admin.visitorDetailHTML(report(),id),/未找到/);
});
