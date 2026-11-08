// Single-character, stroke-template matching. This is an input aid, not a writing assessment.
const samples=12;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function valid(strokes){return Array.isArray(strokes)&&strokes.length>0&&strokes.length<=40&&strokes.every(s=>Array.isArray(s)&&s.length>=2&&s.length<=512&&s.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)));}
function resample(stroke){
 const lengths=[0];for(let i=1;i<stroke.length;i++)lengths.push(lengths.at(-1)+distance(stroke[i-1],stroke[i]));
 const total=lengths.at(-1);if(!total)return Array.from({length:samples},()=>stroke[0]);
 let segment=1;return Array.from({length:samples},(_,i)=>{
  const at=total*i/(samples-1);while(segment<lengths.length-1&&lengths[segment]<at)segment++;
  const ratio=(at-lengths[segment-1])/(lengths[segment]-lengths[segment-1]||1),a=stroke[segment-1],b=stroke[segment];
  return [a[0]+ratio*(b[0]-a[0]),a[1]+ratio*(b[1]-a[1])];
 });
}
function normalize(strokes){
 const points=strokes.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY,size=Math.max(w,h);
 if(size<6)return null;
 return strokes.map(s=>resample(s.map(([x,y])=>[(x-minX+(size-w)/2)/size,(y-minY+(size-h)/2)/size])));
}
// Shared geometry for guided writing; the input recognizer keeps its own looser matching rules.
export {resample as sampleStroke,normalize as normalizeInk};
function strokeCost(a,b){
 let forward=0,reverse=0;
 for(let i=0;i<samples;i++){forward+=distance(a[i],b[i]);reverse+=distance(a[i],b[samples-1-i]);}
 return Math.min(forward/samples,reverse/samples+0.035);
}
function score(a,b){
 // Sequence alignment allows a missed or extra stroke, with a penalty.
 let prev=Array.from({length:b.length+1},(_,i)=>i*0.45);
 for(let i=1;i<=a.length;i++){
  const row=[i*0.45];for(let j=1;j<=b.length;j++)row[j]=Math.min(prev[j-1]+strokeCost(a[i-1],b[j-1]),prev[j]+0.45,row[j-1]+0.45);
  prev=row;
 }
 return prev[b.length]/Math.max(a.length,b.length)+Math.abs(a.length-b.length)*0.025;
}
function proportions(strokes){
 const points=strokes.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
 // Do not turn nearly horizontal/vertical marks into a square character.
 if(Math.min(width,height)<0.2)return strokes;
 return strokes.map(s=>s.map(([x,y])=>[(x-left)/width,(y-top)/height]));
}
function unorderedScore(a,b){
 // Minimum-cost one-to-one stroke assignment (Hungarian algorithm). Position
 // still matters; only the order in which the learner drew strokes is relaxed.
 const n=Math.max(a.length,b.length),cost=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i<a.length&&j<b.length?strokeCost(a[i],b[j]):0.45));
 const u=Array(n+1).fill(0),v=Array(n+1).fill(0),p=Array(n+1).fill(0),way=Array(n+1).fill(0);
 for(let i=1;i<=n;i++){
  p[0]=i;let j0=0;const min=Array(n+1).fill(Infinity),used=Array(n+1).fill(false);
  do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
   for(let j=1;j<=n;j++)if(!used[j]){const cur=cost[i0-1][j-1]-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}
   for(let j=0;j<=n;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;
   j0=j1;
  }while(p[j0]!==0);
  do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
 }
 return -v[0]/n+Math.abs(a.length-b.length)*0.025;
}
function joinedVariants(ink){
 // A learner may lift the pen in the middle of a corner. Only join adjacent,
 // nearby ends, never arbitrary disconnected components or distant strokes.
 return ink.slice(0,-1).map((s,i)=>({i,gap:distance(s.at(-1),ink[i+1][0])})).filter(x=>x.gap<0.16).sort((a,b)=>a.gap-b.gap).slice(0,6).map(({i})=>[...ink.slice(0,i),resample([...ink[i],...ink[i+1]]),...ink.slice(i+2)]);
}
function shapeDescriptor(strokes){
 const grid=Array(36).fill(0),weight=1/(strokes.length*samples);
 for(const stroke of strokes)for(const [x,y] of stroke){const gx=Math.max(0,Math.min(5,x*5)),gy=Math.max(0,Math.min(5,y*5)),ix=Math.min(4,Math.floor(gx)),iy=Math.min(4,Math.floor(gy)),dx=gx-ix,dy=gy-iy;
  grid[iy*6+ix]+=weight*(1-dx)*(1-dy);grid[iy*6+ix+1]+=weight*dx*(1-dy);grid[(iy+1)*6+ix]+=weight*(1-dx)*dy;grid[(iy+1)*6+ix+1]+=weight*dx*dy;
 }
 return grid;
}
const descriptorCost=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0);
export function createRecognizer(templates){
 const prepared=templates.filter(([,s])=>valid(s)).map(([character,s])=>({character,strokes:normalize(s)})).filter(t=>t.strokes).map(t=>({...t,proportional:proportions(t.strokes)})).map(t=>({...t,descriptor:shapeDescriptor(t.strokes),proportionalDescriptor:shapeDescriptor(t.proportional)}));
 return strokes=>{
  if(!valid(strokes))return [];
  const ink=normalize(strokes);if(!ink)return [];
  const variants=[{ink,penalty:0},...joinedVariants(ink).map(joined=>({ink:joined,penalty:0.03}))].map(v=>({...v,proportional:proportions(v.ink)})).map(v=>({...v,descriptor:shapeDescriptor(v.ink),proportionalDescriptor:shapeDescriptor(v.proportional)}));
  // Cheap order-independent shape screening bounds the expensive stroke matching
  // for common 10–15 stroke characters on a mobile browser.
  const shortlist=prepared.filter(t=>Math.abs(t.strokes.length-ink.length)<=2).map(t=>({t,cost:Math.min(...variants.map(v=>Math.min(descriptorCost(v.descriptor,t.descriptor),descriptorCost(v.proportionalDescriptor,t.proportionalDescriptor)+0.04)+Math.abs(t.strokes.length-v.ink.length)*0.04))})).sort((a,b)=>a.cost-b.cost).slice(0,128);
  return shortlist.map(({t})=>{
   let best=score(ink,t.strokes);
   for(const variant of variants){if(Math.abs(t.strokes.length-variant.ink.length)>1)continue;
    best=Math.min(best,unorderedScore(variant.ink,t.strokes)+0.012+variant.penalty,unorderedScore(variant.proportional,t.proportional)+0.025+variant.penalty);
   }
   return {character:t.character,score:best};
  }).filter(t=>t.score<0.32).sort((a,b)=>a.score-b.score).slice(0,8);
 };
}
export function createHandwritingSession(){
 let strokes=[],candidates=[],revision=0;
 const invalidate=()=>{revision++;candidates=[];};
 return {
  get strokes(){return structuredClone(strokes);},get candidates(){return candidates.map(c=>({...c}));},
  addStroke(stroke){if(strokes.length>=40||!valid([stroke]))return false;strokes.push(structuredClone(stroke));invalidate();return true;},
  undo(){strokes.pop();invalidate();},clear(){strokes=[];invalidate();},
  async recognize(recognizer){const request=++revision;candidates=[];const found=await recognizer(structuredClone(strokes));if(revision===request)candidates=found;return revision===request;},
  commit(character){if(!candidates.some(c=>c.character===character))return null;strokes=[];invalidate();return character;}
 };
}
