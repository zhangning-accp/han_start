import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateLayout,reviseLayout} from '../public/building.js';
import {saveWork,prepareContribution,snapshot} from '../src/works.js';
import {initial,moderate,publicWorld} from '../src/store.js';
import {choose,languages,lessonEnglish,errors,statusText,residentEnglish} from '../public/i18n.js';
import {translations} from '../public/translations.js';
import {tasks} from '../public/content.js';
const layout=()=>({name:'My tea stall',items:[{id:'a',type:'table',x:0,y:0,rotation:0,text:''},{id:'b',type:'sign',x:2,y:0,rotation:0,text:'欢迎光临'},{id:'c',type:'plant',x:0,y:2,rotation:0,text:''}]});
test('building checks footprints, rotations, boundaries, IDs, text, limits and completion',()=>{
 assert.deepEqual(validateLayout(layout(),{complete:true}),layout());
 const rotated=reviseLayout(layout(),{type:'update',id:'a',rotation:90});assert.equal(rotated.items[0].rotation,90);
 assert.throws(()=>reviseLayout(layout(),{type:'update',id:'a',x:4}),/out_of_bounds/);
 assert.throws(()=>reviseLayout(layout(),{type:'update',id:'b',x:1}),/collision/);
 assert.throws(()=>reviseLayout(layout(),{type:'update',id:'b',text:'x'.repeat(25)}),/invalid_component/);
 const invalid=layout();invalid.items[0].type='script';assert.throws(()=>validateLayout(invalid));
 const duplicate=layout();duplicate.items[1].id='a';assert.throws(()=>validateLayout(duplicate));
 assert.throws(()=>validateLayout({name:'X',items:[]},{complete:true}),/missing_components/);
 assert.equal(layout().items[0].rotation,0,'editing is immutable and supports undo snapshots');
});
test('private ownership, immutable revisions, saved update conflicts and public review snapshots',()=>{
 const s=initial(),work=saveWork(s,'owner',{layout:layout()});
 assert.equal(publicWorld(s).works.length,0);
 assert.throws(()=>saveWork(s,'other',{id:work.id,revision:1,layout:layout()}),/not_owner/);
 assert.throws(()=>saveWork(s,'owner',{id:work.id,revision:0,layout:layout()}),/version_conflict/);
 const second=reviseLayout(layout(),{type:'update',id:'c',x:4,y:3});
 saveWork(s,'owner',{id:work.id,revision:1,layout:second});assert.equal(work.versions[0].layout.items[2].x,0);assert.equal(work.layout.items[2].x,4);
 const details=prepareContribution(s,'owner',{kind:'build',workId:work.id,workRevision:2});
 assert.throws(()=>prepareContribution(s,'other',{kind:'build',workId:work.id,workRevision:2}),/not_owner/);
 const c={id:'build',kind:'build',owner:'owner',author:'Builder',text:'My independently placed layout',status:'submitted',audit:[],...details};s.contributions.push(c);
 for(const action of ['review','approve','publish'])moderate(s,c.id,action,'Reviewed layout','Reviewer');
 const published=snapshot(s).works[0];assert.equal(published.layout.items[2].x,4);assert.equal(published.author,'Builder');
 saveWork(s,'owner',{id:work.id,revision:2,layout:layout()});assert.equal(snapshot(s).works[0].layout.items[2].x,4,'private edits do not mutate public copies');
 assert.throws(()=>prepareContribution(s,'owner',{kind:'build',workId:work.id,workRevision:3,basePublishedVersion:0}),/version_conflict/);
 const fix=prepareContribution(s,'other',{kind:'correction',workId:work.id,itemId:'b',replacement:'欢迎来喝茶',basePublishedVersion:2});
 const correction={id:'fix',kind:'correction',author:'Editor',text:'A more specific invitation',status:'submitted',audit:[],...fix};s.contributions.push(correction);
 for(const action of ['review','approve','publish'])moderate(s,'fix',action,'Checked Chinese','Proofreader');
 assert.equal(snapshot(s).works[0].author,'Builder');assert.deepEqual(snapshot(s).works[0].editors,['Builder','Editor']);assert.equal(snapshot(s).works[0].reviewer,'Proofreader');
 assert.equal(s.history[0].snapshot.works[0].layout.items[1].text,'欢迎光临','previous public version preserved for rollback');
 assert.equal(snapshot({history:[s.history[0]]}).works[0].layout.items[1].text,'欢迎光临');
 const stale={...correction,id:'stale',status:'approved',audit:[]};s.contributions.push(stale);assert.throws(()=>moderate(s,'stale','publish','Late edit','Reviewer'),/version_conflict/);assert.equal(stale.status,'approved');
});
test('pilot language coverage for UI, help, errors and status; content stays Chinese',()=>{
 const keys=new Set();
 for(const file of ['app.js','builder-ui.js']){
  const source=fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
  for(const match of source.matchAll(/L\('(?:[^'\\]|\\.)*','((?:[^'\\]|\\.)*)'\)/g))keys.add(match[1]);
 }
 for(const t of Object.values(lessonEnglish))for(const [k,v] of Object.entries(t))if(k!=='place')keys.add(v);
 for(const t of tasks)keys.add(t.en);
 for(const pair of Object.values(errors))keys.add(pair[1]);for(const pair of Object.values(statusText))keys.add(pair[1]);
 for(const r of residentEnglish){keys.add(r.role);keys.add(r.bio);}
 const missing=[];for(const key of keys)for(const lang of ['vi','id','pt-BR'])if(!translations[key]?.[lang])missing.push(lang+': '+key);
 assert.deepEqual(missing,[]);
 assert.equal(languages.length,5);assert.equal(choose('vi','建设','Build'),'Xây dựng');assert.equal(choose('id','建设','Build'),'Bangun');assert.equal(choose('pt-BR','建设','Build'),'Construir');
 assert.match(tasks[0].line,/你好/);
});
