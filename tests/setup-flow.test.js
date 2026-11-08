import {test} from 'node:test';
import assert from 'node:assert/strict';
import {migrateOnboarding,advanceVillage} from '../public/onboarding.js';
import {villageHTML} from '../public/onboarding-ui.js';
import {profileFields} from '../public/trial-ui.js';
import * as ui from '../public/onboarding-ui.js';
import {createBuilder} from '../public/builder-ui.js';
const ctx={V:k=>k,esc:s=>String(s??'').replaceAll('<','&lt;')};
test('builder keeps the active guide and save action near the canvas, with naming and export in optional settings',()=>{
 const state={onboarding:{chapter:'village',step:3},buildDraft:{name:'Corner',items:[]}};
 const builder=createBuilder({state,getWorks:()=>[],L:zh=>zh,V:k=>k,esc:ctx.esc});
 const html=builder.html();assert.match(html,/<details class="build-options">/);assert.match(html,/<details class="build-options">[\s\S]*id="work-name"[\s\S]*id="export-draft"[\s\S]*<\/details>/);
 assert.match(html,/tableHint/);assert.match(html,/class="actions build-save-actions"/);
 assert.doesNotMatch(html,/class="actions build-save-actions"[^]*id="export-draft"/);
});
test('profile completion waits for country save, preserves choices on failure and allows retry',async()=>{
 assert.equal(typeof ui.bindSetupProfile,'function');
 const state=migrateOnboarding({step:0});Object.assign(state.onboarding,{name:'小雨',mode:'starter',setupStep:2});
 const nodes={'#village-profile':{},'#trial-country':{value:'VN'},'#trial-consent':{checked:false},'#setup-error':{textContent:''}};
 for(const node of Object.values(nodes))node.addEventListener=(type,fn)=>node[type]=fn;
 const actions=[];let fail=true,saves=0;
 ui.bindSetupProfile({querySelector:s=>nodes[s]}, {state,save:()=>saves++,onAction:a=>actions.push(a),saveSettings:async()=>{if(fail)throw Error('offline');},errorText:'请重试'});
 nodes['#trial-country'].change();nodes['#trial-consent'].change();assert.equal(state.onboarding.setupCountry,'VN');assert.equal(state.onboarding.setupAnalytics,false);assert.equal(saves,2);
 const button={disabled:false},event={preventDefault(){},submitter:button};
 await nodes['#village-profile'].submit(event);assert.deepEqual(actions,[]);assert.equal(nodes['#setup-error'].textContent,'请重试');assert.equal(button.disabled,false);
 fail=false;await nodes['#village-profile'].submit(event);assert.deepEqual(actions,[{type:'profile',name:'小雨',mode:'starter'}]);
});
test('setup advances name, difficulty, then country without completing the lesson early',()=>{
 let s=migrateOnboarding({step:0,language:'zh'});
 assert.equal(s.onboarding.setupStep,0);
 assert.throws(()=>advanceVillage(s,{type:'setup_next'}),/village_profile/);
 s.onboarding.name='小雨';s=advanceVillage(s,{type:'setup_next'});assert.equal(s.onboarding.setupStep,1);assert.equal(s.onboarding.step,0);
 s=advanceVillage(s,{type:'mode',mode:'guided'});s=advanceVillage(s,{type:'setup_next'});assert.equal(s.onboarding.setupStep,2);
 s.onboarding.setupCountry='VN';s.onboarding.setupAnalytics=false;
 s=advanceVillage(s,{type:'setup_back'});assert.equal(s.onboarding.setupStep,1);assert.equal(s.onboarding.setupCountry,'VN');assert.equal(s.onboarding.name,'小雨');assert.equal(s.onboarding.mode,'guided');
 assert.equal(migrateOnboarding(s).onboarding.setupStep,1);
 s=advanceVillage(s,{type:'restart'});assert.equal(s.onboarding.setupStep,0);assert.equal(s.onboarding.name,'小雨');
});
test('each setup screen presents one decision, with country explicitly shown on the final screen',()=>{
 const s=migrateOnboarding({step:0,language:'zh'});
 let html=villageHTML(s,ctx);assert.match(html,/id="nickname"/);assert.doesNotMatch(html,/id="start-mode"|id="trial-country"|id="village-language"/);
 s.onboarding.setupStep=1;html=villageHTML(s,ctx);assert.match(html,/id="start-mode"/);assert.doesNotMatch(html,/id="nickname"|id="trial-country"/);assert.match(html,/setup_back/);
 s.onboarding.setupStep=2;html=villageHTML(s,{...ctx,profile:'<select id="trial-country"></select>'});assert.match(html,/id="trial-country"/);assert.doesNotMatch(html,/id="nickname"|id="start-mode"/);assert.match(html,/begin/);
});
test('compact country choice keeps country and optional unchecked analytics visible, with details available',()=>{
 const html=profileFields(null,{T:k=>k,language:'zh',compact:true});
 assert.match(html,/id="trial-country"/);assert.match(html,/value="CN"/);assert.match(html,/value="VN"/);assert.match(html,/value="UNKNOWN"/);
 assert.match(html,/<details/);assert.doesNotMatch(html,/id="trial-consent"[^>]*checked/);
 assert.ok(html.indexOf('id="trial-country"')<html.indexOf('<details'));
});
