import { useGame,visibleWorld } from '../../state/store';
import { appearanceOf,LIGHTING,qualitySettings } from '../scene/settings';
export function Tank(){
  const glass=useGame(s=>s.glass),top=useGame(s=>s.camera==='top'),appearance=useGame(s=>appearanceOf(visibleWorld(s))),preset=LIGHTING[appearance.lighting];
  const quality=useGame(s=>s.quality),adaptiveLow=useGame(s=>s.adaptiveLow),low=qualitySettings(quality,adaptiveLow).level==='low';
  const glassMaterial=low?<meshBasicMaterial color="#c3e0d9" transparent opacity={.035} depthWrite={false}/>:<meshPhysicalMaterial color="#c3e0d9" roughness={.07} metalness={0} ior={1.46} clearcoat={1} clearcoatRoughness={.06} envMapIntensity={.65} transparent opacity={.045} depthWrite={false}/>;
  return <group>
    {glass&&<group>
      <mesh position={[0,1.8,-1.5]} renderOrder={4}><boxGeometry args={[6.035,3.6,.035]}/>{glassMaterial}</mesh>
      {[-3,3].map(x=><mesh key={x} position={[x,1.8,0]} renderOrder={5}><boxGeometry args={[.035,3.6,3.035]}/>{glassMaterial}</mesh>)}
      {appearance.frontGlass&&<mesh position={[0,1.8,1.5]} renderOrder={6}><boxGeometry args={[6.035,3.6,.035]}/>{low?<meshBasicMaterial color="#d1e8e2" transparent opacity={.023} depthWrite={false}/>:<meshPhysicalMaterial color="#d1e8e2" roughness={.06} ior={1.46} clearcoat={1} envMapIntensity={.5} transparent opacity={.027} depthWrite={false}/>}</mesh>}
      {[-3,3].flatMap(x=>[-1.5,1.5].map(z=><mesh key={`${x}${z}`} position={[x,1.8,z]} renderOrder={7}><boxGeometry args={[.016,3.6,.016]}/><meshBasicMaterial color="#aacdc7" transparent opacity={.35} depthWrite={false}/></mesh>))}
      {[0,3.6].map(y=><group key={y} position={[0,y,0]}>{[-1.5,1.5].map(z=><mesh key={z} position={[0,0,z]}><boxGeometry args={[6.04,.016,.035]}/><meshStandardMaterial color="#b6d6cd" metalness={.35} roughness={.2} transparent opacity={.42} depthWrite={false}/></mesh>)}{[-3,3].map(x=><mesh key={x} position={[x,0,0]}><boxGeometry args={[.035,.016,3.04]}/><meshStandardMaterial color="#a6c8bf" transparent opacity={.42} depthWrite={false}/></mesh>)}</group>)}
    </group>}
    <mesh position={[0,-.065,0]} receiveShadow><boxGeometry args={[6.08,.13,3.08]}/><meshStandardMaterial color="#252e2c" roughness={.62}/></mesh>
    <mesh position={[0,-.38,0]} castShadow receiveShadow><boxGeometry args={[6.25,.5,3.25]}/><meshStandardMaterial color="#393e35" roughness={.82}/></mesh>
    <group visible={!top}><mesh position={[0,3.95,-.1]} castShadow><boxGeometry args={[5.6,.08,.34]}/><meshStandardMaterial color="#242e2c" roughness={.3} metalness={.7}/></mesh>
      <mesh position={[0,3.9,-.1]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[5.25,.24]}/><meshBasicMaterial color={preset.key} toneMapped={false}/></mesh>
      {[-2.6,2.6].map(x=><mesh key={x} position={[x,3.72,-.1]}><boxGeometry args={[.025,.42,.025]}/><meshStandardMaterial color="#788b81" metalness={.75} roughness={.2}/></mesh>)}
    </group>
  </group>;
}
