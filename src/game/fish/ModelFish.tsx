import { Suspense,useMemo,useRef,useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { assets } from '../../data/catalog';
import { modelPath } from '../../data/modelAssets';
import { AssetBoundary,modelURL } from '../assets/AssetModel';
import { meshFromModel,modelDiagnostics,useModelLease } from '../assets/modelResources';
import type { VisualFish } from './Fish';
import type { ReactNode } from 'react';
const dummy=new THREE.Object3D(),color=new THREE.Color(),targetQuaternion=new THREE.Quaternion();
function LoadedFish({species,visual,path}:{species:string;visual:React.RefObject<VisualFish>;path:string}){
 const {scene,animations}=useGLTF(modelURL(path));useModelLease(scene);
 const ref=useRef<THREE.InstancedMesh>(null),turns=useRef(new Map<string,THREE.Quaternion>());
 const source=useMemo(()=>meshFromModel(scene),[scene]);
 const geometry=source.geometry,material=source.material;
 const animation=useMemo(()=>{
  if(!geometry.morphAttributes.position?.length)throw new Error('Animal GLB needs morph targets');
  const proxy=source.clone(),mixer=new THREE.AnimationMixer(proxy),clip=animations.find(c=>c.name==='Swim')??animations[0];
  if(!clip)throw new Error('Animal GLB needs an animation clip');return {proxy,mixer,clip};
 },[source,geometry,animations]);
 useEffect(()=>{animation.mixer.clipAction(animation.clip).reset().play();modelDiagnostics.loaded.add(path);const batch=ref.current;return ()=>{animation.mixer.stopAllAction();animation.mixer.uncacheRoot(animation.proxy);batch?.dispose();};},[animation,path]);
 useFrame((_,dt)=>{
  const batch=ref.current;if(!batch)return;const data=visual.current,ids=new Set<string>();let index=0;
  if(!batch.morphTexture){const count=batch.count;batch.count=80;batch.setMorphAt(0,animation.proxy);batch.count=count;}
  for(const f of data.fish){if(f.species!==species||!f.life.alive)continue;ids.add(f.id);
   const target=f.life.lengthCm/10,old=data.sizes.get(f.id)??target,size=old+(target-old)*(1-Math.exp(-dt*2));data.sizes.set(f.id,size);
   const angle=-Math.atan2(f.vz,f.vx),pitch=species==='shrimp'?0:Math.atan2(f.vy,Math.hypot(f.vx,f.vz))*.65;
   dummy.rotation.set(0,angle,pitch);targetQuaternion.copy(dummy.quaternion);let orientation=turns.current.get(f.id);
   if(!orientation){orientation=targetQuaternion.clone();turns.current.set(f.id,orientation);}orientation.slerp(targetQuaternion,1-Math.exp(-dt*7));
   dummy.position.set(f.x,species==='shrimp'?f.y-.042:f.y,f.z);dummy.quaternion.copy(orientation);dummy.scale.setScalar(size);dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);
   color.set(f.health<45?'#b5aa90':'#ffffff').multiplyScalar(.85+f.health*.0015);batch.setColorAt(index,color);
   const frequency=species==='betta'?1.1:species==='shrimp'?1.3:2.7;
   animation.mixer.setTime((data.time*frequency+f.phase)%animation.clip.duration);batch.setMorphAt(index,animation.proxy);index++;
  }
  // Do not resize morphTexture according to current count: capacity stays 80.
  batch.count=index;batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;if(batch.morphTexture)batch.morphTexture.needsUpdate=true;
  for(const id of turns.current.keys())if(!ids.has(id))turns.current.delete(id);
 });
 return <instancedMesh ref={ref} args={[geometry,material,80]} frustumCulled={false} dispose={null}/>;
}
export function ModelFish({species,visual,detail,fallback}:{species:string;visual:React.RefObject<VisualFish>;detail:number;fallback:ReactNode}){
 const path=modelPath(assets[species],0,detail);
 return <AssetBoundary key={path} path={path} fallback={fallback}><Suspense fallback={fallback}><LoadedFish species={species} visual={visual} path={path}/></Suspense></AssetBoundary>;
}
