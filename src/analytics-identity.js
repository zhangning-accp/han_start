// Statistical grouping only. Ownership and authentication always use the original credential ID.
export function groupAnalytics(s){
 const aliases=new Map(),groups=new Map();
 for(const a of (s.identities||[]).slice().sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))){
  const id=a.accountId||a.id;aliases.set(a.id,id);
  if(!groups.has(id))groups.set(id,{...a,id,browserIdentities:1});
  else{const g=groups.get(id);g.browserIdentities++;g.analytics||=a.analytics;g.analyticsInterrupted||=a.analyticsInterrupted;g.isTest||=a.isTest;
   if(g.cohortCountry==='UNKNOWN'&&a.cohortCountry!=='UNKNOWN')g.cohortCountry=a.cohortCountry;
   if(a.cohortAt&&(!g.cohortAt||a.cohortAt<g.cohortAt))g.cohortAt=a.cohortAt;
  }
 }
 return {...s,identities:[...groups.values()],activity:(s.activity||[]).map(e=>({...e,userId:aliases.get(e.userId)||e.userId})),feedback:(s.feedback||[]).map(f=>({...f,owner:aliases.get(f.owner)||f.owner}))};
}
