import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {openDatabase} from '../src/database.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'han-sqlite-'));
process.env.HAN_DATA_DIR=dir;
const old={schema:1,version:6,works:[{id:'old-work',owner:randomUUID(),revision:3,layout:{name:'Keep me',items:[]},versions:[]}],contributions:[],events:[],history:[],ai:{day:'',calls:0,tokens:0}};
const legacy=JSON.stringify(old);fs.writeFileSync(path.join(dir,'world.json'),legacy);
const store=await import('../src/store.js');
test('legacy world imports once into SQLite tables without changing original data',()=>{
 assert.equal(store.readStore().works[0].revision,3);
 const file=path.join(dir,'han-start.sqlite');assert.equal(fs.existsSync(file),true,'SQLite database must be created');
 const db=new DatabaseSync(file);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM works').get().n,1);db.close();
 store.updateStore(s=>{s.version=7;});assert.equal(store.readStore().version,7);
 assert.equal(fs.readFileSync(path.join(dir,'world.json'),'utf8'),legacy);
});
test('transactions roll back on failure, and usage rows cannot outlive a visitor',()=>{
 const before=store.readStore().version;
 assert.throws(()=>store.updateStore(s=>{s.version=999;throw Error('intentional');}),/intentional/);assert.equal(store.readStore().version,before);
 assert.throws(()=>store.updateStore(s=>{s.activity=[{id:randomUUID(),userId:'missing',at:new Date().toISOString(),type:'action',country:'BR'}];}),/FOREIGN KEY/);
 assert.equal((store.readStore().activity||[]).length,0);
});
test('online backup is a consistent standalone SQLite database',async()=>{
 assert.equal(typeof store.backupStore,'function');
 const file=path.join(dir,'backup.sqlite');await store.backupStore(file);
 const db=new DatabaseSync(file);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM works').get().n,1);db.close();
});

test('maintenance expires only activity older than 120 days without removing visitors or works',()=>{
 const now=Date.parse('2026-11-07T00:00:00Z'),id=randomUUID(),cutoff=now-120*86400000;
 store.updateStore(s=>{s.identities.push({id,country:'VN',createdAt:new Date(now).toISOString()});s.activity=[cutoff-1,cutoff,now].map(at=>({id:randomUUID(),userId:id,at:new Date(at).toISOString(),type:'action',country:'VN'}));});
 assert.equal(typeof store.pruneActivity,'function');
 store.pruneActivity(now);
 assert.equal(store.readStore().activity.length,2);assert.equal(store.readStore().identities.length,1);assert.equal(store.readStore().works.length,1);
});

test('two writer processes preserve every committed update',async()=>{
 const before=store.readStore().version;
 const run=()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',"import {updateStore} from './src/store.js';for(let i=0;i<15;i++)updateStore(s=>{s.version++;});"],{env:{...process.env,HAN_DATA_DIR:dir},stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>error+=d);child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(error)));});
 await Promise.all([run(),run()]);assert.equal(store.readStore().version,before+30);
});

test('SQLite compresses large records losslessly and can reopen their backups',async()=>{
 const payload='越南语学习反馈，保留原文。'.repeat(200);
 store.updateStore(s=>{s.works[0].layout.name=payload;});
 const db=new DatabaseSync(path.join(dir,'han-start.sqlite'),{readOnly:true});
 const raw=db.prepare('SELECT data FROM works WHERE id=?').get('old-work').data;
 assert.ok(Buffer.byteLength(raw)<Buffer.byteLength(payload)/3,'large JSON payload should be compressed on disk');db.close();
 assert.equal(store.readStore().works[0].layout.name,payload);
 const restored=fs.mkdtempSync(path.join(os.tmpdir(),'han-compressed-restore-'));
 await store.backupStore(path.join(restored,'han-start.sqlite'));
 assert.equal(openDatabase(restored,()=>old).read().works[0].layout.name,payload);
});

test('existing SQLite v1 text rows migrate to compressed storage without changing content',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'han-sqlite-v1-')),file=path.join(folder,'han-start.sqlite');
 const db=new DatabaseSync(file);db.exec('CREATE TABLE app_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL CHECK(json_valid(value))); CREATE TABLE works (id TEXT PRIMARY KEY,owner TEXT,data TEXT NOT NULL CHECK(json_valid(data))); PRAGMA user_version=1;');
 db.prepare('INSERT INTO app_meta VALUES (?,?)').run('world',JSON.stringify({...old,works:undefined}));
 const work={...old.works[0],layout:{name:'preserve'.repeat(400),items:[]}};
 db.prepare('INSERT INTO works VALUES (?,?,?)').run(work.id,work.owner,JSON.stringify(work));db.close();
 const upgraded=openDatabase(folder,()=>old);assert.deepEqual(upgraded.read().works[0],work);
 const check=new DatabaseSync(file,{readOnly:true});assert.equal(check.prepare('PRAGMA user_version').get().user_version,2);assert.ok(check.prepare('SELECT length(data) n FROM works').get().n<500);check.close();
});
