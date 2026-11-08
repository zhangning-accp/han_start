import {deflateRawSync,inflateRawSync} from 'node:zlib';
export function packJSON(value){
 const plain=JSON.stringify(value),packed=JSON.stringify({$hanCompressed:1,payload:deflateRawSync(Buffer.from(plain),{level:6}).toString('base64')});
 return Buffer.byteLength(packed)<Buffer.byteLength(plain)?packed:plain;
}
export function unpackJSON(text){
 const value=JSON.parse(text);
 return value?.$hanCompressed===1&&Object.keys(value).length===2?JSON.parse(inflateRawSync(Buffer.from(value.payload,'base64'),{maxOutputLength:64*1024*1024}).toString('utf8')):value;
}
