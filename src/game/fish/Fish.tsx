import { useRef,useMemo,useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame,visibleWorld } from '../../state/store';
import { FISH_FORMS } from '../../data/forms';
import { createFishGeometry } from '../assets/fishGeometry';
import { moveAnimals } from './movement';
import type { Animal } from '../types';
import { recordPose,withVisualPose } from './poses';
import { qualitySettings } from '../scene/settings';
const dummy=new THREE.Object3D(),color=new THREE.Color();
interface VisualFish {fish:Animal[];time:number;sizes:Map<string,number>}
function Batch({species,visual,detail}:{species:string;visual:React.RefObject<VisualFish>;detail:number}){
  const body=useRef<THREE.InstancedMesh>(null),tail=useRef<THREE.InstancedMesh>(null);
  const geometry=useMemo(()=>createFishGeometry(species,detail),[species,detail]);
  const materials=useMemo(()=>({body:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.34,metalness:.12,side:THREE.DoubleSide}),tail:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.04,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false})}),[]);
  useEffect(()=>()=>{geometry.body.dispose();geometry.tail.dispose();},[geometry]);
  useEffect(()=>()=>{materials.body.dispose();materials.tail.dispose();},[materials]);
  useFrame((_,dt)=>{
    let i=0;const state=visual.current;
    for(const f of state.fish){if(f.species!==species||!f.life.alive)continue;
      const target=f.life.lengthCm/10,old=state.sizes.get(f.id)??target,size=old+(target-old)*(1-Math.exp(-dt*2));state.sizes.set(f.id,size);
      const angle=-Math.atan2(f.vz,f.vx),pitch=Math.atan2(f.vy,Math.hypot(f.vx,f.vz))*.45;
      dummy.position.set(f.x,f.y,f.z);dummy.rotation.set(0,angle,pitch);dummy.scale.setScalar(size);dummy.updateMatrix();body.current?.setMatrixAt(i,dummy.matrix);
      color.set(f.health<45?'#b5aa90':'#ffffff');color.multiplyScalar(.78+f.health*.0022);body.current?.setColorAt(i,color);tail.current?.setColorAt(i,color);
      const root=geometry.tailRoot*size;
      dummy.position.set(f.x+Math.cos(angle)*root,f.y+Math.sin(pitch)*root,f.z-Math.sin(angle)*root);
      dummy.rotation.set(0,angle+Math.sin(state.time*(species==='betta'?6:12)+f.phase)*(species==='shrimp'?.08:.22),pitch);dummy.updateMatrix();tail.current?.setMatrixAt(i++,dummy.matrix);
    }
    for(const ref of [body,tail])if(ref.current){ref.current.count=i;ref.current.instanceMatrix.needsUpdate=true;if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;}
  });
  return <group><instancedMesh ref={body} args={[geometry.body,materials.body,80]} frustumCulled={false}/><instancedMesh ref={tail} args={[geometry.tail,materials.tail,80]} frustumCulled={false}/></group>;
}
export function Fish(){
  const animals=useGame(s=>visibleWorld(s).animals),quality=useGame(s=>s.quality),adaptiveLow=useGame(s=>s.adaptiveLow);
  const visual=useRef<VisualFish>({fish:[],time:0,sizes:new Map()}),previous=useRef<unknown>(null),acc=useRef(0),wasPreview=useRef(false);
  useFrame((_,delta)=>{
    const s=useGame.getState(),world=visibleWorld(s),data=visual.current;
    if(wasPreview.current!==!!s.preview){if(!s.preview){data.fish=world.animals.map(withVisualPose);previous.current=world.animals;}wasPreview.current=!!s.preview;}
    if(previous.current!==world.animals){const old=new Map(data.fish.map(f=>[f.id,f]));data.fish=world.animals.map(f=>{const p=old.get(f.id);return p?{...f,x:p.x,y:p.y,z:p.z,vx:p.vx,vy:p.vy,vz:p.vz}:withVisualPose(f);});previous.current=world.animals;const ids=new Set(world.animals.map(f=>f.id));for(const id of data.sizes.keys())if(!ids.has(id))data.sizes.delete(id);}
    data.time+=Math.min(delta,.05);acc.current+=Math.min(delta,.1);
    while(acc.current>=1/30){moveAnimals(data.fish,world.terrain,world.objects,1/30,data.time);acc.current-=1/30;}
    if(!s.preview)for(const f of data.fish)recordPose(f);
  },-1);
  const detail=qualitySettings(quality,adaptiveLow).detail;
  return <>{Object.keys(FISH_FORMS).filter(id=>animals.some(f=>f.species===id&&f.life.alive)).map(id=><Batch key={id} species={id} visual={visual} detail={detail}/>)}</>;
}
