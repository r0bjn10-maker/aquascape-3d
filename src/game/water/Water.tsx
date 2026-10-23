import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame,visibleWorld } from '../../state/store';
import { appearanceOf,LIGHTING } from '../scene/settings';
export function Water(){
  const water=useGame(s=>visibleWorld(s).water),preset=useGame(s=>LIGHTING[appearanceOf(visibleWorld(s)).lighting]),material=useRef<THREE.ShaderMaterial>(null);
  const uniforms=useMemo(()=>({uTime:{value:0},uAlgae:{value:0},uTint:{value:new THREE.Color('#74a49d')},uLight:{value:new THREE.Color('#f1f5e4')}}),[]);
  useFrame((_,dt)=>{if(material.current){uniforms.uTime.value+=Math.min(dt,.05);uniforms.uAlgae.value=visibleWorld(useGame.getState()).water.algae/100;uniforms.uLight.value.set(preset.key);}});
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,3.31,0]} renderOrder={3}>
      <planeGeometry args={[5.97,2.97,32,16]}/>
      <shaderMaterial ref={material} transparent depthWrite={false} side={THREE.DoubleSide} uniforms={uniforms}
        vertexShader={`uniform float uTime;varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*6.+uTime*.8)*cos(p.y*9.+uTime*.5)*.005;vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`}
        fragmentShader={`uniform float uTime;uniform float uAlgae;uniform vec3 uTint;uniform vec3 uLight;varying vec2 vUv;varying vec3 vWorld;
          void main(){vec3 n=normalize(vec3(sin(vUv.x*43.+uTime)*.025,1.,cos(vUv.y*38.-uTime*.7)*.025));vec3 view=normalize(cameraPosition-vWorld);float fresnel=pow(1.-abs(dot(n,view)),3.);float glint=pow(max(0.,dot(reflect(-normalize(vec3(1.,7.,2.)),n),view)),95.);float ripple=pow(max(0.,sin(vUv.x*100.+sin(vUv.y*60.+uTime)*2.)*sin(vUv.y*95.-uTime*.5)),10.);vec3 c=mix(uTint,vec3(.3,.43,.19),uAlgae*.25);gl_FragColor=vec4(c*.65+uLight*(glint*.6+ripple*.10),.035+fresnel*.10+glint*.10+ripple*.025);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`}/>
    </mesh>
    {water.algae>20&&<mesh position={[0,.35,-1.485]}><planeGeometry args={[5.9,.7]}/><meshBasicMaterial color="#6d8b38" transparent opacity={Math.min(.25,water.algae/250)} depthWrite={false}/></mesh>}
  </group>;
}
