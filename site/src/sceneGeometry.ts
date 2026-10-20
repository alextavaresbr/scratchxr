/**
 * ScratchXR — Original pastel architecture and landscape, built from geometry.
 * Subsistema: EDU. Depende de: Three, sceneAssets. Usado por: World, backdrop export.
 * No downloaded meshes or textures. All layouts keep the central 10 × 10 m clear.
 */
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {sceneById,type SceneId} from './sceneAssets';

const C={cream:'#f6e9d3',stone:'#dfcdb3',wood:'#977259',woodLight:'#c9a07a',
  trunk:'#9e806b',mint:'#9cbbaa',sage:'#799d86',leaf:'#bfd1a5',pink:'#dca8ae',
  purple:'#a29abb',blue:'#709eac',glass:'#a6c7c8',copper:'#b98970',
  yellow:'#efc77d',dark:'#516d72',white:'#fff4df',
  treeLeaf:'#9db79c',treeShade:'#8fae9b',treeLight:'#b5c69c'};
type Point=[number,number,number];

/** Baked, merged static meshes keep draw calls bounded in stereo rendering. */
class Workshop{
  root=new T.Group();
  private materials=new Map<string,T.MeshStandardMaterial>();
  material(color:string,vertexColors=false){
    const key=color+vertexColors;
    let m=this.materials.get(key);
    if(!m){m=new T.MeshStandardMaterial({color,vertexColors,roughness:.92,metalness:0});this.materials.set(key,m);}
    return m;
  }
  mesh(g:T.BufferGeometry,color:string,p:Point=[0,0,0],parent:T.Group=this.root){
    const m=new T.Mesh(g,this.material(color,!!g.getAttribute('color')));m.position.fromArray(p);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  box(p:Point,s:Point,color:string,parent=this.root,r=.07){
    return this.mesh(r?new RoundedBoxGeometry(...s,1,Math.min(r,...s.map(n=>n*.4))):new T.BoxGeometry(...s),color,p,parent);
  }
  ball(p:Point,s:Point,color:string,parent=this.root,detail=1){
    const m=this.mesh(new T.IcosahedronGeometry(1,detail),color,p,parent);m.scale.fromArray(s);return m;
  }
  cylinder(p:Point,top:number,bottom:number,h:number,color:string,parent=this.root,n=12){
    return this.mesh(new T.CylinderGeometry(top,bottom,h,n),color,p,parent);
  }
  pole(a:Point,b:Point,r:number,color:string,parent=this.root){
    const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);
    const m=this.cylinder(va.add(vb).multiplyScalar(.5).toArray() as Point,r,r,d.length(),color,parent,8);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;
  }
  group(x:number,z:number,angle=0,scale=1){
    const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;g.scale.setScalar(scale);this.root.add(g);return g;
  }
  disk(x:number,z:number,rx:number,rz:number,color:string,y=.018,parent=this.root){
    const m=this.mesh(new T.CircleGeometry(1,64),color,[x,y,z],parent);
    m.rotation.x=-Math.PI/2;m.scale.set(rx,rz,1);m.castShadow=false;return m;
  }
  path(points:Point[],width:number,color:string,y=.023){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),v:number[]=[],idx:number[]=[];
    const count=72;
    for(let i=0;i<=count;i++){
      const p=curve.getPoint(i/count),d=curve.getTangent(i/count),n=new T.Vector3(-d.z,0,d.x).normalize().multiplyScalar(width/2);
      v.push(p.x+n.x,y,p.z+n.z,p.x-n.x,y,p.z-n.z);
      if(i<count){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setIndex(idx);geo.computeVertexNormals();
    const mesh=this.mesh(geo,color);mesh.castShadow=false;return mesh;
  }
  finish(id:SceneId){
    this.root.updateMatrixWorld(true);
    const batches=new Map<string,{material:T.Material;shadow:boolean;receive:boolean;parts:T.BufferGeometry[]}>();
    this.root.traverse(o=>{
      if(!(o instanceof T.Mesh))return;
      const mat=o.material as T.Material,key=mat.uuid+o.castShadow+o.receiveShadow;
      let batch=batches.get(key);if(!batch){batch={material:mat,shadow:o.castShadow,receive:o.receiveShadow,parts:[]};batches.set(key,batch);}
      const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      // Rounded boxes and primitive geometries have different UV attributes.
      for(const key of Object.keys(geometry.attributes))if(!['position','normal','color'].includes(key))geometry.deleteAttribute(key);
      geometry.clearGroups();geometry.applyMatrix4(o.matrixWorld);batch.parts.push(geometry);o.geometry.dispose();
    });
    const result=new T.Group();result.name=`ScratchXR-original-${id}`;
    for(const batch of batches.values()){
      const geometry=mergeGeometries(batch.parts,false);
      batch.parts.forEach(g=>g.dispose());if(!geometry)throw new Error('Scenery geometry could not be merged');
      const mesh=new T.Mesh(geometry,batch.material);mesh.castShadow=batch.shadow;mesh.receiveShadow=batch.receive;result.add(mesh);
    }
    result.userData={source:'ScratchXR procedural geometry',clearAreaSize:10,groundSize:160};
    return result;
  }
}

function archShape(w:number,h:number){
  const r=w/2,shape=new T.Shape();shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,h-r);
  shape.absarc(0,h-r,r,0,Math.PI,false);shape.lineTo(-r,0);return shape;
}
function arch(w:Workshop,g:T.Group,x:number,y:number,z:number,width:number,height:number,color:string,depth=.12){
  return w.mesh(new T.ExtrudeGeometry(archShape(width,height),{depth,bevelEnabled:false,curveSegments:12}),color,[x,y,z],g);
}
function windowArch(w:Workshop,g:T.Group,x:number,y:number,z:number,width=.8,height=1.4){
  arch(w,g,x,y,z,width+.2,height+.12,C.cream);
  arch(w,g,x,y+.07,z+.13,width,height,C.dark,.025);
  arch(w,g,x+.025,y+.12,z+.158,width*.8,height*.83,C.glass,.015);
  w.box([x,y+height*.48,z+.19],[.055,height*.85,.05],C.cream,g,.01);
  w.box([x,y+height*.45,z+.19],[width,.055,.05],C.cream,g,.01);
  w.box([x,y-.04,z+.16],[width+.32,.12,.35],C.stone,g,.04);
}
/** Broad triangular facets and a deterministic irregular silhouette.
 * Every face has one color and one normal, matching the low-poly tree reference. */
function foliage(w:Workshop,p:Point,s:Point,color:string,parent:T.Group,seed=0){
  const geo=new T.IcosahedronGeometry(1,1);
  const positions=geo.getAttribute('position');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const variation=1+.10*Math.sin(x*5+y*3+seed)*Math.cos(z*4-seed);
    positions.setXYZ(i,x*variation+.07*y,y*.96+1,z*variation);
  }
  geo.computeVertexNormals();
  const colors=new Float32Array(positions.count*3),base=new T.Color(color),tint=new T.Color();
  for(let i=0;i<positions.count;i+=3){
    const height=(positions.getY(i)+positions.getY(i+1)+positions.getY(i+2))/6;
    tint.copy(base).multiplyScalar(.88+height*.10+.08*(.5+.5*Math.sin(i*1.71+seed)));
    for(let j=0;j<3;j++)tint.toArray(colors,(i+j)*3);
  }
  geo.setAttribute('color',new T.BufferAttribute(colors,3));
  const crown=w.mesh(geo,'#ffffff',p,parent);crown.scale.fromArray(s);
  crown.receiveShadow=false;return crown;
}
function tree(w:Workshop,x:number,z:number,height:number,color:string,seed=0){
  const g=w.group(x,z,seed*.8);
  w.cylinder([0,height*.28,0],.10,.24,height*.56,C.trunk,g,7);
  w.pole([0,height*.32,0],[-.65,height*.62,.14],.09,C.trunk,g);
  w.pole([0,height*.38,0],[.5,height*.66,-.25],.08,C.trunk,g);
  foliage(w,[0,height*.41,0],[height*.29,height*.30,height*.28],color,g,seed);
  foliage(w,[-height*.17,height*.38,height*.08],[height*.22,height*.20,height*.22],color,g,seed+2);
  foliage(w,[height*.19,height*.44,-height*.06],[height*.20,height*.21,height*.22],color,g,seed+4);
}
function planter(w:Workshop,x:number,z:number,s=1,color=C.mint,parent=w.root){
  w.cylinder([x,.30*s,z],.44*s,.33*s,.6*s,C.copper,parent);
  w.cylinder([x,.60*s,z],.47*s,.47*s,.10*s,C.cream,parent);
  foliage(w,[x,.58*s,z],[.49*s,.36*s,.46*s],color,parent,x+z);
}
function flowers(w:Workshop,x:number,z:number,seed:number,color=C.purple){
  for(let i=0;i<7;i++){
    const a=i*2.399+seed,rr=.25+Math.sqrt(i)*.17,px=x+Math.cos(a)*rr,pz=z+Math.sin(a)*rr,h=.25+(i%3)*.12;
    w.cylinder([px,h/2,pz],.017,.022,h,C.sage,w.root,5);
    w.ball([px,h+.045,pz],[.095,.13,.095],color,w.root,0);
    if(i%2===0)w.ball([px-.04,h+.13,pz],[.055,.075,.055],C.yellow,w.root,0);
  }
}
function grasses(w:Workshop,x:number,z:number,seed:number){
  for(let i=0;i<6;i++){
    const a=seed+i*2.4,h=.18+(i%3)*.09,px=x+Math.cos(a)*.17,pz=z+Math.sin(a)*.17;
    const leaf=w.mesh(new T.ConeGeometry(.05,h,3),i%2?C.sage:C.leaf,[px,h/2,pz]);
    leaf.rotation.z=Math.sin(a)*.35;leaf.rotation.x=Math.cos(a)*.35;
  }
}
function bench(w:Workshop,x:number,z:number,angle=0){
  const g=w.group(x,z,angle);
  for(const a of [-.78,.78]){w.box([a,.25,0],[.16,.5,.65],C.cream,g);w.box([a,.75,-.23],[.12,.9,.12],C.copper,g);}
  for(let i=0;i<3;i++)w.box([0,.52,-.24+i*.22],[2.05,.11,.18],C.woodLight,g,.035);
  for(let i=0;i<2;i++)w.box([0,.86+i*.23,-.28],[2.05,.16,.10],C.woodLight,g,.035);
}
function roof(w:Workshop,g:T.Group,width:number,depth:number,y:number,color:string){
  const h=width*.26,s=new T.Shape();s.moveTo(-width/2,0);s.lineTo(0,h);s.lineTo(width/2,0);s.lineTo(width/2,-.15);s.lineTo(0,h-.15);s.lineTo(-width/2,-.15);s.closePath();
  w.mesh(new T.ExtrudeGeometry(s,{depth,bevelEnabled:false}),color,[0,y,-depth/2],g);
  w.pole([0,y+h,-depth/2-.08],[0,y+h,depth/2+.08],.07,C.cream,g);
  for(const side of [-1,1])for(let i=1;i<5;i++){
    const x=side*width/2*i/5;
    w.pole([x,y+h*(1-i/5)+.02,-depth/2],[x,y+h*(1-i/5)+.02,depth/2],.022,'#cf9b85',g);
  }
}
function house(w:Workshop,x:number,z:number,width:number,height:number,depth:number,color:string,angle=0){
  const g=w.group(x,z,angle);
  w.box([0,height/2,0],[width,height,depth],color,g,.15);
  w.box([0,.16,0],[width+.24,.30,depth+.24],C.stone,g,.08);
  const gable=new T.Shape();gable.moveTo(-width/2,-.1);gable.lineTo(-width/2,.08);
  gable.lineTo(0,width*.26+.08);gable.lineTo(width/2,.08);gable.lineTo(width/2,-.1);gable.closePath();
  w.mesh(new T.ExtrudeGeometry(gable,{depth,bevelEnabled:false}),color,[0,height,-depth/2],g);
  roof(w,g,width+.65,depth+.65,height+.05,C.copper);
  arch(w,g,0,.18,depth/2+.01,1.05,1.95,C.stone);
  arch(w,g,0,.21,depth/2+.14,.82,1.75,C.wood,.05);
  w.ball([.25,1.05,depth/2+.22],[.05,.05,.05],C.yellow,g);
  for(const side of [-1,1])windowArch(w,g,side*width*.31,1.12,depth/2+.02,.64,1.1);
  if(height>3.7)windowArch(w,g,0,2.7,depth/2+.02,.85,1.25);
  planter(w,-width*.55,depth/2+.4,.8,C.mint,g);
  return g;
}
function pavilion(w:Workshop){
  const g=w.group(-8,-8,.25);
  w.box([0,.13,0],[4.8,.25,3.6],C.stone,g);
  for(const x of [-2,2])for(const z of [-1.4,1.4])w.box([x,1.45,z],[.18,2.9,.18],C.wood,g,.035);
  w.box([0,1.35,-1.45],[4,.08,.14],C.woodLight,g);
  for(let i=0;i<15;i++)w.box([-1.85+i*.265,.68,-1.45],[.045,1.35,.06],C.woodLight,g,.01);
  roof(w,g,5.1,3.9,2.95,'#c99883');
  w.box([0,.83,0],[2.2,.14,.95],C.woodLight,g);
  w.box([0,.4,0],[.17,.8,.6],C.wood,g);
  for(let i=0;i<3;i++)w.box([-.6+i*.34,.95,.1],[.26,.08,.38],[C.purple,C.mint,C.yellow][i],g,.02);
  planter(w,-2.4,1.5,.85,C.mint,g);planter(w,2.4,1.5,.85,C.mint,g);
}
function stream(w:Workshop){
  const points:Point[]=[[-24,0,-2],[-15,0,-5],[-10,0,-11],[0,0,-14],[12,0,-12],[22,0,-7],[32,0,-12]];
  w.path(points,2.3,'#c8d8ce',.025);w.path(points,1.65,'#82b7b8',.03);
  w.path(points.map(p=>[p[0],0,p[2]-.25] as Point),.045,'#cee7df',.035);
  const g=w.group(-4,-13.5,.08);
  for(let i=0;i<11;i++)w.box([0,.16+Math.sin(i/10*Math.PI)*.17,-1.55+i*.31],[2,.12,.27],C.woodLight,g,.03);
  for(const x of [-.97,.97]){
    for(const z of [-1.5,0,1.5])w.box([x,.56,z],[.085,1.1,.085],C.wood,g,.02);
    w.pole([x,1.05,-1.6],[x,1.05,1.6],.045,C.wood,g);
  }
}
function observatory(w:Workshop){
  const g=w.group(.8,-13);
  w.cylinder([0,1.6,0],1.7,1.85,3.2,C.cream,g,24);
  w.cylinder([0,3.2,0],1.86,1.86,.24,C.stone,g,24);
  w.mesh(new T.SphereGeometry(1.85,24,10,0,Math.PI*2,0,Math.PI/2),C.purple,[0,3.3,0],g);
  w.cylinder([0,5.17,0],.1,.16,.3,C.copper,g);
  w.ball([0,5.4,0],[.18,.18,.18],C.yellow,g,1);
  arch(w,g,0,.02,1.83,1.1,2.15,C.stone);
  arch(w,g,0,.07,1.97,.85,1.87,C.dark,.04);
  windowArch(w,g,-.9,1.7,1.45,.55,.9);
  windowArch(w,g,.9,1.7,1.45,.55,.9);
  for(let i=0;i<2;i++)w.box([0,.06+i*.1,2.4-i*.18],[2.4-i*.3,.12,.8],C.stone,g,.03);
}
function bunting(w:Workshop){
  const a=new T.Vector3(-7,4,-7),b=new T.Vector3(7,4.4,-9);
  const curve=new T.QuadraticBezierCurve3(a,new T.Vector3(0,2.9,-8),b);
  w.mesh(new T.TubeGeometry(curve,24,.017,4,false),C.wood);
  for(let i=1;i<15;i++){
    const p=curve.getPoint(i/15),shape=new T.Shape();
    shape.moveTo(-.17,0);shape.lineTo(.17,0);shape.lineTo(0,-.37);shape.closePath();
    const flag=w.mesh(new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false}),[C.pink,C.purple,C.yellow,C.mint][i%4],p.toArray() as Point);
    flag.rotation.y=-.14;
  }
}
function greenhouse(w:Workshop){
  const g=w.group(1,-10.2,-.10);
  w.box([0,.16,0],[6.2,.32,4.3],C.stone,g,.12);
  w.box([0,1.2,-1.85],[5.7,2.1,.12],'#bad0ce',g,.02);
  // Open conservatory: actual arched ribs and side panes, not a solid glass box.
  for(const x of [-2.9,2.9]){
    w.box([x,1.2,0],[.08,2.1,3.8],C.glass,g,.02);
    for(const z of [-1.9,-.65,.65,1.9])w.pole([x,.25,z],[x,2.3,z],.055,C.copper,g);
    w.pole([x,1.25,-1.9],[x,1.25,1.9],.04,C.cream,g);
  }
  for(const z of [-1.9,-.95,0,.95,1.9]){
    const pts=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return new T.Vector3(Math.cos(a)*2.9,2.3+Math.sin(a)*1.55,z);});
    w.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),32,.055,6,false),C.copper,[0,0,0],g);
  }
  for(const a of [Math.PI/4,Math.PI/2,Math.PI*3/4])w.pole([Math.cos(a)*2.9,2.3+Math.sin(a)*1.55,-1.9],[Math.cos(a)*2.9,2.3+Math.sin(a)*1.55,1.9],.04,C.copper,g);
  for(const x of [-2,2])for(const z of [-1,1])planter(w,x,z,1.1,C.mint,g);
  w.box([0,.55,-.8],[2,.12,.8],C.cream,g);
  planter(w,0,-.8,.7,C.purple,g);
}
function armillary(w:Workshop,x:number,z:number){
  const g=w.group(x,z);
  w.cylinder([0,.22,0],.7,.9,.44,C.stone,g,8);
  w.cylinder([0,.85,0],.18,.3,1.05,C.cream,g,8);
  for(const [i,angle]of [-.65,.65,Math.PI/2].entries()){
    const ring=w.mesh(new T.TorusGeometry(1.03,.035,6,48),i===2?C.cream:C.copper,[0,2,0],g);
    ring.rotation.set(angle,i*.65,.25);
  }
  w.ball([0,2,0],[.27,.27,.27],C.yellow,g,1);
  w.pole([0,.95,0],[0,3.15,0],.025,C.copper,g);
  const star=new T.Shape();
  for(let i=0;i<10;i++){const a=i/5*Math.PI+Math.PI/2,r=i%2?.1:.25;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(!i)star.moveTo(x,y);else star.lineTo(x,y);}
  star.closePath();w.mesh(new T.ExtrudeGeometry(star,{depth:.05,bevelEnabled:false}),C.yellow,[0,3.3,0],g);
}

export function createEnvironment(id:SceneId):T.Group{
  const w=new Workshop(),spec=sceneById[id];
  const ground=w.mesh(new T.PlaneGeometry(160,160),spec.groundColor);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  // Broad connected paths, with no raised rim around the programming area.
  w.disk(0,0,6.15,5.75,id==='village'?'#ede0c7':id==='garden'?'#d5d9ce':'#cad9b8');
  w.path([[-20,0,5],[-10,0,4],[-5,0,1],[0,0,0],[7,0,3],[15,0,4],[30,0,1]],1.5,id==='village'?'#ede0c7':C.cream);
  w.path([[0,0,0],[1,0,-5],[2,0,-10],[2,0,-22]],1.35,id==='garden'?'#e4dddf':C.cream);
  // Subtle inlaid route marks help locate the floor without a technical grid.
  for(let i=0;i<20;i++){
    const a=i/20*Math.PI*2,x=Math.cos(a)*5.35,z=Math.sin(a)*4.95;
    w.disk(x,z,.12,.055,id==='garden'?'#b4a5bd':'#b7bd9e',.032);
  }
  const hills=id==='garden'?['#aabdb8','#bfcbcf','#bdb7ce']:id==='village'?['#b5c6ac','#c5d2b6','#d1d7bc']:['#a8bfa9','#bfd0b6','#d1dbc2'];
  for(let i=0;i<11;i++){
    const a=i/11*Math.PI*2,dist=34+(i%3)*8;
    w.ball([Math.sin(a)*dist,-.8,Math.cos(a)*dist],[11+(i%3)*3,4+(i%4),9+(i%2)*4],hills[i%3],w.root,2);
  }
  if(id==='forest'){
    stream(w);pavilion(w);
    for(const [i,p]of [[-9,1,5.1],[-14,-5,4.8],[8,-7,5.8],[11,0,5],[5,-17,6.1],[-21,-12,5.6],[15,-15,6.5],[-17,6,5],[19,8,5]].entries())tree(w,p[0],p[1],p[2],[C.treeLeaf,C.treeShade,C.treeLight][i%3],i);
    bench(w,7.2,-3.3,-.55);bench(w,-7,3.5,.4);
    for(let i=0;i<18;i++){
      const a=i*2.399,r=7.2+(i%4)*1.8,x=Math.sin(a)*r,z=Math.cos(a)*r;
      if(z<-6&&x<0)continue;
      grasses(w,x,z,i);flowers(w,x+.6,z+.2,i,i%3?C.white:C.yellow);
    }
    for(const [i,p]of [[-11,-4],[10,-10],[-14,2],[9,4],[-6,-15]].entries())w.ball([p[0],.28,p[1]],[.65,.4,.48],i%2?'#b6b6a7':'#c3c3b0',w.root,1);
  }else if(id==='village'){
    house(w,-7.7,-7.6,4.6,4.2,3.8,'#f0d6ba',.15);
    const shop=house(w,7.5,-8.3,4.8,2.9,3.7,'#eadfcd',-.24);
    for(let i=0;i<7;i++){
      const awning=w.box([-1.8+i*.6,2.45,2.25],[.58,.11,1.05],i%2?C.cream:C.purple,shop,.025);awning.rotation.x=.22;
      w.box([-1.8+i*.6,2.28,2.75],[.58,.25,.06],i%2?C.cream:C.purple,shop,.025);
    }
    observatory(w);bunting(w);
    tree(w,-10,1,5,C.treeLeaf,1);tree(w,10,2,5.1,C.treeLight,2);tree(w,-13,-13,5.8,C.treeLeaf,4);tree(w,12,-17,6,C.treeShade,5);
    bench(w,-6.7,1.3,.2);bench(w,6.9,1.7,-.3);
    for(const [x,z]of [[-6,-3.8],[6,-4.3],[-7,4],[8,4.8],[-4,-9],[4.5,-10]])planter(w,x,z,1);
    for(const side of [-1,1]){
      const g=w.group(side*5.8,-5.5);
      w.cylinder([0,1.2,0],.045,.065,2.4,C.copper,g,8);
      w.box([0,2.5,0],[.38,.55,.38],C.cream,g,.04);
      w.cylinder([0,2.83,0],.05,.31,.18,C.copper,g,4);
    }
  }else{
    greenhouse(w);armillary(w,-7,-6.5);
    w.disk(8,-3.5,3.1,2.3,'#e1d8df',.025);w.disk(8,-3.5,2.75,1.95,'#86b2b6',.035);
    for(let i=0;i<7;i++){
      const x=7+Math.cos(i*2.4)*1.4,z=-3.5+Math.sin(i*2.4)*1.1;
      w.disk(x,z,.23,.19,C.sage,.045);w.ball([x,.095,z],[.09,.08,.09],i%2?C.pink:C.white,w.root,1);
    }
    for(const [i,p]of [[-9,1,4.7],[11,-8,5.3],[-11,-12,5.7],[9,5,4.7],[-15,-3,5.2],[14,-17,6]].entries())tree(w,p[0],p[1],p[2],[C.treeLeaf,C.treeLight,C.treeShade][i%3],i);
    bench(w,-7.7,3,-.2);bench(w,6.8,3.2,-.4);
    for(const [k,p]of [[-6.4,-3],[-7,0],[-6.5,5],[6,-7],[8,-8],[-9,-8],[10,1]].entries()){
      w.disk(p[0],p[1],1.35,.9,'#a6b6aa',.025);
      for(let i=0;i<3;i++)flowers(w,p[0]+(i-1)*.65,p[1]+(i%2)*.4,k+i,C.purple);
      grasses(w,p[0]-.6,p[1]-.6,k);
    }
    for(const x of [-3,3])planter(w,x,-7.4,.9,C.purple);
  }
  return w.finish(id);
}

/** Lighting is shared by the interactive world and the baked Scratch backdrops. */
export function addEnvironmentLights(scene:T.Scene){
  scene.add(new T.HemisphereLight(0xfff9ed,0x9197b0,2));
  const sun=new T.DirectionalLight(0xffe6c9,2.6);sun.position.set(-10,18,12);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:65});
  sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;sun.shadow.radius=3;
  sun.target.position.set(0,0,-5);scene.add(sun,sun.target);
}
