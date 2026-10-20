/**
 * ScratchXR — HTTP/2 origin regression for the HTTPS development server.
 * Subsistema: EDU. Depende de: Node HTTP/2, server. Usado por: Vitest.
 */
import {it,expect} from 'vitest';
import {connect,createServer} from 'node:http2';
import {createScratchApi} from '../server';

it('accepts same-origin HTTP/2 chat with :authority and rejects another origin',async()=>{
  const api=createScratchApi({},process.cwd());
  const server=createServer((req,res)=>api(req as unknown as Parameters<typeof api>[0],res as unknown as Parameters<typeof api>[1],()=>res.end()));
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`,client=connect(origin);
  try{
    for(const allowed of [true,false]){
      const result=await new Promise<{status:number;body:string}>((done,reject)=>{
        const req=client.request({':method':'POST',':path':'/api/chat',origin:allowed?origin:'https://unrelated.example','content-type':'application/json'});
        let status=0,body='';req.setEncoding('utf8');
        req.on('response',h=>status=Number(h[':status']));req.on('data',s=>body+=s);req.on('error',reject);
        req.on('end',()=>done({status,body}));
        req.end(JSON.stringify({locale:'en',messages:[{role:'user',content:'What is a loop?'}]}));
      });
      expect(result.status).toBe(allowed?200:403);
      if(allowed)expect(JSON.parse(result.body).text).toContain('algorithm');
    }
  }finally{
    client.close();await new Promise<void>(done=>server.close(()=>done()));
  }
});
