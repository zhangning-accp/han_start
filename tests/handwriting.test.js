import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRecognizer,createHandwritingSession} from '../public/handwriting.js';
const templates=[['一',[[[0,50],[100,50]]]],['十',[[[0,50],[100,50]],[[50,0],[50,100]]]],['人',[[[50,0],[45,50],[0,100]],[[45,40],[65,75],[100,100]]]],['口',[[[0,0],[0,100]],[[0,0],[100,0],[100,100]],[[0,100],[100,100]]]]];
test('full dictionary tolerates beginner stroke order, uneven proportions and a lifted corner',()=>{
 const {characters}=JSON.parse(fs.readFileSync(new URL('../public/handwriting-data/medians.json',import.meta.url),'utf8'));
 const recognize=createRecognizer(characters);
 // Independently drawn paths, not dictionary medians; include realistic order and pen-lift errors.
 const examples=[['十',[[[51,16],[54,45],[50,85]],[[17,43],[48,47],[88,42]]]],['人',[[[57,44],[79,68],[99,83]],[[62,16],[53,53],[19,92]]]],['口',[[[24,24],[19,87]],[[23,22],[82,29]],[[82,29],[90,89]],[[20,86],[88,90]]]]];
 for(const [character,ink] of examples)for(const [label,strokes] of [['uneven',ink],['wide and slanted',ink.map(s=>s.map(([x,y])=>[x*1.5+y*.12,y*.72]))]]){
  const candidates=recognize(strokes);assert.ok(candidates.some(c=>c.character===character),`${character}: ${label}; got ${candidates.map(c=>c.character).join('')}`);
  assert.ok(candidates.length<=8);assert.equal(new Set(candidates.map(c=>c.character)).size,candidates.length);
 }
 assert.deepEqual(recognize([[[10,10],[11,11],[10,10]]]),[],'tiny accidental taps are not characters');
});
test('full bundled dictionary includes independently drawn character examples among candidates',()=>{
 const {characters}=JSON.parse(fs.readFileSync(new URL('../public/handwriting-data/medians.json',import.meta.url),'utf8'));
 const recognize=createRecognizer(characters);
 const examples=[['十',[[[20,44],[49,45],[82,44]],[[50,14],[50,40],[49,74]]]],['人',[[[64,12],[56,55],[20,89]],[[59,43],[78,70],[98,87]]]],['口',[[[25,20],[22,82]],[[26,20],[85,22],[84,83]],[[22,83],[84,85]]]],['水',[[[150,40],[150,230],[130,240]],[[60,100],[110,100],[85,160],[40,200]],[[235,80],[190,125]],[[165,130],[200,190],[250,225]]]]];
 for(const [character,ink] of examples)assert.ok(recognize(ink).some(c=>c.character===character),character);
});
test('handwriting recognition uses drawn geometry, tolerates position/size and rejects empty ink',()=>{
 const recognize=createRecognizer(templates);
 assert.equal(recognize([[[20,44],[49,45],[82,44]],[[50,14],[50,40],[49,74]]])[0]?.character,'十');
 assert.equal(recognize([[[25,20],[22,82]],[[26,20],[85,22],[84,83]],[[22,83],[84,85]]])[0]?.character,'口');
 assert.equal(recognize([[[64,12],[56,55],[20,89]],[[59,43],[78,70],[98,87]]])[0]?.character,'人');
 assert.deepEqual(recognize([]),[]);assert.deepEqual(recognize([[[10,10]]]),[]);assert.deepEqual(recognize([[[NaN,0],[1,2]]]),[]);
});
test('ink can be undone and cleared; only a current candidate can be committed',async()=>{
 const session=createHandwritingSession();
 assert.equal(typeof session.addStroke,'function');
 session.addStroke([[0,50],[100,50]]);session.addStroke([[50,0],[50,100]]);
 assert.equal(session.strokes.length,2);session.undo();assert.equal(session.strokes.length,1);
 await session.recognize(async strokes=>createRecognizer(templates)(strokes));
 assert.equal(session.commit('水'),null);assert.equal(session.commit('一'),'一');assert.equal(session.strokes.length,0);
 session.addStroke([[0,0],[20,20]]);session.clear();assert.equal(session.strokes.length,0);
});
test('late recognition cannot replace newer ink and failures allow retry',async()=>{
 const session=createHandwritingSession();assert.equal(typeof session.recognize,'function');
 session.addStroke([[0,50],[100,50]]);let resolve;
 const pending=session.recognize(()=>new Promise(r=>{resolve=r;}));session.clear();resolve([{character:'一'}]);await pending;assert.deepEqual(session.candidates,[]);
 session.addStroke([[0,50],[100,50]]);await assert.rejects(session.recognize(async()=>{throw Error('offline');}),/offline/);assert.equal(session.strokes.length,1);
 await session.recognize(async()=>[{character:'一'}]);assert.equal(session.commit('一'),'一');
});
