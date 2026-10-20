/**
 * ScratchXR — Planted idle pose with upper-body breathing.
 * Subsistema: EDU. Depende de: Three. Usado por: World, avatar export and previews.
 */
import * as T from 'three';

/** The retargeted breathing clip sways the pelvis without matching foot contact.
 * Keep its hip/leg pose stable while retaining the animated torso and arms.
 * Walk and generated motions are deliberately left untouched.
 */
export function plantedIdle(root:T.Object3D,source:T.AnimationClip):T.AnimationClip{
  const fixed=new Set<string>();
  const hips=root.getObjectByName('Hips');
  for(let o=hips;o;o=o.parent??undefined)fixed.add(o.name);
  for(const side of ['Left','Right'])root.getObjectByName(`${side}UpLeg`)?.traverse(o=>fixed.add(o.name));
  const clip=source.clone();clip.name='idle';
  for(const track of clip.tracks){
    const dot=track.name.lastIndexOf('.');
    if(!fixed.has(track.name.slice(0,dot)))continue;
    const property=track.name.slice(dot+1);
    if(!['position','quaternion','scale'].includes(property))continue;
    const sampler=property==='quaternion'
      ?new T.QuaternionLinearInterpolant(track.times,track.values,track.getValueSize())
      :new T.LinearInterpolant(track.times,track.values,track.getValueSize());
    const pose=Array.from(sampler.evaluate(Math.min(.2,source.duration)) as Float32Array);
    for(let i=0;i<track.values.length;i++)track.values[i]=pose[i%pose.length];
  }
  return clip.optimize();
}
