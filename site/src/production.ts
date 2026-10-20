/**
 * ScratchXR — HTTP production server for Railway's HTTPS reverse proxy.
 * Subsistema: EDU. Depende de: Node, server. Usado por: npm start / Docker.
 */
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {createReadStream,existsSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,relative,isAbsolute,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createScratchApi} from './server';

const mime:Record<string,string>={
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2',
  '.ttf':'font/ttf','.glb':'model/gltf-binary','.gltf':'model/gltf+json',
  '.wasm':'application/wasm','.pdf':'application/pdf','.wav':'audio/wav',
  '.mp3':'audio/mpeg','.ogg':'audio/ogg','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8',
};

export function createAppHandler(appRoot:string,env:Record<string,string>){
  const directory=resolve(appRoot,'build'),api=createScratchApi(env,appRoot);
  const text=(res:ServerResponse,status:number,message:string)=>{
    res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message);
  };
  async function serve(req:IncomingMessage,res:ServerResponse){
    if(req.method!=='GET'&&req.method!=='HEAD')return text(res,405,'Method not allowed');
    let pathname:string;
    try{pathname=decodeURIComponent(new URL(req.url||'/', 'http://localhost').pathname);}
    catch{return text(res,400,'Invalid path');}
    if(pathname.includes('\0')||pathname.split(/[\\/]/).some(part=>part.startsWith('.')))return text(res,404,'Not found');
    let file=resolve(directory,'.'+pathname);
    const rel=relative(directory,file);
    if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))return text(res,404,'Not found');
    let info=await stat(file).catch(()=>null);
    if(pathname==='/'||(!info&&!extname(pathname)&&req.headers.accept?.includes('text/html'))){
      file=resolve(directory,'index.html');info=await stat(file).catch(()=>null);
    }
    if(!info?.isFile())return text(res,404,'Not found');
    const etag=`"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`;
    const headers:Record<string,string|number>={
      'Content-Type':mime[extname(file).toLowerCase()]||(file.endsWith('LICENSE')?'text/plain; charset=utf-8':'application/octet-stream'),
      'Cache-Control':file.endsWith('index.html')?'no-cache':'public, max-age=3600',
      'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','ETag':etag,
    };
    if(req.headers['if-none-match']===etag&&!req.headers.range){res.writeHead(304,headers);res.end();return;}
    let start=0,end=info.size-1,status=200;
    if(req.headers.range){
      const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(range&&(range[1]||range[2])){
        start=range[1]?Number(range[1]):Math.max(0,info.size-Number(range[2]));
        end=range[1]?(range[2]?Math.min(Number(range[2]),end):end):end;
      }else start=-1;
      if(start<0||start>end||start>=info.size){
        res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;
      }
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=info.size?end-start+1:0;
    res.writeHead(status,headers);
    if(req.method==='HEAD'||!info.size){res.end();return;}
    createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
  }
  return (req:IncomingMessage,res:ServerResponse)=>{
    api(req,res,()=>{void serve(req,res).catch(()=>{if(!res.headersSent)text(res,500,'Request could not be completed');else res.destroy();});});
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const root=fileURLToPath(new URL('..',import.meta.url));
  if(!existsSync(resolve(root,'build/index.html')))throw new Error('Run npm run build before npm start.');
  const port=Number(process.env.PORT||3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT.');
  const env=Object.fromEntries(Object.entries(process.env).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
  const server=createServer(createAppHandler(root,env));
  server.requestTimeout=60000;server.headersTimeout=15000;
  server.listen(port,'0.0.0.0',()=>process.stdout.write(`ScratchXR listening on port ${port}\n`));
  const shutdown=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();};
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
}
