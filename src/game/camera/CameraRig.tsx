import { useRef,useEffect } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OrbitControls as Controls } from 'three-stdlib';
import * as THREE from 'three';
import { useGame } from '../../state/store';
const positions={perspective:[6.6,4.8,8.8],front:[0,2.8,10.8],top:[0,10.5,.02]};
export function CameraRig(){
  const controls=useRef<Controls>(null),view=useGame(s=>s.camera),revision=useGame(s=>s.cameraRevision),target=useRef(new THREE.Vector3(...positions.perspective)),moving=useRef(false);
  const {camera,size}=useThree();
  const aspect=size.width/size.height;
  const dragging=useGame(s=>s.dragging),tool=useGame(s=>s.tool),zen=useGame(s=>s.zen&&s.zenOrbit);
  useEffect(()=>{if(view==='orbit'){moving.current=false;return;}target.current.set(...positions[view] as [number,number,number]);target.current.sub(new THREE.Vector3(0,1.6,0)).multiplyScalar(Math.max(1,1.3/aspect)).add(new THREE.Vector3(0,1.6,0));moving.current=true;if(controls.current)controls.current.target.set(0,1.6,0);},[view,revision,aspect]);
  useFrame((_,dt)=>{if(moving.current){camera.position.lerp(target.current,1-Math.exp(-dt*5));if(camera.position.distanceTo(target.current)<.02)moving.current=false;controls.current?.update();}});
  return <OrbitControls ref={controls} makeDefault target={[0,1.6,0]} minDistance={5} maxDistance={36} maxPolarAngle={Math.PI*.485} enabled={!dragging&&tool==='select'} enableDamping dampingFactor={.08} rotateSpeed={.55} panSpeed={.4} onStart={()=>{moving.current=false;}} autoRotate={zen} autoRotateSpeed={.12}/>;
}
