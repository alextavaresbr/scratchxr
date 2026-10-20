/**
 * ScratchXR — SOMA30 motion mapped onto exported standard VRoid bind poses.
 * Subsistema: EDU. Depende de: Three, motionPolicy. Usado por: World.
 */
import * as T from 'three';
import type {MotionData} from './types';
import {validateMotionData} from './motionPolicy';
const parents=[-1,0,1,2,3,4,5,6,6,6,3,10,11,12,13,13,3,16,17,18,19,19,0,22,23,24,0,26,27,28];
const names=['Hips','Spine','Spine1','Spine2','Neck','','Head','','','','LeftShoulder','LeftArm','LeftForeArm','LeftHand','','',
  'RightShoulder','RightArm','RightForeArm','RightHand','','','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase'];
export interface BindBone {bone:T.Bone;local:T.Quaternion;world:T.Quaternion;position:T.Vector3}
export function captureBind(root:T.Group):BindBone[]{
  root.updateMatrixWorld(true);const result:BindBone[]=[];
  root.traverse(o=>{if((o as T.Bone).isBone)result.push({bone:o as T.Bone,local:o.quaternion.clone(),
    world:o.getWorldQuaternion(new T.Quaternion()),position:o.position.clone()});});
  return result;
}
/** Rotation deltas are evaluated in world space, then resolved through helper parents. */
export function motionClip(data:MotionData,bind:BindBone[]):T.AnimationClip{
  validateMotionData(data);
  const times=Array.from({length:data.frames},(_,i)=>i/data.fps);
  const tracks:T.KeyframeTrack[]=[];
  const rotations=new Map(bind.map(b=>[b.bone.name,[] as number[]]));
  const hipPositions:number[]=[];
  const initial=data.roots.slice(0,3);
  for(let f=0;f<data.frames;f++){
    const source:T.Quaternion[]=[];
    for(let i=0;i<30;i++){
      const q=new T.Quaternion().fromArray(data.rotations,(f*30+i)*4).normalize();
      source.push(parents[i]<0?q:source[parents[i]].clone().multiply(q));
    }
    const world=new Map<string,T.Quaternion>();
    for(const entry of bind){
      const index=names.indexOf(entry.bone.name);
      const parent=entry.bone.parent;
      const parentQ=parent?world.get(parent.name)??parent.getWorldQuaternion(new T.Quaternion()):new T.Quaternion();
      const desired=index>=0?source[index].clone().multiply(entry.world):parentQ.clone().multiply(entry.local);
      const local=parentQ.clone().invert().multiply(desired).normalize();
      const values=rotations.get(entry.bone.name)!;
      if(values.length&&local.dot(new T.Quaternion().fromArray(values,values.length-4))<0)local.set(-local.x,-local.y,-local.z,-local.w);
      values.push(...local.toArray());world.set(entry.bone.name,desired);
      if(entry.bone.name==='Hips')hipPositions.push(entry.position.x+data.roots[f*3]-initial[0],
        entry.position.y+data.roots[f*3+1]-initial[1],entry.position.z+data.roots[f*3+2]-initial[2]);
    }
  }
  for(const [name,values]of rotations)tracks.push(new T.QuaternionKeyframeTrack(`${name}.quaternion`,times,values));
  if(hipPositions.length)tracks.push(new T.VectorKeyframeTrack('Hips.position',times,hipPositions));
  return new T.AnimationClip(`generated-${data.id}`,(data.frames-1)/data.fps,tracks);
}
