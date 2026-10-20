/**
 * ScratchXR — Visual review and deterministic 2D backdrops from the actual scene.
 * Subsistema: EDU. Depende de: Three, sceneGeometry. Usado por: render-backdrops.py.
 */
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createEnvironment,addEnvironmentLights} from '../src/sceneGeometry';
import {sceneById,type SceneId} from '../src/sceneAssets';
import {plantedIdle} from '../src/avatarIdle';
import {addAvatarOutline} from '../src/avatarOutline';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const avatar=await new GLTFLoader().loadAsync('/avatars/avatar-a.glb');
addAvatarOutline(avatar.scene);
avatar.scene.position.y=.02;avatar.scene.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=true;});
const mixer=new T.AnimationMixer(avatar.scene);mixer.clipAction(plantedIdle(avatar.scene,avatar.animations.find(c=>c.name==='idle')!)).play();mixer.update(.5);
let environment:T.Group|undefined;
function render(id:SceneId,mode:'review'|'backdrop'|'panorama'|'conversation'='review'){
  if(environment)environment.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});
  const scene=new T.Scene(),spec=sceneById[id];scene.background=new T.Color(spec.skyColor);scene.fog=new T.Fog(spec.skyColor,30,85);
  addEnvironmentLights(scene);environment=createEnvironment(id);scene.add(environment);
  const flat=mode==='backdrop'||mode==='panorama',halfWidth=mode==='panorama'?79.2:13.2;
  const camera=flat?new T.OrthographicCamera(-halfWidth,halfWidth,9.9,-9.9,.1,180):new T.PerspectiveCamera(42,1.6,.05,180);
  if(flat){renderer.setSize(mode==='panorama'?5760:960,720);camera.position.set(0,17,21);camera.lookAt(0,0,-3);}
  else{
    renderer.setSize(1280,800);scene.add(avatar.scene);
    camera.position.set(...(mode==='conversation'?[0,1.45,3.6]:[7,5,10]) as [number,number,number]);
    camera.lookAt(...(mode==='conversation'?[0,1.05,0]:[0,.7,-2]) as [number,number,number]);
  }
  camera.updateProjectionMatrix();renderer.render(scene,camera);
  return {image:renderer.domElement.toDataURL('image/png'),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
    meshes:environment.children.length,source:environment.userData.source};
}
async function auditIdle(){
  const report=[];
  for(const id of ['avatar-a','avatar-b','avatar-c']){
    const gltf=await new GLTFLoader().loadAsync(`/avatars/${id}.glb`),root=clone(gltf.scene);
    const idle=gltf.animations.find(c=>c.name==='idle')!,walk=gltf.animations.find(c=>c.name==='walk')!;
    const before=JSON.stringify(idle.toJSON()),fixed=plantedIdle(root,idle);
    if(before!==JSON.stringify(idle.toJSON()))throw new Error('Source clip mutated');
    function motion(clip:T.AnimationClip){
      const mixer=new T.AnimationMixer(root),action=mixer.clipAction(clip);action.play();
      const names=['LeftFoot','RightFoot','Head'],first=new Map<string,T.Vector3>(),motion:Record<string,number>={};
      for(let i=0;i<=120;i++){
        mixer.setTime(clip.duration*i/120);root.updateMatrixWorld(true);
        for(const name of names){
          const pos=root.getObjectByName(name)!.getWorldPosition(new T.Vector3());
          if(!i)first.set(name,pos.clone());
          motion[name]=Math.max(motion[name]||0,pos.distanceTo(first.get(name)!));
        }
      }
      action.stop();mixer.uncacheRoot(root);return motion;
    }
    const original=motion(idle),corrected=motion(fixed),walking=motion(walk);
    if(corrected.LeftFoot>1e-5||corrected.RightFoot>1e-5)throw new Error(`${id}: idle foot drift`);
    if(corrected.Head<1e-4)throw new Error(`${id}: breathing lost`);
    if(walking.LeftFoot<.05)throw new Error(`${id}: walk motion lost`);
    report.push({id,original,corrected,walking});
  }
  return report;
}
async function renderAvatar(id:string,outlined=false){
  const gltf=await new GLTFLoader().loadAsync(`/avatars/${id}.glb`),root=gltf.scene;
  const bounds=new T.Box3().setFromObject(root),height=bounds.getSize(new T.Vector3()).y;
  const mixer=new T.AnimationMixer(root);
  mixer.clipAction(plantedIdle(root,gltf.animations.find(c=>c.name==='idle')!)).play();mixer.setTime(.2);
  let disposeOutline=outlined?addAvatarOutline(root):()=>{};
  const scene=new T.Scene();scene.add(root,new T.HemisphereLight(0xffffff,0x7e6a91,2));
  const previewRenderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  previewRenderer.setClearColor(0x000000,0);previewRenderer.setPixelRatio(1);previewRenderer.setSize(1024,1280);
  const camera=new T.PerspectiveCamera(28,.8,.01,100);
  camera.position.set(.2,height*.53,height*2.4);camera.lookAt(0,height*.5,0);
  previewRenderer.render(scene,camera);
  const preview=previewRenderer.domElement.toDataURL('image/png');
  // The stage cutout has no ink border; selection portraits retain the 3D style.
  if(!outlined)disposeOutline=addAvatarOutline(root);
  previewRenderer.setSize(320,320);camera.aspect=1;
  camera.position.set(0,height*.84,height*.92);camera.lookAt(0,height*.82,0);camera.updateProjectionMatrix();
  previewRenderer.render(scene,camera);
  const portrait=previewRenderer.domElement.toDataURL('image/png');
  disposeOutline();previewRenderer.dispose();
  root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose();}}});
  return {preview,portrait};
}
(window as any).scenePreview={render,auditIdle,renderAvatar};
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-scene]'))button.onclick=()=>render(button.dataset.scene as SceneId);
render('forest');
