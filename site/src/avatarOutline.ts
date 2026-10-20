/**
 * ScratchXR — Thin avatar silhouettes with skinning, visemes and alpha cutouts.
 * Subsistema: EDU. Depende de: Three. Usado por: World, avatar preview/export.
 * GLB presets do not retain VRoid/MToon outline shaders, so add them at render time.
 */
import {BackSide,Material,Mesh,MeshBasicMaterial,Object3D,SkinnedMesh,Vector2,Vector4} from 'three';

export function addAvatarOutline(root:Object3D):()=>void{
  const sources:Mesh[]=[];
  root.traverse(object=>{if(object instanceof Mesh&&!object.userData.scratchxrOutline&&object.geometry.hasAttribute('normal'))sources.push(object);});
  const materials=new Map<Material,MeshBasicMaterial>(),shells:Mesh[]=[];
  const viewport=new Vector4();
  function outline(source:Material){
    const cached=materials.get(source);if(cached)return cached;
    const surface=source as MeshBasicMaterial;
    // Eye, eyelash and mouth details already have painted lines; avoid dark halos.
    const visible=source.visible&&!/Eye|FaceMouth|FaceBrow/i.test(source.name);
    const material=new MeshBasicMaterial({
      name:`${source.name}_thin_outline`,color:'#45384f',side:BackSide,
      map:surface.map??null,alphaMap:surface.alphaMap??null,alphaTest:source.alphaTest,
      depthWrite:false,toneMapped:false,visible,
    });
    const resolution={value:new Vector2(1,1)},thickness={value:.8};
    material.onBeforeCompile=shader=>{
      shader.uniforms.outlineResolution=resolution;shader.uniforms.outlinePixels=thickness;
      shader.vertexShader='uniform vec2 outlineResolution;\nuniform float outlinePixels;\n'+shader.vertexShader
        .replace('#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )','#if 1')
        .replace('#include <project_vertex>',`#include <project_vertex>
          vec3 outlineViewNormal = normalize(normalMatrix * objectNormal);
          vec2 outlineDirection = (projectionMatrix * vec4(outlineViewNormal, 0.0)).xy * outlineResolution;
          float outlineLength = length(outlineDirection);
          if (outlineLength > 0.00001) {
            gl_Position.xy += outlineDirection / outlineLength * 2.0 * outlinePixels / outlineResolution * gl_Position.w;
          }`);
      // Preserve the original texture alpha without tinting the ink by its RGB.
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = diffuse;');
    };
    material.customProgramCacheKey=()=> 'scratchxr-thin-outline-v1';
    material.userData.outlineResolution=resolution;
    material.userData.outlineThickness=thickness;
    materials.set(source,material);return material;
  }
  for(const source of sources){
    const shellMaterials=Array.isArray(source.material)?source.material.map(outline):outline(source.material);
    const shell=source instanceof SkinnedMesh?new SkinnedMesh(source.geometry,shellMaterials):new Mesh(source.geometry,shellMaterials);
    if(shell instanceof SkinnedMesh&&source instanceof SkinnedMesh){
      shell.bindMode=source.bindMode;shell.bind(source.skeleton,source.bindMatrix);
    }
    shell.name=`${source.name}_outline`;shell.userData.scratchxrOutline=true;
    shell.morphTargetDictionary=source.morphTargetDictionary;shell.morphTargetInfluences=source.morphTargetInfluences;
    shell.frustumCulled=source.frustumCulled;shell.renderOrder=source.renderOrder+1;
    shell.castShadow=false;shell.receiveShadow=false;
    shell.onBeforeRender=(renderer,_scene,_camera,_geometry,material)=>{
      renderer.getCurrentViewport(viewport);
      material.userData.outlineResolution.value.set(Math.max(1,viewport.z),Math.max(1,viewport.w));
      material.userData.outlineThickness.value=.8*renderer.getPixelRatio();
    };
    source.add(shell);shells.push(shell);
  }
  return()=>{shells.forEach(shell=>shell.removeFromParent());materials.forEach(material=>material.dispose());};
}
