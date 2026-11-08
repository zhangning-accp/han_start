import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as http from '../src/trial-http.js';
import * as ui from '../public/trial-ui.js';
test('rate limits isolate visitors only behind explicitly trusted proxies',()=>{
 const req=(remote,ip)=>({socket:{remoteAddress:remote},headers:{'x-real-ip':ip,'x-forwarded-for':'1.2.3.4'}});
 assert.equal(typeof http.clientAddress,'function');
 assert.equal(http.clientAddress(req('127.0.0.1','203.0.113.1'),'127.0.0.1'),'203.0.113.1');
 assert.equal(http.clientAddress(req('127.0.0.1','203.0.113.2'),'127.0.0.1'),'203.0.113.2');
 assert.equal(http.clientAddress(req('127.0.0.1','203.0.113.1'),''),'127.0.0.1');
 assert.equal(http.clientAddress(req('198.51.100.1','203.0.113.1'),'127.0.0.1'),'198.51.100.1');
 assert.equal(http.clientAddress(req('127.0.0.1','203.0.113.1, 1.2.3.4'),'127.0.0.1'),'127.0.0.1');
});
test('free trial dates are honest before opening, during trial and after its end',()=>{
 assert.equal(typeof ui.trialNotice,'function');
 assert.match(ui.trialNotice({startDate:null,days:30},'en'),/not set/i);
 assert.match(ui.trialNotice({startDate:'2026-11-07',days:30},'en',Date.UTC(2026,10,8)),/2026-12-07/);
 assert.match(ui.trialNotice({startDate:'2026-11-07',days:30},'en',Date.UTC(2026,11,8)),/ended/i);
 assert.match(ui.trialNotice({startDate:'2026-11-07',days:30},'en'),/no automatic charges/i);
});
