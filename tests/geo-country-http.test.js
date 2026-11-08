import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {countryFromAddress} from '../src/geo-country.js';
async function server(t,env={}){
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,PORT:'0',HAN_DATA_DIR:mkdtempSync(join(tmpdir(),'han-geo-http-')),HAN_PORT_FILE:'',HAN_TRUSTED_PROXIES:'127.0.0.1',HAN_GEOIP_DB:'',DEEPSEEK_API_KEY:'',...env},stdio:'pipe'});
 t.after(()=>child.kill());
 const base=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('startup timed out')),10000);child.stdout.on('data',chunk=>{out+=chunk;const m=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('exit',code=>{clearTimeout(timer);reject(Error('server exited '+code));});});
 return async(path,data={},cookie='')=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Han-Request':'1','X-Real-IP':'8.8.8.8',Cookie:cookie},body:JSON.stringify(data)});assert.equal(r.status,200);return {body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};};
}
test('real identity endpoint resolves countries offline through the trusted proxy and preserves explicit opt-out',async t=>{
 const expected=countryFromAddress('8.8.8.8');assert.notEqual(expected,'UNKNOWN','bundled database must load');
 const request=await server(t),opened=await request('/api/identity',{country:'JP',inferredCountry:'JP'});
 assert.equal(opened.body.identity.country,expected);assert.equal(opened.body.identity.countrySource,'ip');assert.equal(opened.body.identity.analytics,false);
 assert.doesNotMatch(JSON.stringify(opened.body),/8\.8\.8\.8/);
 await request('/api/identity/profile',{country:'UNKNOWN',language:'en',timezone:'UTC',analytics:false,noticeVersion:'2026-11-07'},opened.cookie);
 const reopened=await request('/api/identity',{},opened.cookie);assert.equal(reopened.body.identity.country,'UNKNOWN');assert.equal(reopened.body.identity.inferredCountry,'UNKNOWN');
});
test('missing local database and an untrusted proxy both keep identity creation usable without guessing a country',async t=>{
 for(const env of [{HAN_GEOIP_DB:join(tmpdir(),'han-nonexistent-geo.mmdb')},{HAN_TRUSTED_PROXIES:''}]){
  const request=await server(t,env),r=await request('/api/identity');assert.equal(r.body.identity.country,'UNKNOWN');assert.equal(r.body.identity.countrySource,'unknown');
 }
});
