import {test} from 'node:test';
import assert from 'node:assert/strict';
import {navigationHTML,progressHTML,learningControls} from '../public/onboarding-ui.js';
import {migrateOnboarding} from '../public/onboarding.js';
import {villageText} from '../public/village-copy.js';
import * as learning from '../public/onboarding-ui.js';
test('culture gallery presents landscapes, clean energy, smart technology and high-speed rail in all support languages',()=>{
 assert.equal(typeof learning.cultureHTML,'function');
 for(const lang of ['zh','en','vi','id','pt-BR']){
  const html=learning.cultureHTML({V:key=>villageText(key,lang)});
  for(const name of ['city-frieze.svg','community-scroll.svg','learning-scroll.svg','rail-scroll.svg'])assert.match(html,new RegExp(name));
  assert.doesNotMatch(html,/undefined|cultureTitle|cultureRail/);
 }
 const html=learning.cultureHTML({V:key=>villageText(key,'zh')});assert.match(html,/无人机/);assert.match(html,/高铁/);assert.match(html,/机器人/);assert.match(html,/光伏/);
});
test('achievement page shows dated facts, change over time and traceable sources instead of decorative captions alone',()=>{
 const html=learning.cultureHTML({V:key=>villageText(key,'zh')});
 for(const fact of ['5.04','1652.4','12.0','328.7','77.3','1.2','2025','2020','2026-11-08'])assert.ok(html.includes(fact),fact);
 assert.equal((html.match(/class="achievement-fact"/g)||[]).length,6);
 assert.match(html,/stats.gov.cn/);assert.match(html,/caac.gov.cn/);assert.match(html,/nda.gov.cn/);assert.match(html,/rails.cn/);
 assert.match(html,/营业里程/);assert.match(html,/装机容量/);assert.match(html,/注册无人机/);assert.match(html,/产量/);
 assert.match(html,/rel="noreferrer"/);
});
const ctx={V:key=>villageText(key,'en')};
test('restart and back are visible without opening settings, with resume after going back',()=>{
 const s=migrateOnboarding({step:0});s.onboarding.step=3;
 let html=learningControls(s,ctx).split('<details')[0];
 assert.match(html,/data-village="back"/);assert.match(html,/data-village="restart"/);
 s.onboarding.step=0;s.onboarding.furthestStep=3;html=learningControls(s,ctx).split('<details')[0];
 assert.match(html,/data-village="back"[^>]*disabled/);assert.match(html,/data-village="resume"/);
 assert.match(progressHTML(s,ctx),/3 \/ 5/);
 s.onboarding.chapter='market';html=learningControls(s,ctx).split('<details')[0];assert.match(html,/data-village="restart"/);assert.doesNotMatch(html,/data-village="back"/);
});
test('new learners see learning and progress; optional activities unlock after the guide',()=>{
 const state=migrateOnboarding({step:0});
 let html=navigationHTML(state,'town',false,ctx);
 assert.match(html,/data-tab="culture"/);
 assert.match(html,/data-tab="town"/);assert.match(html,/data-tab="journal"/);
 assert.doesNotMatch(html,/data-tab="build"|data-tab="board"/);
 state.onboarding.step=3;assert.doesNotMatch(navigationHTML(state,'town',false,ctx),/data-tab="build"/);
 state.onboarding.completed=true;html=navigationHTML(state,'board',false,ctx);
 assert.match(html,/<details[^>]*>[\s\S]*data-tab="build"[\s\S]*data-tab="board"[\s\S]*<\/details>/);
 assert.match(html,/data-tab="board" class="active"/);
 const legacy=migrateOnboarding({step:5});assert.match(navigationHTML(legacy,'town',false,ctx),/data-tab="build"/);
});
test('progress explains both chapters and offers one clear resume action',()=>{
 const state=migrateOnboarding({step:0});state.onboarding.step=2;
 const html=progressHTML(state,ctx);
 assert.match(html,/2 \/ 5/);assert.match(html,/0 \/ 5/);assert.match(html,/data-go="town"/);
 assert.match(html,/data-village="revisit"/);assert.doesNotMatch(html,/data-go="build"|data-go="board"/);
});
