/**
 * ScratchXR — Gentle head and iris tracking for the conversation's N00 avatars.
 * Subsistema: EDU. Depende de: Three. Usado por: World.
 * Follows the head/residual-eye approach of zEngine's StarsAttention, with
 * N00 iris morphs: rotating its flat sclera would expose holes.
 */
import {Euler,MathUtils,Mesh,Object3D,Quaternion,Vector3} from 'three';

const DEG=Math.PI/180;
export class AvatarAttention {
  private head?:Object3D;
  private base=new Quaternion();
  private faceInBone=new Quaternion();
  private inverseFace=new Quaternion();
  private eyeInBone=new Vector3();
  private frame=new Quaternion();
  private offset=new Quaternion();
  private inverse=new Quaternion();
  private euler=new Euler();
  private point=new Vector3();
  private direction=new Vector3();
  private meshes:Mesh[]=[];
  private yaw=0;
  private pitch=0;
  private eyeYaw=0;
  private eyePitch=0;
  private tracking=false;
  get state(){return {tracking:this.tracking,yaw:this.yaw,pitch:this.pitch,eyeYaw:this.eyeYaw,eyePitch:this.eyePitch};}

  constructor(root:Object3D){
    this.head=root.getObjectByName('Head');
    if(!this.head?.parent)return;
    root.updateWorldMatrix(true,true);
    this.base.copy(this.head.quaternion);
    // Undo the rig's tilted head axes to recover the avatar's neutral +Z face.
    this.head.getWorldQuaternion(this.faceInBone).invert();
    root.getWorldQuaternion(this.frame);this.faceInBone.multiply(this.frame);
    this.inverseFace.copy(this.faceInBone).invert();
    const left=root.getObjectByName('J_Adj_L_FaceEyeSet'),right=root.getObjectByName('J_Adj_R_FaceEyeSet');
    if(left&&right){
      left.getWorldPosition(this.eyeInBone);right.getWorldPosition(this.point);
      this.eyeInBone.add(this.point).multiplyScalar(.5);
      this.head.worldToLocal(this.eyeInBone);
    }
    root.traverse(object=>{
      if(object instanceof Mesh&&!object.userData.scratchxrOutline&&object.morphTargetDictionary?.eyeLookInLeft!==undefined)this.meshes.push(object);
    });
  }
  /** Remove the previous correction before the mixer, even for unkeyed heads. */
  beforeMixer(){if(this.head)this.head.quaternion.copy(this.base);}

  update(delta:number,target:Vector3|null,now:number){
    const head=this.head;if(!head?.parent)return;
    const dt=MathUtils.clamp(delta,0,.05);
    this.base.copy(head.quaternion);
    head.parent.getWorldQuaternion(this.frame).multiply(this.base).multiply(this.faceInBone);
    head.updateWorldMatrix(true,false);
    this.point.copy(this.eyeInBone).applyMatrix4(head.matrixWorld);
    let h=0,v=0,follow=false;
    if(target){
      this.direction.copy(target).sub(this.point);
      const distance=this.direction.length();
      this.direction.applyQuaternion(this.inverse.copy(this.frame).invert());
      h=Math.atan2(this.direction.x,this.direction.z);
      v=Math.atan2(this.direction.y,Math.hypot(this.direction.x,this.direction.z));
      follow=distance>.15&&distance<(this.tracking?14:12)&&Math.abs(h)<(this.tracking?88:80)*DEG&&Math.abs(v)<65*DEG;
    }
    this.tracking=follow;
    const remaining=(angle:number,dead:number)=>Math.sign(angle)*Math.max(0,Math.abs(angle)-dead);
    const headH=follow?MathUtils.clamp(remaining(h,2*DEG),-55*DEG,55*DEG):0;
    const headV=follow?MathUtils.clamp(remaining(v,1.5*DEG),-25*DEG,30*DEG):0;
    const slow=1-Math.exp(-4*dt);
    this.yaw+=(headH-this.yaw)*slow;this.pitch+=(headV-this.pitch)*slow;
    this.offset.setFromEuler(this.euler.set(-this.pitch,this.yaw,0,'YXZ'));
    head.quaternion.copy(this.base).multiply(this.faceInBone).multiply(this.offset).multiply(this.inverseFace);
    head.updateWorldMatrix(true,true);
    let eyeH=0,eyeV=0;
    if(follow&&target){
      this.point.copy(this.eyeInBone).applyMatrix4(head.matrixWorld);
      head.getWorldQuaternion(this.frame).multiply(this.faceInBone).invert();
      this.direction.copy(target).sub(this.point).applyQuaternion(this.frame);
      // Eyes settle faster than the head, with tiny shifts of fixation.
      const fixation=Math.floor(now/420);
      eyeH=Math.atan2(this.direction.x,this.direction.z)+Math.sin(fixation*2.4)*.004;
      eyeV=Math.atan2(this.direction.y,Math.hypot(this.direction.x,this.direction.z))+Math.sin(fixation*1.7)*.003;
    }
    const fast=1-Math.exp(-18*dt);
    this.eyeYaw+=(MathUtils.clamp(eyeH,-.09,.09)-this.eyeYaw)*fast;
    this.eyePitch+=(MathUtils.clamp(eyeV,-.06,.06)-this.eyePitch)*fast;
    for(const mesh of this.meshes){
      const dict=mesh.morphTargetDictionary!,weights=mesh.morphTargetInfluences!;
      const set=(name:string,value:number)=>{if(dict[name]!==undefined)weights[dict[name]]=Math.max(0,value);};
      set('eyeLookOutLeft',this.eyeYaw/.1);set('eyeLookInLeft',-this.eyeYaw/.1);
      set('eyeLookInRight',this.eyeYaw/.1);set('eyeLookOutRight',-this.eyeYaw/.1);
      for(const side of ['Left','Right']){
        set(`eyeLookUp${side}`,this.eyePitch/.08);set(`eyeLookDown${side}`,-this.eyePitch/.08);
      }
      set('eyesLookUp',0);set('eyesLookDown',0);
    }
  }
}
