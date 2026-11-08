import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPhraseAudio} from '../public/phrase-audio.js';

function fixture(){
 const clips=[],statuses=[],plays=[];
 const player=createPhraseAudio({createAudio:src=>{const clip={src,paused:false,currentTime:0,play:async()=>{},pause(){this.paused=true;}};clips.push(clip);return clip;},onStatus:s=>statuses.push(s),onPlay:(...args)=>plays.push(args)});
 return {player,clips,statuses,plays};
}
test('writing audio plays a dedicated character clip and shares cancellation with sentence audio',async()=>{
 const {player,clips,statuses}=fixture();
 for(const lesson of ['hello','tea','water','sit','thanks']){
  assert.equal(await player.play('character-'+lesson),true);
  assert.equal(clips.at(-1).src,`/audio/character-${lesson}.wav`);
 }
 const last=clips.at(-1);await player.play('hello');assert.equal(last.paused,true);
 await player.play('character-hello');assert.equal(clips.at(-2).paused,true);
 clips.at(-1).onerror();assert.equal(statuses.at(-1),'error');
 assert.equal(await player.play('character-missing'),false);
});
test('replay starts a fresh clip, stops previous audio and supports slow listening',async()=>{
 const {player,clips,statuses,plays}=fixture();
 assert.equal(await player.play('tea',1),true);assert.equal(clips[0].src,'/audio/tea.wav');assert.equal(clips[0].playbackRate,1);
 assert.equal(await player.play('tea',0.75),true);assert.equal(clips[0].paused,true);assert.equal(clips[1].playbackRate,0.75);
 assert.equal(clips[1].preservesPitch,true);assert.equal(clips[1].currentTime,0);
 assert.deepEqual(plays,[['tea',1],['tea',0.75]]);assert.equal(statuses.at(-1),'playing');
 clips[1].onended();assert.equal(statuses.at(-1),'idle');
 await player.play('water');player.stop();assert.equal(clips[2].paused,true);assert.equal(statuses.at(-1),'idle');
});
test('failed and superseded playback cannot report success or override the new clip',async()=>{
 const statuses=[],plays=[];let rejectOld;const clips=[];
 const player=createPhraseAudio({createAudio:()=>{const clip={pause(){},play:()=>clips.length===1?new Promise((_,reject)=>{rejectOld=reject;}):Promise.resolve()};clips.push(clip);return clip;},onStatus:s=>statuses.push(s),onPlay:(...args)=>plays.push(args)});
 const old=player.play('hello');assert.equal(await player.play('water'),true);rejectOld(Error('interrupted'));assert.equal(await old,false);assert.equal(statuses.at(-1),'playing');assert.deepEqual(plays,[['water',1]]);
 clips[1].onerror();assert.equal(statuses.at(-1),'error');
 assert.equal(await player.play('../private'),false);assert.equal(clips.length,2);
 const failing=createPhraseAudio({createAudio:()=>({pause(){},play:async()=>{throw Error('offline');}}),onStatus:s=>statuses.push(s)});
 assert.equal(await failing.play('tea'),false);assert.equal(statuses.at(-1),'error');
});
