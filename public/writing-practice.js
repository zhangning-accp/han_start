import {sampleStroke,normalizeInk} from './handwriting.js';
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function checkWriting(ink,template,stage='trace'){
 if(!Array.isArray(ink)||!ink.length||ink.some(s=>!Array.isArray(s)||s.length<2||s.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))))return {ok:false,reason:'empty'};
 if(ink.length!==template.length)return {ok:false,reason:'count',expected:template.length,actual:ink.length};
 const points=ink.flat(),size=Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])),height=Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]));
 if(Math.max(size,height)<60)return {ok:false,reason:'small'};
 const normalized=strokes=>normalizeInk(strokes)?.map(s=>s.map(p=>p.map(n=>n*300)));
 const drawn=stage==='trace'?ink.map(sampleStroke):normalized(ink),expected=stage==='trace'?template.map(sampleStroke):normalized(template);
 if(!drawn||!expected)return {ok:false,reason:'empty'};
 for(let i=0;i<drawn.length;i++){
  const a=drawn[i],b=expected[i],limit=stage==='trace'?24:36;
  if(distance(a[0],b[0])>limit*1.8||distance(a.at(-1),b.at(-1))>limit*1.8)return {ok:false,reason:'direction',stroke:i+1};
  if(a.reduce((sum,p,j)=>sum+distance(p,b[j]),0)/a.length>limit)return {ok:false,reason:'shape',stroke:i+1};
 }
 return {ok:true};
}
export function createWritingPractice(template){
 const p={stage:'trace',traceDone:false,independentDone:false,finished:false,skipped:false,
  check(ink){if(p.skipped||p.finished)return {ok:false,reason:'finished'};const result=checkWriting(ink,template,p.stage);if(result.ok){p.finished=true;if(p.stage==='trace')p.traceDone=true;else p.independentDone=true;}return result;},
  independent(){if(!p.traceDone)return false;p.stage='independent';p.retry();return true;},
  retry(){p.finished=false;p.skipped=false;},
  skip(){p.skipped=true;p.finished=false;}
 };return p;
}
