import { useMemo,useRef,useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { qualitySettings } from '../scene/settings';
import { useGame,visibleWorld } from '../../state/store';
import { COLS,ROWS,perimeter } from './heightfield';
import { substrateTextures } from '../assets/surfaces';
import { groundAction } from '../interactions/Builder';
import { updatePlacementCursor } from '../interactions/cursor';
export function Terrain(){
  const terrain=useGame(s=>visibleWorld(s).terrain),substrate=useGame(s=>visibleWorld(s).substrate);
  const tool=useGame(s=>s.tool),radius=useGame(s=>s.brushRadius),ring=useRef<THREE.Mesh>(null);
  const quality=useGame(s=>s.quality),adaptiveLow=useGame(s=>s.adaptiveLow),caustics=qualitySettings(quality,adaptiveLow).caustics;
  const time=useMemo(()=>({value:0}),[]);useFrame((_,dt)=>{time.value+=Math.min(dt,.05);});
  const shade=useMemo(()=>(shader:Parameters<THREE.Material['onBeforeCompile']>[0])=>{if(!caustics)return;shader.uniforms.uBedTime=time;shader.vertexShader='varying vec3 vBed;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBed=position;');shader.fragmentShader='varying vec3 vBed;uniform float uBedTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat ray=pow(max(0.,sin(vBed.x*17.+sin(vBed.z*13.+uBedTime)) * cos(vBed.z*19.-uBedTime*.5)),12.);diffuseColor.rgb*=1.+ray*.075;`);},[caustics,time]);
  const textures=useMemo(()=>substrateTextures(substrate),[substrate]);
  useEffect(()=>()=>Object.values(textures).forEach(texture=>texture.dispose()),[textures]);
  const geometry=useMemo(()=>{
    const g=new THREE.PlaneGeometry(6,3,COLS-1,ROWS-1);g.rotateX(-Math.PI/2);
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,terrain[i]);
    g.computeVertexNormals();return g;
  },[terrain]);
  const skirt=useMemo(()=>{
    const edge=perimeter(terrain),positions:number[]=[],uv:number[]=[],indices:number[]=[];
    edge.forEach(([x,y,z],i)=>{positions.push(x,.06,z,x,y,z);uv.push(i/32,0,i/32,y);const j=(i+1)%edge.length;indices.push(i*2,i*2+1,j*2,i*2+1,j*2+1,j*2);});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  },[terrain]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>()=>skirt.dispose(),[skirt]);
  return <group><mesh geometry={geometry} receiveShadow onClick={groundAction} onPointerMove={e=>{if(tool==='place')updatePlacementCursor(e.point);if(ring.current&&['raise','lower','smooth'].includes(tool)){ring.current.visible=true;ring.current.position.copy(e.point);ring.current.position.y+=.02;}}} onPointerLeave={()=>{if(ring.current)ring.current.visible=false;}}><meshStandardMaterial color={substrate==='sand'?'#d6c49e':'#51483a'} {...textures} normalScale={new THREE.Vector2(.5,.5)} roughness={.97} onBeforeCompile={shade} customProgramCacheKey={()=>`substrate-caustics-${caustics}`}/></mesh>
    {['raise','lower','smooth'].includes(tool)&&<mesh ref={ring} visible={false} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[radius*.95,radius,48]}/><meshBasicMaterial color="#d1e6ac" depthTest={false} transparent opacity={.7}/></mesh>}
    <mesh geometry={skirt} receiveShadow><meshStandardMaterial color={substrate==='sand'?'#b5a17e':'#3f382d'} map={textures.map} roughness={1} side={THREE.DoubleSide}/></mesh>
    <mesh position={[0,.06,0]}><boxGeometry args={[5.99,.12,2.99]}/><meshStandardMaterial color={substrate==='sand'?'#b8a17b':'#3a332b'} roughness={1}/></mesh></group>;
}
