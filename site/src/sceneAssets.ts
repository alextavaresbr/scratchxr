/**
 * ScratchXR — Metadata for original procedural environments.
 * Subsistema: EDU. Depende de: none. Usado por: World, editor, sceneGeometry.
 */
export type SceneLocale='pt-BR'|'en';
export type SceneId='forest'|'village'|'garden';
export interface SceneAsset {
  id:SceneId;
  name:Record<SceneLocale,string>;
  description:Record<SceneLocale,string>;
  groundColor:string;
  skyColor:string;
  accentColor:string;
  clearAreaSize:number;
}
export const sceneAssets:SceneAsset[]=[
  {id:'forest',name:{'pt-BR':'Bosque das ideias',en:'Grove of ideas'},
    description:{'pt-BR':'Copas de menta, um riacho e um pavilhão de madeira para imaginar caminhos.',en:'Mint canopies, a stream and a wooden pavilion for imagining new paths.'},
    groundColor:'#b9cdb0',skyColor:'#e4eeeb',accentColor:'#6b967e',clearAreaSize:10},
  {id:'village',name:{'pt-BR':'Vila das descobertas',en:'Discovery village'},
    description:{'pt-BR':'Uma praça ensolarada entre arcos, telhados de argila e um pequeno observatório.',en:'A sunlit square with archways, clay roofs and a small observatory.'},
    groundColor:'#ddd1b7',skyColor:'#f3e9db',accentColor:'#c98a6f',clearAreaSize:10},
  {id:'garden',name:{'pt-BR':'Jardim das estrelas',en:'Garden of stars'},
    description:{'pt-BR':'Uma estufa de cobre, flores de lavanda e caminhos ao redor de um espelho d’água.',en:'A copper greenhouse, lavender flowers and paths around a reflecting pool.'},
    groundColor:'#bdcbc4',skyColor:'#e9e5f1',accentColor:'#9c8abb',clearAreaSize:10},
];
export const sceneById=Object.fromEntries(sceneAssets.map(s=>[s.id,s])) as Record<SceneId,SceneAsset>;
