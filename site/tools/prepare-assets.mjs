import {mkdir, copyFile, readdir, readFile, writeFile, cp} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vendors = [
  ['@scratch/scratch-vm', 'scratch-vm'],
  ['@scratch/scratch-render', 'scratch-render'],
  ['@scratch/scratch-storage', 'scratch-storage'],
  ['@scratch/scratch-svg-renderer', 'scratch-svg-renderer'],
];
await mkdir(join(root,'public/vendor'),{recursive:true});
for(const [pkg,name] of vendors){
  const packageRoot=join(root,'node_modules',pkg);
  const files=await readdir(join(packageRoot,'dist/web'));
  const source=files.includes(`${name}.js`)?`${name}.js`:files.find(f=>f.endsWith('.js')&&!f.endsWith('.map'));
  if(!source) throw new Error(`Browser build missing: ${pkg}`);
  await copyFile(join(packageRoot,'dist/web',source),join(root,`public/vendor/${name}.js`));
  for (const dir of files.filter(f=>['chunks','assets'].includes(f))) {
    await cp(join(packageRoot,'dist/web',dir),join(root,'public/vendor',dir),{recursive:true});
    await cp(join(packageRoot,'dist/web',dir),join(root,'public',dir),{recursive:true});
  }
  const license = (await readdir(packageRoot)).find(f=>/^LICENSE/i.test(f));
  if(license) await copyFile(join(packageRoot,license),join(root,`public/vendor/${name}-LICENSE.txt`));
}
await copyFile(join(root,'node_modules/scratch-audio/LICENSE'),join(root,'public/vendor/scratch-audio-LICENSE.txt'));
await cp(join(root,'node_modules/scratch-blocks/media'),join(root,'public/vendor/blocks-media'),{recursive:true});
// Engine binaries and full license terms are preserved; attribution shares the license page.
await cp(join(root,'node_modules/@8thwall/engine-binary/dist'),join(root,'public/xr8'),{recursive:true});
const xrLicense=await readFile(join(root,'node_modules/@8thwall/engine-binary/dist/LICENSE'),'utf8');
await writeFile(join(root,'public/xr8/LICENSE'),'6DoF: 8th Wall · © 2026 Niantic Spatial, Inc.\n\n'+xrLicense,'utf8');
await mkdir(join(root,'public/downloads'),{recursive:true});
for(const lang of ['pt-BR','en']) await copyFile(join(root,`../materiais/cardboard/scratchxr-visor-cardboard-${lang}.pdf`),join(root,`public/downloads/cardboard-${lang}.pdf`));
const categories=['Movimento','Aparência','Som','Eventos','Controle','Sensores','Operadores','Variáveis'];
const assets=[];
for(const category of categories){
  for(const locale of ['br','eng']){
    const dir=join(root,'../Utilizados',category,locale);
    for(const filename of (await readdir(dir)).filter(f=>f.endsWith('.svg'))){
      const rel=`blocks/${category}/${locale}/${filename}`;
      await mkdir(dirname(join(root,'public',rel)),{recursive:true});
      await copyFile(join(dir,filename),join(root,'public',rel));
      assets.push({category,locale,url:`/${rel}`});
    }
  }
}
await writeFile(join(root,'public/blocks.json'),JSON.stringify(assets));
// Original scene PNGs are baked by tools/render-backdrops.py from sceneGeometry.ts.
// Keep them intact when refreshing Scratch libraries and supplied block illustrations.
await mkdir(join(root,'public/sounds'),{recursive:true});
const rate=22050,length=Math.round(rate*.35),wave=Buffer.alloc(44+length*2);
wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);
wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(rate,24);wave.writeUInt32LE(rate*2,28);
wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(length*2,40);
for(let i=0;i<length;i++)wave.writeInt16LE(Math.round(Math.sin(i/rate*Math.PI*2*523.25)*Math.sin(i/length*Math.PI)*7000),44+i*2);
await writeFile(join(root,'public/sounds/tone.wav'),wave);
console.info(`Prepared Scratch browser libraries, PDFs and ${assets.length} SVGs.`);
