import { useMemo,useRef,useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../../state/store';
import { assets } from '../../data/catalog';
import { previewGeometry } from '../assets/previewFactory';
import { placementCursor } from './cursor';
import { constrainObject } from './placement';
import { heightAt } from '../terrain/heightfield';
import type { PlacedObject } from '../types';
function Ghost({id,variant}:{id:string;variant:number}){
  const ref=useRef<THREE.Mesh>(null),asset=assets[id];
  const geometry=useMemo(()=>{const result=previewGeometry(asset,variant,.12);if(asset.category==='plants')result.geometry.translate(0,-.16,0);return result.geometry;},[asset,variant]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{if(!ref.current)return;const s=useGame.getState(),point=placementCursor.point;
    const raw:PlacedObject={id:'ghost',asset:id,x:placementCursor.active?point.x:0,z:placementCursor.active?point.z:0,elevation:s.attachment&&placementCursor.active?Math.max(0,point.y-heightAt(s.world.terrain,point.x,point.z)):0,rotation:0,scale:s.placingScale,age:0,growth:.12,health:95,biomass:1,trim:0,variant};
    const item=constrainObject(raw,s.world.terrain);ref.current.position.set(item.x,heightAt(s.world.terrain,item.x,item.z)+item.elevation+.015,item.z);ref.current.scale.setScalar(item.scale);
  });
  return <mesh ref={ref} geometry={geometry} renderOrder={8} raycast={()=>{}}><meshBasicMaterial color="#c2e7ab" wireframe transparent opacity={.28} depthWrite={false}/></mesh>;
}
export function PlacementGhost(){const s=useGame();return s.tool==='place'&&s.placing&&!s.zen&&!s.preview&&s.session==='active'?<Ghost id={s.placing} variant={s.placingVariant%assets[s.placing].variants}/>:null;}
