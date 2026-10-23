import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame,visibleWorld } from '../../state/store';
export function Equipment(){
  const equipment=useGame(s=>visibleWorld(s).equipment),bubbles=useRef<THREE.InstancedMesh>(null),phase=useRef(0),dummy=useMemo(()=>new THREE.Object3D(),[]);
  const tube=useMemo(()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-2.75,.5,-1.24),new THREE.Vector3(-2.75,3.25,-1.24),new THREE.Vector3(-2.75,3.7,-1.36),new THREE.Vector3(-2.6,3.6,-1.65)]),30,.035,8,false),[]);
  useFrame((_,dt)=>{phase.current+=Math.min(dt,.05);if(!bubbles.current)return;for(let i=0;i<28;i++){const y=.35+((phase.current*.3+i*.117)%2.9);dummy.position.set(2.55+Math.sin(i*2.1+y*2)*.035,y,-1.08+Math.cos(i*1.2+y)*.035);dummy.scale.setScalar(.008+(i%3)*.003);dummy.updateMatrix();bubbles.current.setMatrixAt(i,dummy.matrix);}bubbles.current.instanceMatrix.needsUpdate=true;});
  return <group>
    {equipment.filter&&<mesh geometry={tube}><meshPhysicalMaterial color="#b9d1c3" roughness={.2} transparent opacity={.4}/></mesh>}
    {equipment.heater&&<mesh position={[2.77,1.3,-1.3]}><cylinderGeometry args={[.045,.045,1.3,10]}/><meshStandardMaterial color="#344743" metalness={.5} roughness={.3}/></mesh>}
    {equipment.aerator&&<instancedMesh ref={bubbles} args={[undefined,undefined,28]} frustumCulled={false}><sphereGeometry args={[1,6,6]}/><meshBasicMaterial color="#c9e7d5" transparent opacity={.32} depthWrite={false}/></instancedMesh>}
  </group>;
}
