/**
 * ScratchXR — Timing, coordinate and ordering invariants.
 * Subsistema: EDU. Depende de: trace. Usado por: Vitest.
 */
import {describe,it,expect} from 'vitest';
import {TraceRecorder,frameAt,worldPosition} from '../trace';
import type {ActorState} from '../types';
const actor:ActorState={id:'a',avatar:'avatar-a',x:0,y:0,direction:90,size:100,visible:true,text:'',costume:0,rotationStyle:'all around'};
describe('Scratch replay semantics',()=>{
  it('keeps ordered instantaneous mutations without inventing a glide',()=>{
    const r=new TraceRecorder();r.begin(1000);
    r.capture(1000,[actor],'forest');r.capture(1200,[{...actor,x:60}],'forest');
    r.capture(1200,[{...actor,x:120,direction:180}],'forest');
    const trace=r.finish(1500);
    expect(trace.frames).toHaveLength(3);expect(trace.frames.map(f=>f.order)).toEqual([0,1,2]);
    expect(frameAt(trace,199)?.actors[0].x).toBe(0);
    expect(frameAt(trace,200)?.actors[0]).toMatchObject({x:120,direction:180});
  });
  it('records independent snapshots and uses ground coordinates',()=>{
    const r=new TraceRecorder();r.begin(0);const mutable={...actor};r.capture(0,[mutable],'village');mutable.x=999;
    const trace=r.finish(500,true,['effects']);
    expect(trace.frames[0].actors[0].x).toBe(0);
    expect(worldPosition({x:120,y:60})).toEqual([2,0,-1]);
    expect(trace).toMatchObject({duration:500,truncated:true,warnings:['effects']});
  });
});
