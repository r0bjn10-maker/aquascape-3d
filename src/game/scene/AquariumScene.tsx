import { Component,Suspense,useState,useEffect } from 'react';
import type { ReactNode } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Tank } from '../aquarium/Tank';
import { Water } from '../water/Water';
import { Terrain } from '../terrain/Terrain';
import { Hardscape } from '../hardscape/Hardscape';
import { Plants } from '../plants/Plants';
import { Fish } from '../fish/Fish';
import { CameraRig } from '../camera/CameraRig';
import { useGame,visibleWorld } from '../../state/store';
import { Builder } from '../interactions/Builder';
import { Equipment } from '../equipment/Equipment';
import { effectiveLight } from '../simulation/automation';
import { appearanceOf,LIGHTING,qualitySettings } from './settings';
import { Reflection } from './Reflection';
import { PlacementGhost } from '../interactions/PlacementGhost';
export const metrics={fps:0,frameMs:0,calls:0,triangles:0,textures:0,geometries:0,programs:0};
function Monitor(){
  const [sample]=useState(()=>({time:0,frames:0,slow:0,level:1,lastChange:0}));
  useFrame(({gl},dt)=>{
    sample.time+=dt;sample.frames++;
    if(sample.time>1){
      metrics.fps=Math.round(sample.frames/sample.time);metrics.frameMs=sample.time*1000/sample.frames;
      metrics.calls=gl.info.render.calls;metrics.triangles=gl.info.render.triangles;metrics.textures=gl.info.memory.textures;metrics.geometries=gl.info.memory.geometries;metrics.programs=gl.info.programs?.length??0;
      sample.slow=metrics.fps<25?sample.slow+1:Math.max(0,sample.slow-1);
      if(useGame.getState().quality==='auto'&&sample.slow>=5&&!useGame.getState().adaptiveLow){useGame.getState().set({adaptiveLow:true});sample.slow=0;}
      sample.time=0;sample.frames=0;
    }
  });return null;
}
class SceneBoundary extends Component<{children:ReactNode},{error:boolean}>{
  state={error:false};static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<div className="graphics-error">Không thể khởi tạo WebGL. Hãy bật tăng tốc đồ họa hoặc thử trình duyệt mới hơn.<button onClick={()=>location.reload()}>Thử lại</button></div>:this.props.children;}
}
function Contents(){
  const quality=useGame(s=>s.quality),adaptiveLow=useGame(s=>s.adaptiveLow),water=useGame(s=>visibleWorld(s).water),appearance=useGame(s=>appearanceOf(visibleWorld(s))),profile=qualitySettings(quality,adaptiveLow),preset=LIGHTING[appearance.lighting];
  const {gl}=useThree();
  useEffect(()=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=preset.exposure;},[gl,preset]);
  const lamp=.35+.65*effectiveLight(visibleWorld(useGame.getState()))/65;
  return <>
    <color attach="background" args={[preset.background]}/>
    {profile.level!=='low'&&<Reflection/>}
    <hemisphereLight args={[preset.sky,preset.ground,preset.ambient*(profile.level==='low'?1.35:1)]}/>
    <directionalLight position={[1,7,2]} intensity={preset.intensity*lamp} color={preset.key} castShadow={profile.shadows} shadow-mapSize={profile.shadowSize} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-.00035} shadow-normalBias={.015} shadow-radius={2}/>
    <directionalLight position={[-4,3,-3]} intensity={preset.ambient*.85} color={preset.rim}/>
    <pointLight position={[3,3,3]} intensity={preset.ambient*5} color={water.warmth>70?'#ffe1b8':preset.rim} distance={12}/>
    <Tank/><Terrain/><Hardscape/><Plants/><Fish/><Water/><Equipment/><Builder/><PlacementGhost/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.65,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#263c35" roughness={.93}/></mesh>
    <CameraRig/><Monitor/>
  </>;
}
export function AquariumScene(){
  const quality=useGame(s=>s.quality),adaptiveLow=useGame(s=>s.adaptiveLow),profile=qualitySettings(quality,adaptiveLow),[lost,setLost]=useState(false);
  return <SceneBoundary>{lost&&<div className="context-notice">Đang khôi phục đồ họa 3D…</div>}
    <Canvas shadows={profile.shadows} dpr={profile.dpr} camera={{position:[6.6,4.8,8.8],fov:40,near:.1,far:100}} gl={{antialias:profile.level!=='low',alpha:false,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping}} onCreated={({gl})=>{gl.setClearColor('#192b2c');gl.shadowMap.type=THREE.PCFSoftShadowMap;gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setLost(true);});gl.domElement.addEventListener('webglcontextrestored',()=>setLost(false));}}>
      <Suspense fallback={null}><Contents/></Suspense>
    </Canvas>
  </SceneBoundary>;
}
