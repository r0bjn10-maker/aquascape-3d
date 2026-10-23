import budgets from './m1-budgets.json' with {type:'json'};
import type { AssetDef } from '../game/types';
// Stable IDs: this changes rendering metadata only, never the saved world schema.
const hardscape=['seiryu','dragon','spider'],plants=['monte','rotala','anubias'],animals=['neon','betta','shrimp'];
export const M1_IDS=[...hardscape,...plants,...animals];
export function modelMetadata(id:string):Partial<AssetDef>{
  if(!M1_IDS.includes(id))return {};
  const kind=hardscape.includes(id)?'hardscape':plants.includes(id)?'leaf-module':'morph-animal';
  const budget=budgets[id as keyof typeof budgets];
  return {performance:{triangles:budget.high,drawCalls:kind==='leaf-module'?3:1,instanced:kind!=='hardscape'},model:`models/m1/${id}-0-high.glb`,status:'authored-glb',license:'Original Aquascape M1 authored game art, CC0-1.0; tools/m1/build_assets.py',variants:kind==='morph-animal'?1:3,
    modelSpec:{kind,variants:kind==='morph-animal'?1:3,lods:['low','high'],...(kind==='morph-animal'?{animation:'Swim'}:{}),source:'tools/m1/build_assets.py'}};
}
export function modelPath(asset:AssetDef,variant=0,detail=1){
  return asset.modelSpec?`models/m1/${asset.id}-${Math.abs(variant)%asset.modelSpec.variants}-${detail===0?'low':'high'}.glb`:asset.model!;
}
