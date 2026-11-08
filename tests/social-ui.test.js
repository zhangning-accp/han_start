import {test} from 'node:test';
import assert from 'node:assert/strict';
import {greetingHTML,socialHTML,bindSocial} from '../public/social-ui.js';
import * as socialUI from '../public/social-ui.js';
test('only an opted-in other player has a greeting entry; all pilot languages explain private preset messages',()=>{
 const work={id:'w',layout:{name:'<img src=x>'},greetingsEnabled:true};
 for(const language of ['zh','en','vi','id','pt-BR']){
  const html=greetingHTML(work,{language,name:'<script>x</script>',own:false});
  assert.match(html,/data-greeting="w"/);assert.match(html,/你好/);assert.match(html,/Nǐ hǎo/);assert.match(html,/&lt;script/);assert.doesNotMatch(html,/<script|<img|textarea/);
 }
 assert.equal(greetingHTML(work,{language:'en',own:true}),'');assert.equal(greetingHTML({...work,greetingsEnabled:false},{language:'en'}),'');
});
test('directory renders localized search, recoverable errors and escaped player cards without inventing players',()=>{
 assert.equal(typeof socialUI.playerDirectoryHTML,'function');
 for(const language of ['zh','en','vi','id','pt-BR']){
  const empty=socialUI.playerDirectoryHTML({players:[],total:0,status:'ready'},language);
  assert.match(empty,/data-player-search/);assert.doesNotMatch(empty,/data-player-id/);
  const html=socialUI.playerDirectoryHTML({players:[{id:'p',name:'<script>'}],total:1,status:'ready'},language);
  assert.match(html,/data-player-id="p"/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 }
 assert.match(socialUI.playerDirectoryHTML({status:'error',players:[],total:0},'zh'),/加载失败/);
});
test('settings submit separate discovery consent and controls navigate to players and work sharing',async()=>{
 const fields={enabled:{checked:true},listed:{checked:false},displayName:{value:'Lin'}},settings={elements:fields},find={},publish={},search={elements:{query:{value:'Ana'}}},status={};
 const nodes={'[data-social-settings]':settings,'[data-inbox-status]':status,'[data-find-players]':find,'[data-publish-work]':publish,'[data-player-search]':search};
 const root={querySelectorAll:()=>[],querySelector:s=>nodes[s]||null},calls=[];
 bindSocial(root,{language:'en',drafts:new Map(),api:async(...args)=>calls.push(args),refresh:async()=>{},findPlayers:()=>calls.push('find'),publishWork:()=>calls.push('publish'),searchPlayers:q=>calls.push(q)});
 assert.equal(fields.displayName.disabled,true);
 fields.listed.checked=true;fields.listed.onchange();assert.equal(fields.displayName.required,true);
 settings.onsubmit({preventDefault(){}});assert.deepEqual(calls[0][2],{enabled:true,listed:true,displayName:'Lin'});
 await find.onclick();await publish.onclick();await search.onsubmit({preventDefault(){}});assert.deepEqual(calls.slice(1),['find','publish','Ana']);
 fields.enabled.checked=false;fields.enabled.onchange();assert.equal(fields.listed.checked,false);assert.equal(fields.listed.disabled,true);assert.equal(fields.displayName.disabled,true);
});
test('player search reports failures and a late response cannot replace a newer search',async()=>{
 assert.equal(typeof socialUI.createPlayerSearch,'function');
 const pending=new Map(),search=socialUI.createPlayerSearch(path=>new Promise((resolve,reject)=>pending.set(path,{resolve,reject})));
 const first=search.load('Ana'),second=search.load('Lin');assert.equal(search.state.status,'loading');
 pending.get('social/players?q=Lin').resolve({players:[{id:'l',name:'Lin'}],total:1});await second;
 pending.get('social/players?q=Ana').resolve({players:[{id:'a',name:'Ana'}],total:1});await first;assert.equal(search.state.players[0].name,'Lin');
 const failed=search.load('retry');pending.get('social/players?q=retry').reject(Error('offline'));await failed;
 assert.equal(search.state.status,'error');assert.equal(search.state.players.length,0);assert.equal(search.state.query,'retry');
});
test('discovery status explains work and directory visibility, offers destinations and keeps listing consent separate',()=>{
 const empty=socialHTML({enabled:true,publicWorks:0,received:[],sent:[],directory:{listed:false}},'zh');
 assert.match(empty,/data-find-players/);assert.match(empty,/data-publish-work/);assert.match(empty,/别人暂时无法发现你/);
 assert.match(empty,/name="listed"/);assert.doesNotMatch(empty,/name="listed"[^>]*checked/);assert.match(empty,/name="displayName"/);
 assert.match(socialHTML({enabled:true,publicWorks:1,received:[],sent:[]},'zh'),/可以从作品/);
 assert.match(socialHTML({enabled:true,directory:{listed:true,displayName:'<script>'},received:[],sent:[]},'zh'),/通过昵称找到你/);
 assert.doesNotMatch(socialHTML({enabled:true,directory:{listed:true,displayName:'<script>'},received:[],sent:[]},'zh'),/<script>/);
 assert.match(socialHTML({enabled:false,received:[],sent:[]},'zh'),/接收已关闭/);
});
test('player greeting entry sends a public player ID through the shared greeting form',async()=>{
 const html=greetingHTML({id:'public-id',greetingsEnabled:true},{language:'en',player:true});
 assert.match(html,/data-player-id="public-id"/);
 const fields={name:{value:'Ana'},phrase:{value:'hello'}},button={},status={},form={dataset:{greeting:'public-id',playerId:'public-id'},elements:fields,querySelector:s=>s==='button'?button:status};
 const root={querySelectorAll:s=>s==='[data-greeting]'?[form]:[],querySelector:()=>null};const calls=[];
 bindSocial(root,{language:'en',drafts:new Map(),api:async(...args)=>calls.push(args),refresh:async()=>{}});
 await form.onsubmit({preventDefault(){}});assert.equal(calls[0][2].playerId,'public-id');assert.equal(calls[0][2].workId,undefined);assert.equal(calls[0][2].name,'Ana');
});
test('private inbox distinguishes actual greetings from empty state, escapes names and provides reply and block controls',()=>{
 const empty=socialHTML({enabled:false,received:[],sent:[]},'en');assert.match(empty,/data-social-settings/);assert.doesNotMatch(empty,/data-reply/);
 const html=socialHTML({enabled:true,received:[{id:'g',name:'<script>',phrase:'hello',workName:'Tea',createdAt:'2026-11-07'}],sent:[{id:'s',name:'Me',phrase:'hello',reply:'thanks',workName:'Tea'}]},'en');
 assert.match(html,/data-reply="g"/);assert.match(html,/data-block="g"/);assert.match(html,/&lt;script&gt;/);assert.match(html,/谢谢/);
});
test('greetings stay out of the first tutorial and offer an explicit refresh after unlocking',()=>{
 const inbox={enabled:false,received:[],sent:[]};
 assert.equal(socialHTML(inbox,'en',{available:false}),'');
 assert.match(socialHTML(inbox,'en',{available:true}),/data-refresh-greetings/);
});
