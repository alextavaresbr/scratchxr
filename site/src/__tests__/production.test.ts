/**
 * ScratchXR — Production HTTP boundary, media delivery and API fallback.
 * Subsistema: EDU. Depende de: Node, production. Usado por: Vitest.
 */
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createServer,type Server} from 'node:http';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {createAppHandler} from '../production';

let root:string,base:string,server:Server;
beforeAll(async()=>{
  root=await mkdtemp(join(tmpdir(),'scratchxr-http-'));
  await mkdir(join(root,'build'));
  await writeFile(join(root,'build/index.html'),'<!doctype html><h1>ScratchXR</h1>');
  await writeFile(join(root,'build/test.wasm'),Buffer.from([0,97,115,109]));
  await writeFile(join(root,'build/model.glb'),'glTFtest');
  await writeFile(join(root,'build/guide.pdf'),'%PDF-test');
  await writeFile(join(root,'.env'),'PRIVATE_TEST_VALUE');
  server=createServer(createAppHandler(root,{}));
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
});
afterAll(async()=>{
  if(server)await new Promise<void>((done,reject)=>server.close(error=>error?reject(error):done()));
  if(root){
    const target=resolve(root);
    if(dirname(target)!==resolve(tmpdir())||!basename(target).startsWith('scratchxr-http-'))throw new Error('Unexpected temporary directory');
    await rm(target,{recursive:true,force:true});
  }
});
describe('Production server',()=>{
  it('serves the built app and fallback routes, without exposing source or dotfiles',async()=>{
    for(const path of ['/','/lesson']){
      const res=await fetch(base+path,{headers:{accept:'text/html'}});
      expect(res.status).toBe(200);expect(await res.text()).toContain('ScratchXR');
    }
    for(const path of ['/.env','/%2eenv','/src/server.ts','/%2e%2e%2f.env']){
      const res=await fetch(base+path);
      expect(res.status).toBe(404);expect(await res.text()).not.toContain('PRIVATE_TEST_VALUE');
    }
  });
  it('delivers XR binaries with MIME types, byte ranges, HEAD and cache validation',async()=>{
    const wasm=await fetch(base+'/test.wasm');
    expect(wasm.headers.get('content-type')).toBe('application/wasm');
    expect([...new Uint8Array(await wasm.arrayBuffer())]).toEqual([0,97,115,109]);
    const range=await fetch(base+'/guide.pdf',{headers:{range:'bytes=0-3'}});
    expect(range.status).toBe(206);expect(await range.text()).toBe('%PDF');
    expect(range.headers.get('content-range')).toBe('bytes 0-3/9');
    expect((await fetch(base+'/guide.pdf',{headers:{range:'bytes=999-'}})).status).toBe(416);
    const head=await fetch(base+'/model.glb',{method:'HEAD'});
    expect(head.headers.get('content-type')).toBe('model/gltf-binary');expect(await head.text()).toBe('');
    const cached=await fetch(base+'/model.glb',{headers:{'if-none-match':head.headers.get('etag')!}});
    expect(cached.status).toBe(304);
  });
  it('keeps the health check and offline tutor working without cloud keys',async()=>{
    const health=await fetch(base+'/api/health');
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({tutor:false,stt:false,tts:false,kimodo:false});
    const chat=await fetch(base+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({locale:'en',messages:[{role:'user',content:'What is a loop?'}]})});
    expect(chat.status).toBe(200);expect(await chat.json()).toMatchObject({mode:'offline'});
    const rejected=await fetch(base+'/api/chat',{method:'POST',headers:{origin:'https://other.example'}});
    expect(rejected.status).toBe(403);
  });
});
