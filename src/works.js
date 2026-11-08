import {randomUUID} from 'node:crypto';
import {validateLayout} from '../public/building.js';
export function saveWork(s,owner,input){
 s.works??=[];
 const layout=validateLayout(input.layout);
 let work=input.id?s.works.find(w=>w.id===input.id):null;
 if(input.id&&(!work||work.owner!==owner))throw Error('not_owner');
 if(work&&work.revision!==input.revision)throw Error('version_conflict');
 if(!work){work={id:randomUUID(),owner,revision:0,versions:[]};s.works.push(work);}
 work.revision++;work.layout=layout;
 work.versions.push({revision:work.revision,layout:structuredClone(layout),time:new Date().toISOString()});
 return work;
}
export function snapshot(s){
 const latest=s.history.at(-1);
 return structuredClone(latest?.snapshot??{feature:latest?.feature??null,works:[]});
}
export function prepareContribution(s,owner,b){
 if(b.kind==='build'){
  const work=s.works?.find(w=>w.id===b.workId&&w.owner===owner);
  if(!work)throw Error('not_owner');
  if(work.revision!==b.workRevision)throw Error('version_conflict');
  validateLayout(work.layout,{complete:true});
  const publishedVersion=snapshot(s).works.find(w=>w.id===work.id)?.publishedVersion??0;
  if((b.basePublishedVersion??0)!==publishedVersion)throw Error('version_conflict');
  return {workId:work.id,workRevision:work.revision,layout:structuredClone(work.layout),basePublishedVersion:publishedVersion};
 }
 if(b.kind==='correction'){
  const work=snapshot(s).works.find(w=>w.id===b.workId);
  if(!work||work.publishedVersion!==b.basePublishedVersion)throw Error('version_conflict');
  if(!work.layout.items.some(i=>i.id===b.itemId&&i.type==='sign')||typeof b.replacement!=='string'||!b.replacement.trim()||b.replacement.length>24)throw Error('invalid_correction');
  return {workId:work.id,itemId:b.itemId,replacement:b.replacement.trim(),basePublishedVersion:work.publishedVersion};
 }
 return {};
}
export function publishContribution(s,c,reviewer){
 const next=snapshot(s);
 if(c.kind==='build'||c.kind==='correction'){
  const existing=next.works.find(w=>w.id===c.workId);
  if((existing?.publishedVersion??0)!==c.basePublishedVersion)throw Error('version_conflict');
  if(c.kind==='build'){
   validateLayout(c.layout,{complete:true});
   const work={id:c.workId,layout:structuredClone(c.layout),author:existing?.author??c.author,editors:[...(existing?.editors??[]),c.author],reviewer,publishedVersion:s.version+1,contributionId:c.id};
   next.works=next.works.filter(w=>w.id!==c.workId);next.works.push(work);
  }else{
   const item=existing.layout.items.find(i=>i.id===c.itemId&&i.type==='sign');if(!item)throw Error('invalid_correction');
   item.text=c.replacement;existing.editors.push(c.author);existing.reviewer=reviewer;existing.publishedVersion=s.version+1;
  }
 }else next.feature='directions';
 return next;
}
