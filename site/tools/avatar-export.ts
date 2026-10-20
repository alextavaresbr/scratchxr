import * as T from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { loadVroidCatalog, defaultVroidRecipe, applyVroidPreset, clearVroidCategory } from '../../../apps/chared/src/vroidData';
import { createVroidCharacter, disposeVroid, prepareVroidGlbMaterials } from '../../../apps/chared/src/vroidCharacter';
import { prepareVroidGlbRig } from '../../../apps/chared/src/vroidGlbRig';
import { addAvatarOutline } from '../src/avatarOutline';
import { retargetToCtr } from '../../../src/core/retarget/retarget-ctr';
import { plantedIdle } from '../src/avatarIdle';

const specs = [
  { id: 'avatar-a', name: 'Luna', gender: 'female', hair: '002', clothes: '107', tint: '#a297d5', hairTint: '#b69782', skinTint: '#ffffff' },
  { id: 'avatar-b', name: 'Leo', gender: 'male', hair: '017', clothes: '104', tint: '#a2e1e4', hairTint: '#6b5143', skinTint: '#e9ba94' },
  { id: 'avatar-c', name: 'Maya', gender: 'female', hair: '009', clothes: '007', tint: '#ffffff', hairTint: '#4b3830', skinTint: '#b98465' },
] as const;

async function exportOne(index: number) {
  const spec = specs[index], catalog = await loadVroidCatalog();
  let recipe = defaultVroidRecipe(catalog, spec.gender);
  for (const [type, label] of [['HairSet', spec.hair], ['ClothingSet', spec.clothes]]) {
    const preset = catalog.presets.find(p => p.type === type && p.label === label && /^[a-f0-9]+$/.test(p.id));
    if (!preset) throw Error('Missing native preset ' + type + '/' + label);
    recipe = applyVroidPreset(recipe, preset, catalog);
  }
  recipe = clearVroidCategory(recipe, 'NeckAccessory', catalog);
  recipe.colors = { ...recipe.colors, hair: spec.hairTint, clothes: spec.tint, skin: spec.skinTint };
  recipe.completeBody = false;
  recipe.shading = 'vroid';
  const root = await createVroidCharacter(catalog, recipe);
  root.name = spec.id;
  prepareVroidGlbMaterials(root);
  prepareVroidGlbRig(root);
  // Keep the explicit source recipe externally, not a bulky copy in every node.
  root.userData = { scratchxr: { id: spec.id, source: 'VRoid Studio standard N00 presets' } };
  const sourceClips = [{ id: '0217', name: 'idle' }, { id: '2244', name: 'walk' }, { id: '2300', name: 'wave' }];
  const clips: T.AnimationClip[] = [];
  const positions = new Map<string, T.Vector3>(), quats = new Map<string, T.Quaternion>();
  root.traverse(o => { if (o instanceof T.Bone) { positions.set(o.name, o.position.clone()); quats.set(o.name, o.quaternion.clone()); } });
  for (const source of sourceClips) {
    const fbx = await new FBXLoader().loadAsync('/mixamo/' + source.id + '.fbx');
    const clip = retargetToCtr(fbx.animations[0], fbx, root, { targetBindPos: positions, targetBindQuats: quats });
    clip.name = source.name;
    for (const track of clip.tracks) if (track.name === 'Hips.position') {
      const base = positions.get('Hips')!;
      for (let i = 0; i < track.values.length; i += 3) { track.values[i] = base.x; track.values[i + 2] = base.z; }
    }
    clip.tracks = clip.tracks.filter(track => {
      const split = track.name.lastIndexOf('.');
      const bone = track.name.slice(0, split), property = track.name.slice(split + 1);
      const rest = property === 'position' ? positions.get(bone)?.toArray() : property === 'quaternion' ? quats.get(bone)?.toArray() : undefined;
      return !rest || Array.from(track.values).some((value, i) => Math.abs(value - rest[i % rest.length]) > 1e-6);
    });
    clips.push(source.name==='idle'?plantedIdle(root,clip):clip.optimize());
  }
  root.animations = clips;
  // Export only operational facial targets. Authoring shape morphs already baked.
  const visemes = ['sil', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR', 'aa', 'E', 'I', 'O', 'U'].map(v => 'viseme_' + v);
  let triangles = 0, vertices = 0;
  const morphNames = new Set<string>();
  root.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    vertices += o.geometry.attributes.position.count;
    const dict = o.morphTargetDictionary;
    if (dict) {
      const keep = Object.entries(dict).filter(([n]) => visemes.includes(n) || !n.includes('.'));
      const attrs = o.geometry.morphAttributes;
      for (const key of Object.keys(attrs)) attrs[key] = keep.map(([, i]) => attrs[key][i]);
      // Surfaces use KHR_materials_unlit. Normal deltas add several MB but have
      // no visual effect with these materials; keep every positional facial target.
      delete attrs.normal;
      o.morphTargetDictionary = Object.fromEntries(keep.map(([n], i) => [n, i]));
      o.morphTargetInfluences = keep.map(() => 0);
      keep.forEach(([n]) => morphNames.add(n));
    }
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
      const m = material as T.MeshStandardMaterial;
      if (m.map?.image) {
        const image = m.map.image;
        if (Math.max(image.width, image.height) > 512) {
          const canvas = document.createElement('canvas'), ratio = 512 / Math.max(image.width, image.height);
          canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
          canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
          m.map.image = canvas; m.map.needsUpdate = true;
        }
      }
    }
  });
  const missingVisemes = visemes.filter(v => !morphNames.has(v));
  if (missingVisemes.length) throw Error('Missing visemes: ' + missingVisemes.join(','));
  const bytes = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true, animations: clips, maxTextureSize: 512 }) as ArrayBuffer;
  const loaded = await new GLTFLoader().parseAsync(bytes, '');
  const roundtrip = loaded.scene;
  roundtrip.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(roundtrip);
  const size = box.getSize(new T.Vector3());
  if (size.y < 1 || size.y > 3) throw Error('Unexpected export scale ' + size.y);
  const mixer = new T.AnimationMixer(roundtrip);
  const audit: object[] = [];
  const visemeDisplacements = Object.fromEntries(visemes.map(v => [v, 0]));
  roundtrip.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    for (const v of visemes) {
      const index = o.morphTargetDictionary?.[v];
      if (index === undefined) continue;
      const target = o.geometry.morphAttributes.position[index];
      for (let i = 0; i < target.count; i++) {
        const delta = Math.hypot(target.getX(i), target.getY(i), target.getZ(i));
        if (!Number.isFinite(delta)) throw Error('Non-finite viseme delta: ' + v);
        visemeDisplacements[v] = Math.max(visemeDisplacements[v], delta);
      }
    }
  });
  for (const [v, delta] of Object.entries(visemeDisplacements)) if (v !== 'viseme_sil' && delta < 1e-5)
    throw Error('Viseme has no facial deformation: ' + v);
  for (const clip of loaded.animations) {
    if (clip.duration < .5) throw Error('Source animation is not a usable cycle: ' + clip.name);
    const action = mixer.clipAction(clip).play(); let maxSize = 0;
    const footPositions: T.Vector3[] = [];
    const handPositions: T.Vector3[] = [];
    for (let f = 0; f < 8; f++) {
      mixer.setTime(f * clip.duration / 8); roundtrip.updateMatrixWorld(true);
      const sampled = new T.Box3();
      roundtrip.traverse(o => {
        if (o instanceof T.SkinnedMesh) for (let i = 0; i < o.geometry.attributes.position.count; i += 17)
          sampled.expandByPoint(o.getVertexPosition(i, new T.Vector3()).applyMatrix4(o.matrixWorld));
      });
      footPositions.push(roundtrip.getObjectByName('LeftFoot')!.getWorldPosition(new T.Vector3()));
      handPositions.push(roundtrip.getObjectByName('RightHand')!.getWorldPosition(new T.Vector3()));
      const bounds = sampled.getSize(new T.Vector3());
      if (!bounds.toArray().every(Number.isFinite) || bounds.length() > 6) throw Error('Invalid animated bounds');
      maxSize = Math.max(maxSize, bounds.length());
    }
    const footMotion = Math.max(...footPositions.map(p => p.distanceTo(footPositions[0])));
    const handMotion = Math.max(...handPositions.map(p => p.distanceTo(handPositions[0])));
    if (clip.name === 'walk' && footMotion < .05) throw Error('Walk cycle does not move feet');
    if (clip.name === 'wave' && handMotion < .05) throw Error('Wave clip does not move the hand');
    action.stop(); audit.push({ name: clip.name, duration: clip.duration, tracks: clip.tracks.length, maxExtent: maxSize, footMotion, handMotion });
  }
  mixer.stopAllAction();
  const idle = loaded.animations.find(c => c.name === 'idle')!;
  mixer.clipAction(idle).play(); mixer.setTime(.2);
  const scene = new T.Scene();
  scene.add(roundtrip, new T.HemisphereLight(0xffffff, 0x7e6a91, 2));
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0); renderer.setSize(1024, 1280); renderer.setPixelRatio(1);
  const camera = new T.PerspectiveCamera(28, .8, .01, 100);
  camera.position.set(.2, size.y * .53, size.y * 2.4); camera.lookAt(0, size.y * .5, 0);
  renderer.render(scene, camera);
  const preview = renderer.domElement.toDataURL('image/png');
  const disposeOutline=addAvatarOutline(roundtrip);
  renderer.setSize(320, 320);
  camera.aspect = 1;
  camera.position.set(0, size.y * .84, size.y * .92);
  camera.lookAt(0, size.y * .82, 0);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const portrait = renderer.domElement.toDataURL('image/png');
  disposeOutline();
  renderer.dispose();
  const metadata = {
    id: spec.id, name: spec.name, model: `/avatars/${spec.id}.glb`, preview: `/avatars/${spec.id}.png`, portrait: `/avatars/${spec.id}-portrait.png`,
    format: 'glb', unit: 'metre', height: size.y, floorOffset: -box.min.y, bounds: { min: box.min.toArray(), max: box.max.toArray() },
    triangles, vertices, bytes: bytes.byteLength, clips: audit, morphs: [...morphNames].sort(), visemes, visemeDisplacements,
    forward: '+Z', upright: '+Y', rootMotion: 'horizontal root motion removed; Scratch bridge moves parent group',
    provenance: { catalog: 'E:/vroid-studio/editor/catalog.json', source: catalog.source, standardPresets: recipe.selections, mixamo: sourceClips },
  };
  let binary = '';
  const array = new Uint8Array(bytes);
  for (let offset = 0; offset < array.length; offset += 32768) binary += String.fromCharCode(...array.subarray(offset, offset + 32768));
  disposeVroid(root);
  return { metadata, recipe, glb: btoa(binary), preview, portrait };
}
(window as any).exportAvatar = exportOne;
(window as any).avatarSpecs = specs;
(window as any).avatarReady = true;
