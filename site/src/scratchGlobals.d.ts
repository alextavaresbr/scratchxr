import type {Locale} from './types';
declare global {
  interface Window {
    VirtualMachine: any;
    ScratchRender: any;
    ScratchStorage: any;
    ScratchSVGRenderer: any;
    ScratchAudio: any;
    __scratchxr?: {vm:any;getTrace:()=>unknown;locale:Locale};
  }
}
declare module '*.js';
export {};
