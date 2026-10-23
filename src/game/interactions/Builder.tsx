import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../../state/store';
import { applyTransform } from './placement';
import { heightAt } from '../terrain/heightfield';
import type { World } from '../types';
export function groundAction(e:ThreeEvent<MouseEvent>){
  const s=useGame.getState();if(s.zen||s.preview||s.session==='readonly')return;
  if(s.tool==='place'){e.stopPropagation();s.place(e.point.x,e.point.z);}
  else if(s.tool!=='select'){e.stopPropagation();s.terrainEdit(e.point.x,e.point.z);}
  else s.set({selected:null});
}
export function selectObject(id:string,e:ThreeEvent<MouseEvent>){
  const s=useGame.getState();if(s.zen||s.preview||s.session==='readonly')return;
  if(s.tool==='select'){e.stopPropagation();s.set({selected:id});}
  else if(s.tool==='place'&&s.attachment){
    const o=s.world.objects.find(o=>o.id===id);if(!o)return;
    e.stopPropagation();s.place(e.point.x,e.point.z,id,Math.max(0,e.point.y-heightAt(s.world.terrain,e.point.x,e.point.z)));
  }
}
export function Builder(){
  const selected=useGame(s=>s.selected),world=useGame(s=>s.world),tool=useGame(s=>s.tool),zen=useGame(s=>s.zen),before=useRef<World|null>(null),pointer=useRef<[number,number]|null>(null);
  const o=world.objects.find(o=>o.id===selected);if(!o||zen||tool!=='select'||useGame.getState().preview||useGame.getState().session==='readonly')return null;
  const y=heightAt(world.terrain,o.x,o.z)+o.elevation;
  return <group position={[o.x,y+.1,o.z]}>
    <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.27,.29,40]}/><meshBasicMaterial color="#d0e3ad" depthTest={false} transparent opacity={.8}/></mesh>
    <mesh position={[0,.12,0]} onPointerDown={e=>{e.stopPropagation();before.current=structuredClone(useGame.getState().world);pointer.current=[o.x-e.point.x,o.z-e.point.z];useGame.getState().set({dragging:true});(e.target as unknown as HTMLElement).setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{if(!before.current||!pointer.current)return;e.stopPropagation();const hit=e.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-y),new THREE.Vector3());if(!hit)return;const s=useGame.getState(),world={...s.world};applyTransform(world,o.id,{x:hit.x+pointer.current[0],z:hit.z+pointer.current[1],attachedTo:undefined,elevation:0});s.set({world,saved:false});}}
      onPointerUp={e=>{e.stopPropagation();if(before.current){const s=useGame.getState();s.set({undo:[...s.undo,before.current].slice(-40),redo:[],dragging:false});before.current=null;pointer.current=null;}(e.target as unknown as HTMLElement).releasePointerCapture(e.pointerId);}}>
      <sphereGeometry args={[.14,16,12]}/><meshBasicMaterial color="#b8d393" depthTest={false} transparent opacity={.9}/>
    </mesh>
  </group>;
}
