import { useEffect } from 'react';
import * as THREE from 'three';
// A bounded loader cache retains CPU data. GPU objects are reference counted and
// released when the last rendered user leaves; Three reuploads on a later visit.
const textureCache=new Map<string,THREE.Texture>();
const references=new WeakMap<object,number>();
export const modelDiagnostics={loaded:new Set<string>(),failed:new Set<string>()};
export function meshFromModel(scene:THREE.Object3D){
 let result:THREE.Mesh|undefined;scene.traverse(o=>{if(o instanceof THREE.Mesh){
  if(!result)result=o;
  const material=o.material as THREE.MeshStandardMaterial;
  if(!material.map||!material.normalMap||!material.roughnessMap)throw new Error('Required M1 PBR texture failed to load');
  for(const key of ['map','normalMap','roughnessMap','metalnessMap'] as const){const texture=material[key];if(!texture?.name)continue;
   const name=texture.name+':'+texture.colorSpace,shared=textureCache.get(name);
   if(shared&&shared!==texture){material[key]=shared;texture.dispose();}else textureCache.set(name,texture);
  }
 }});
 if(!result)throw new Error('GLB contains no mesh');return result;
}
export function useModelLease(scene:THREE.Object3D){
 useEffect(()=>{
  const resources=new Set<THREE.BufferGeometry|THREE.Material|THREE.Texture>();
  scene.traverse(o=>{if(o instanceof THREE.Mesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)resources.add(value);}}});
  for(const resource of resources)references.set(resource,(references.get(resource)??0)+1);
  return ()=>{for(const resource of resources){const n=(references.get(resource)??1)-1;references.set(resource,n);if(n===0)resource.dispose();}};
 },[scene]);
}
