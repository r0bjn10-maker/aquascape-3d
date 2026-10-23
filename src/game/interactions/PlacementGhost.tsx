import { Suspense,useMemo,useRef,useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { AssetBoundary,modelURL } from '../assets/AssetModel';
import { meshFromModel,useModelLease } from '../assets/modelResources';
import { modelPath } from '../../data/modelAssets';
import { qualitySettings } from '../scene/settings';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../../state/store';
import { assets } from '../../data/catalog';
import { previewGeometry } from '../assets/previewFactory';
import { placementCursor } from './cursor';
import { constrainObject } from './placement';
import { heightAt } from '../terrain/heightfield';
import type { PlacedObject } from '../types';
function Ghost({id,variant,sourceGeometry}:{id:string;variant:number;sourceGeometry?:THREE.BufferGeometry}){
  const ref=useRef<THREE.Mesh>(null),asset=assets[id];
  const geometry=useMemo(()=>{if(sourceGeometry)return sourceGeometry.clone();const result=previewGeometry(asset,variant,.12);if(asset.category==='plants')result.geometry.translate(0,-.16,0);return result.geometry;},[asset,variant,sourceGeometry]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{if(!ref.current)return;const s=useGame.getState(),point=placementCursor.point;
    const raw:PlacedObject={id:'ghost',asset:id,x:placementCursor.active?point.x:0,z:placementCursor.active?point.z:0,elevation:s.attachment&&placementCursor.active?Math.max(0,point.y-heightAt(s.world.terrain,point.x,point.z)):0,rotation:0,scale:s.placingScale,age:0,growth:.12,health:95,biomass:1,trim:0,variant};
    const item=constrainObject(raw,s.world.terrain);ref.current.position.set(item.x,heightAt(s.world.terrain,item.x,item.z)+item.elevation+.015,item.z);ref.current.scale.setScalar(item.scale);
  });
  return <mesh ref={ref} geometry={geometry} renderOrder={8} raycast={()=>{}}><meshBasicMaterial color="#c2e7ab" wireframe transparent opacity={.28} depthWrite={false}/></mesh>;
}
function LoadedGhost({id,variant,path}:{id:string;variant:number;path:string}){
 const {scene}=useGLTF(modelURL(path));useModelLease(scene);const source=useMemo(()=>meshFromModel(scene),[scene]);
 return <Ghost id={id} variant={variant} sourceGeometry={source.geometry}/>;
}
function ModelGhost({id,variant}:{id:string;variant:number}){
 const quality=useGame(s=>s.quality),adaptiveLow=useGame(s=>s.adaptiveLow),path=modelPath(assets[id],variant,qualitySettings(quality,adaptiveLow).detail),fallback=<Ghost id={id} variant={variant}/>;
 return <AssetBoundary key={path} path={path} fallback={fallback}><Suspense fallback={fallback}><LoadedGhost id={id} variant={variant} path={path}/></Suspense></AssetBoundary>;
}
export function PlacementGhost(){const s=useGame();return s.tool==='place'&&s.placing&&!s.zen&&!s.preview&&s.session==='active'?(assets[s.placing].modelSpec?.kind==='hardscape'?<ModelGhost id={s.placing} variant={s.placingVariant%assets[s.placing].variants}/>:<Ghost id={s.placing} variant={s.placingVariant%assets[s.placing].variants}/>):null;}
