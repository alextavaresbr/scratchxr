/**
 * ScratchXR — Ordered execution recording and playback.
 * Subsistema: EDU. Depende de: types. Usado por: Scratch engine and Three viewer.
 */
import type {ActorState,Trace,TraceFrame} from './types';
import type {SceneId} from './sceneAssets';
export const UNITS_PER_METRE=60;
export function worldPosition(actor:Pick<ActorState,'x'|'y'>):[number,number,number] {
  return [actor.x/UNITS_PER_METRE,0,-actor.y/UNITS_PER_METRE];
}
/** Last mutation wins at equal timestamps; never interpolate an instant Scratch move. */
export function frameAt(trace:Trace,time:number):TraceFrame|undefined {
  let lo=0,hi=trace.frames.length-1,result=-1;
  while(lo<=hi){const mid=(lo+hi)>>>1;if(trace.frames[mid].t<=time){result=mid;lo=mid+1;}else hi=mid-1;}
  return trace.frames[Math.max(0,result)];
}
export class TraceRecorder {
  private frames:TraceFrame[]=[];
  private start=0;
  active=false;
  begin(now:number){this.frames=[];this.start=now;this.active=true;}
  capture(now:number,actors:ActorState[],scene:SceneId){
    if(!this.active)return;
    this.frames.push({t:Math.max(0,now-this.start),order:this.frames.length,
      actors:actors.map(a=>({...a})),scene});
  }
  finish(now:number,truncated=false,warnings:string[]=[]):Trace {
    this.active=false;
    return {frames:this.frames,duration:Math.max(0,now-this.start),truncated,warnings};
  }
}
