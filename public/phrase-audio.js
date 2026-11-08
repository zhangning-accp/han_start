const phrases=new Set(['hello','tea','water','sit','thanks']);
export function createPhraseAudio({createAudio=src=>new Audio(src),onStatus=()=>{},onPlay=()=>{}}={}){
 let current=null;
 function stop(){
  if(current){current.onended=null;current.onerror=null;current.pause();current=null;}
  onStatus('idle');
 }
 async function play(id,speed=1){
  stop();
  if(!phrases.has(id)||![1,0.75].includes(speed)){onStatus('error');return false;}
  let clip;
  try{
   clip=createAudio(`/audio/${id}.wav`);current=clip;
   clip.playbackRate=speed;clip.preservesPitch=true;
   clip.onended=()=>{if(current===clip){current=null;onStatus('idle');}};
   clip.onerror=()=>{if(current===clip){stop();onStatus('error');}};
   onStatus('loading');await clip.play();
   if(current!==clip)return false;
   onStatus('playing');onPlay(id,speed);return true;
  }catch{
   if(current===clip){stop();onStatus('error');}
   return false;
  }
 }
 return {play,stop};
}
