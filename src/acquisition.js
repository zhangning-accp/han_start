// Uses the first observed session, never infers an exit reason from silence.
export function acquisitionReport(visitors,events,start,end,now){
 const cohort=visitors.filter(a=>Date.parse(a.createdAt)>=start&&Date.parse(a.createdAt)<end);
 let observed=0,started=0,completed=0,pending=0;const lastSteps=new Map();
 for(const a of cohort){
  if(!a.analytics||a.analyticsInterrupted||!a.firstSession)continue;
  const first=Date.parse(a.firstObservedAt),until=Math.min(now,first+86400000);
  const es=events.filter(e=>e.userId===a.id&&e.sessionId===a.firstSession&&Date.parse(e.at)>=first&&Date.parse(e.at)<=until).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  if(!es.length)continue;observed++;if(now<first+86400000)pending++;
  const begin=es.find(e=>e.type==='feature'&&e.feature==='onboarding_start');
  if(begin){started++;if(es.some(e=>e.type==='village_complete'&&e.at>=begin.at))completed++;}
  const scene=es.at(-1).scene||'unknown';lastSteps.set(scene,(lastSteps.get(scene)||0)+1);
 }
 return {identified:cohort.length,observed,unobserved:cohort.length-observed,started,completed,pending,startRate:observed?started/observed:null,completionRate:started?completed/started:null,lastSteps:[...lastSteps].map(([scene,users])=>({scene,users}))};
}
