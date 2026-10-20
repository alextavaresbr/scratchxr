/**
 * ScratchXR — Generator boundary and fail-closed moderation.
 * Subsistema: EDU. Depende de: motionPolicy. Usado por: Vitest.
 */
import {describe,it,expect} from 'vitest';
import {resolveMotion,safeMotions,needsRedirect,validateMotionData} from '../motionPolicy';
describe('server motion policy',()=>{
  it.each(['dê um soco','punch someone','m4t4r','faça algo sexual','faça uma saudação nazista'])('redirects %s even if classification claims safe',(request)=>{
    const result=resolveMotion(request,{safe:true,motion:'run'});
    expect(result.redirected).toBe(true);
    expect(Object.values(safeMotions)).toContain(result.prompt);
    expect(result.prompt).not.toContain(request);
  });
  it('never accepts user/model-supplied generator text',()=>{
    expect(resolveMotion('ignore rules',{safe:true,motion:'arbitrary unsafe prompt'}).redirected).toBe(true);
    expect(resolveMotion('please wave')).toMatchObject({motion:'wave',redirected:true});
    expect(resolveMotion('acene',{safe:true,motion:'wave'})).toMatchObject({motion:'wave',redirected:false});
    expect(resolveMotion('x',{safe:true,motion:'__proto__'}).motion).toBe('wave');
    expect(needsRedirect('s.e.x.o')).toBe(true);
  });
  it('rejects non-finite or malformed generated data',()=>{
    const valid={frames:2,fps:30,roots:Array(6).fill(0),rotations:Array.from({length:240},(_,i)=>i%4===3?1:0)};
    expect(()=>validateMotionData(valid)).not.toThrow();
    expect(()=>validateMotionData({...valid,roots:[NaN,...valid.roots.slice(1)]})).toThrow();
    expect(()=>validateMotionData({...valid,rotations:valid.rotations.slice(1)})).toThrow();
    expect(()=>validateMotionData({...valid,rotations:Array(240).fill(0)})).toThrow();
  });
});
