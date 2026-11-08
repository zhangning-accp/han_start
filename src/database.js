import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync,backup} from 'node:sqlite';
import {packJSON,unpackJSON} from './storage-codec.js';

export function openDatabase(directory,initial){
 fs.mkdirSync(directory,{recursive:true});
 const db=new DatabaseSync(path.join(directory,'han-start.sqlite'));
 if(db.prepare('PRAGMA user_version').get().user_version>2){db.close();throw Error('Database belongs to a newer application version');}
 db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL CHECK(json_valid(value)));
 CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY,credential_hash TEXT UNIQUE,country TEXT NOT NULL,created_at TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)));
 CREATE TABLE IF NOT EXISTS activity (id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,occurred_at TEXT NOT NULL,type TEXT NOT NULL,country TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)),PRIMARY KEY(user_id,id));
 CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,created_at TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)));
 CREATE TABLE IF NOT EXISTS works (id TEXT PRIMARY KEY,owner TEXT,data TEXT NOT NULL CHECK(json_valid(data)));
 CREATE TABLE IF NOT EXISTS contributions (id TEXT PRIMARY KEY,owner TEXT,data TEXT NOT NULL CHECK(json_valid(data)));
 CREATE INDEX IF NOT EXISTS activity_date_country ON activity(occurred_at,country);
 CREATE INDEX IF NOT EXISTS activity_user_date ON activity(user_id,occurred_at);
 CREATE INDEX IF NOT EXISTS feedback_country_status ON feedback(status,created_at);
 CREATE INDEX IF NOT EXISTS works_owner ON works(owner);
 CREATE INDEX IF NOT EXISTS contributions_owner ON contributions(owner);
 `);
 const specs=[
  {table:'visitors',field:'identities',key:r=>r.id,columns:['id','credential_hash','country','created_at'],values:r=>[r.id,r.credentialHash??null,r.country||'UNKNOWN',r.createdAt]},
  {table:'activity',field:'activity',key:r=>r.userId+':'+r.id,columns:['id','user_id','occurred_at','type','country'],values:r=>[r.id,r.userId,r.at,r.type,r.country||'UNKNOWN']},
  {table:'feedback',field:'feedback',key:r=>r.id,columns:['id','owner','created_at','status'],values:r=>[r.id,r.owner,r.createdAt,r.status]},
  {table:'works',field:'works',key:r=>r.id,columns:['id','owner'],values:r=>[r.id,r.owner??null]},
  {table:'contributions',field:'contributions',key:r=>r.id,columns:['id','owner'],values:r=>[r.id,r.owner??null]}
 ];
 function readData(){
  const row=db.prepare("SELECT value FROM app_meta WHERE key='world'").get();
  const s=row?unpackJSON(row.value):initial();
  for(const spec of specs)s[spec.field]=db.prepare(`SELECT data FROM ${spec.table} ORDER BY rowid`).all().map(r=>unpackJSON(r.data));
  return s;
 }
 function read(){db.exec('BEGIN');try{const s=readData();db.exec('COMMIT');return s;}catch(e){db.exec('ROLLBACK');throw e;}}
 function write(s){
  // Explicit column lists and bound values keep user text out of SQL syntax.
  const removals=[];
  for(const spec of specs){
   const old=new Map(db.prepare(`SELECT data FROM ${spec.table}`).all().map(row=>{const r=unpackJSON(row.data);return [spec.key(r),{r,data:JSON.stringify(r)}];}));
   const cols=[...spec.columns,'data'],conflict=spec.table==='activity'?'user_id,id':'id';
   const upsert=db.prepare(`INSERT INTO ${spec.table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')}) ON CONFLICT(${conflict}) DO UPDATE SET ${cols.filter(c=>c!=='id').map(c=>`${c}=excluded.${c}`).join(',')}`);
   for(const row of s[spec.field]||[]){const key=spec.key(row),data=JSON.stringify(row);if(old.get(key)?.data!==data)upsert.run(...spec.values(row),packJSON(row));old.delete(key);}
   for(const {r} of old.values())removals.push({spec,row:r});
  }
  // Delete child records first, then identities. Foreign keys also protect direct maintenance.
  removals.sort((a,b)=>(a.spec.table==='visitors')-(b.spec.table==='visitors'));
  for(const {spec,row} of removals){if(spec.table==='activity')db.prepare('DELETE FROM activity WHERE user_id=? AND id=?').run(row.userId,row.id);else db.prepare(`DELETE FROM ${spec.table} WHERE id=?`).run(row.id);}
  const meta={...s};for(const spec of specs)delete meta[spec.field];
  const data=packJSON(meta);db.prepare("INSERT INTO app_meta(key,value) VALUES ('world',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(data);
 }
 function update(fn){
  db.exec('BEGIN IMMEDIATE');
  try{const s=readData(),result=fn(s);if(result&&typeof result.then==='function')throw Error('SQLite transaction callback must be synchronous');write(s);db.exec('COMMIT');return result;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }
 // A failed import is rolled back; the legacy file is never overwritten or removed.
 db.exec('BEGIN IMMEDIATE');
 try{
  if(db.prepare('PRAGMA user_version').get().user_version<2){
   for(const {table} of specs){const update=db.prepare(`UPDATE ${table} SET data=? WHERE rowid=?`);for(const row of db.prepare(`SELECT rowid,data FROM ${table}`).all())update.run(packJSON(unpackJSON(row.data)),row.rowid);}
   const update=db.prepare('UPDATE app_meta SET value=? WHERE key=?');for(const row of db.prepare('SELECT key,value FROM app_meta').all())update.run(packJSON(unpackJSON(row.value)),row.key);
   db.exec('PRAGMA user_version=2');
  }
  if(!db.prepare("SELECT 1 FROM app_meta WHERE key='world'").get()){
   const legacy=path.join(directory,'world.json');const s=fs.existsSync(legacy)?JSON.parse(fs.readFileSync(legacy,'utf8')):initial();
   if(s.schema!==1||!Array.isArray(s.history)||!Array.isArray(s.contributions))throw Error('Invalid legacy store; migration stopped');
   write(s);db.prepare('INSERT INTO app_meta(key,value) VALUES (?,?)').run('migration',JSON.stringify({version:1,at:new Date().toISOString(),from:fs.existsSync(legacy)?'world.json':'new'}));
  }
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');db.close();throw e;}
 const pruneActivity=(now=Date.now())=>db.prepare('DELETE FROM activity WHERE occurred_at < ?').run(new Date(now-120*86400000).toISOString()).changes;
 return {read,update,pruneActivity,backup:async destination=>{if(fs.existsSync(destination))throw Error('Backup destination already exists');fs.mkdirSync(path.dirname(destination),{recursive:true});await backup(db,destination);const check=new DatabaseSync(destination,{readOnly:true});try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Backup integrity check failed');}finally{check.close();}return destination;}};
}
