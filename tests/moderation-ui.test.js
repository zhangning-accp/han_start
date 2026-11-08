import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as admin from '../public/admin.js';
import * as builder from '../public/builder-ui.js';
test('successful submission opens the review section and focuses its visible receipt',()=>{
 assert.equal(typeof builder.showSubmissionStatus,'function');
 const details={open:false},receipt={textContent:'',focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}};
 builder.showSubmissionStatus({querySelector:s=>s==='.sharing-options'?details:s==='#submit-result'?receipt:null},'已提交，等待网站管理员审核。');
 assert.equal(details.open,true);assert.match(receipt.textContent,/网站管理员/);assert.equal(receipt.focused,true);assert.equal(receipt.scrolled,true);
});
test('review form sends the displayed revision and preserves entered notes when rejected',async()=>{
 const buttons=[{disabled:false},{disabled:false}],message={textContent:''};let call,reloads=0;
 const form={dataset:{moderation:'one',status:'submitted',revision:'3'},elements:{reason:{value:'请修改招牌'},reviewer:{value:'管理员'}},querySelectorAll:()=>buttons,querySelector:()=>message};
 const root={querySelector:()=>null,querySelectorAll:()=>[form]};
 admin.bindModeration(root,{request:async(...args)=>{call=args;throw Error('409');},reload:async()=>reloads++});
 await form.onsubmit({preventDefault(){},submitter:{value:'revise'}});
 assert.deepEqual(call,['contributions','POST',{id:'one',status:'submitted',revision:3,action:'revise',reason:'请修改招牌',reviewer:'管理员'}]);
 assert.match(message.textContent,/刷新/);assert.equal(form.elements.reason.value,'请修改招牌');assert.equal(buttons[0].disabled,false);assert.equal(reloads,0);
 admin.bindModeration(root,{request:async()=>{},reload:async()=>{reloads++;throw Error('offline');}});
 await form.onsubmit({preventDefault(){},submitter:{value:'publish'}});
 assert.match(message.textContent,/处理已保存/);assert.equal(buttons[0].disabled,true);assert.equal(reloads,1);
});
test('review page previews submissions, escapes text and offers only valid actions',()=>{
 assert.equal(typeof admin.moderationHTML,'function');
 const c={id:'one',kind:'build',status:'submitted',author:'<script>',text:'A garden',created:'2026-11-08',audit:[],workRevision:1,layout:{name:'My garden',items:[]}};
 const html=admin.moderationHTML([c]);assert.match(html,/My garden/);assert.match(html,/<svg/);assert.match(html,/通过并发布/);assert.match(html,/要求修改/);assert.match(html,/拒绝/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 for(const status of ['changes','rejected','withdrawn','published','archived'])assert.doesNotMatch(admin.moderationHTML([{...c,status}]),/data-moderation=/);
 assert.match(admin.moderationHTML([{...c,status:'approved'}]),/发布/);
 assert.match(admin.moderationHTML([]),/暂无投稿/);
});
