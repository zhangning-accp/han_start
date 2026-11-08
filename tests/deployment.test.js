import http from 'node:http';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
function request(url,options={}){return new Promise((resolve,reject)=>{const r=http.request(url,options,res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:{get:key=>Array.isArray(res.headers[key])?res.headers[key].join(';'):res.headers[key]}}));});r.on('error',reject);r.end(options.body);});}
test('slot deployment publishes the allocated loopback port and permits only its configured origin',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'han-slot-')),portFile=path.join(dir,'port');
 const origin='https://stu60-8.space.aiec.wflaiedu.com';
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,PORT:'0',HAN_PORT_FILE:portFile,HAN_PUBLIC_ORIGIN:origin,HAN_SECURE_COOKIE:'1',HAN_DATA_DIR:dir,DEEPSEEK_API_KEY:''},stdio:'pipe'});
 try{
  const output=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('startup timeout')),6000);child.stdout.once('data',d=>{clearTimeout(timeout);resolve(d.toString());});child.once('error',reject);});
  const port=Number(output.match(/127\.0\.0\.1:(\d+)/)?.[1]);assert.ok(port>0,'must report actual allocated port');assert.equal(fs.readFileSync(portFile,'utf8').trim(),String(port));
  const base='http://127.0.0.1:'+port,host=new URL(origin).host;
  assert.equal((await request(base)).status,200);
  assert.equal((await request(base,{headers:{Host:host}})).status,200);
  assert.equal((await request(base,{headers:{Host:'unrelated.example'}})).status,403);
  const post=headers=>request(base+'/api/identity',{method:'POST',headers:{Host:host,'Content-Type':'application/json','X-Han-Request':'1',...headers},body:'{}'});
  assert.equal((await post({Origin:'https://evil.example'})).status,403);
  const identity=await post({Origin:origin});assert.equal(identity.status,200);assert.match(identity.headers.get('set-cookie'),/; Secure/);
 }finally{child.kill();}
});
