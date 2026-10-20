/**
 * ScratchXR — Isolated local HTTPS app and server adapters.
 * Subsistema: EDU. Depende de: Vite. Usado por: scripts.
 */
import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {scratchServer} from './src/server';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig(({mode})=>{
  const env={...loadEnv(mode,resolve(root,'../..'),''),...loadEnv(mode,root,''),...process.env} as Record<string,string>;
  return {plugins:[react(),basicSsl(),scratchServer(env,root)],
    server:{host:'0.0.0.0',port:4310,strictPort:true},
    preview:{host:'0.0.0.0',port:4311,strictPort:true},
    build:{outDir:'build',target:'es2022',chunkSizeWarningLimit:1600},
    resolve:{dedupe:['react','react-dom','three','blockly'],alias:{events:resolve(root,'node_modules/events/events.js')}},
  };
});
