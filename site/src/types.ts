/**
 * ScratchXR — Shared lesson contracts.
 * Subsistema: EDU. Depende de: sceneAssets. Usado por: app, engine, viewer.
 */
import type {SceneId} from './sceneAssets';
export type Locale = 'pt-BR' | 'en';
export type AvatarId = 'avatar-a' | 'avatar-b' | 'avatar-c';
export const avatars: {id:AvatarId;name:string;color:string}[] = [
  {id:'avatar-a',name:'Luna',color:'#ded0ff'},
  {id:'avatar-b',name:'Leo',color:'#c7e8d6'},
  {id:'avatar-c',name:'Maya',color:'#ffdec2'},
];
export interface ActorState {
  id:string; avatar:AvatarId; x:number; y:number; direction:number;
  size:number;visible:boolean;text:string;costume:number;rotationStyle:string;
}
export interface TraceFrame {
  t:number; order:number; actors:ActorState[]; scene:SceneId;
}
export interface Trace {
  frames:TraceFrame[]; duration:number; truncated:boolean; warnings:string[];
}
export interface MotionData {
  id:string;prompt:string;frames:number;fps:number;roots:number[];rotations:number[];
}
export const text=(locale:Locale,pt:string,en:string)=>locale==='pt-BR'?pt:en;
