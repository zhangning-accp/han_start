// The server computes MD5, persists only the account digest and discards these inputs.
export function fingerprintSource(s){
 return JSON.stringify(['han-start-fp-v1',s.userAgent,s.platform,s.languages,[s.width,s.height].sort((a,b)=>a-b),s.colorDepth,s.pixelRatio,s.cores,s.touch,s.timezone]);
}
export function browserFingerprint(){
 try{return {userAgent:navigator.userAgent,platform:navigator.platform,languages:[...navigator.languages].slice(0,10),width:screen.width,height:screen.height,colorDepth:screen.colorDepth,pixelRatio:devicePixelRatio,cores:navigator.hardwareConcurrency||0,touch:navigator.maxTouchPoints||0,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||''};}catch{return null;}
}
