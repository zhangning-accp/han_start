import {BlockList,isIP,SocketAddress} from 'node:net';
import {readFileSync} from 'node:fs';
import {Reader} from 'maxmind';
import {countryCodes} from '../public/countries.js';
const excluded=new BlockList();
for(const [ip,prefix,type] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3],['::',128,'ipv6'],['::1',128,'ipv6'],['fc00::',7,'ipv6'],['fe80::',10,'ipv6'],['ff00::',8,'ipv6'],['2001:db8::',32,'ipv6']])excluded.addSubnet(ip,prefix,type||'ipv4');
let reader;
try{reader=new Reader(readFileSync(process.env.HAN_GEOIP_DB||new URL('../resources/geoip/country.mmdb',import.meta.url)));}
catch{console.warn('IP country database unavailable; country defaults to UNKNOWN.');}
export function countryFromAddress(address,lookup=ip=>reader?.get(ip)){
 try{
  if(typeof address!=='string'||!isIP(address))return 'UNKNOWN';
  // Node canonicalizes mapped IPv6 addresses, including hexadecimal spelling.
  if(isIP(address)===6)address=new SocketAddress({address,family:'ipv6'}).address.replace(/^::ffff:/,'');
  const type=isIP(address)===6?'ipv6':'ipv4';
  if(excluded.check(address,type))return 'UNKNOWN';
  const code=lookup(address)?.country?.iso_code;
  return countryCodes.includes(code)?code:'UNKNOWN';
 }catch{return 'UNKNOWN';}
}
