import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countryFromAddress} from '../src/geo-country.js';
import {clientAddress} from '../src/trial-http.js';
test('country lookup uses a validated public IPv4 or IPv6 address and gracefully handles lookup failures',()=>{
 const lookup=ip=>({country:{iso_code:ip.includes(':')?'JP':'US'}});
 assert.equal(countryFromAddress('8.8.8.8',lookup),'US');
 assert.equal(countryFromAddress('::ffff:8.8.8.8',lookup),'US');
 assert.equal(countryFromAddress('2001:4860:4860::8888',lookup),'JP');
 for(const ip of ['127.0.0.1','10.1.2.3','192.168.1.3','172.16.0.1','169.254.1.1','100.64.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1','bad','203.0.113.2','2001:db8::1'])
  assert.equal(countryFromAddress(ip,()=>{throw Error('must not lookup private or reserved address');}),'UNKNOWN');
 for(const lookup of [()=>null,()=>({country:{iso_code:'ZZ'}}),()=>{throw Error('missing database');}])assert.equal(countryFromAddress('8.8.8.8',lookup),'UNKNOWN');
});
test('untrusted visitor headers cannot supply the geolocation address',()=>{
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{'x-real-ip':'8.8.8.8','cf-ipcountry':'US'}};
 assert.equal(countryFromAddress(clientAddress(req,''),()=>({country:{iso_code:'US'}})),'UNKNOWN');
 assert.equal(countryFromAddress(clientAddress(req,'127.0.0.1'),()=>({country:{iso_code:'US'}})),'US');
});
