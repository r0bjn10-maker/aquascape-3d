import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
// Original studio reflection map, generated locally. No HDR/image hotlinks.
export function Reflection(){
  const {gl,scene}=useThree();
  useEffect(()=>{
    const width=128,height=64,data=new Uint8Array(width*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const top=1-y/height,strip=y>9&&y<15&&x>28&&x<100?1:0,c=.10+.32*top+strip*.5,i=(y*width+x)*4;
      data.set([c*238,c*247,c*240,255],i);
    }
    const source=new THREE.DataTexture(data,width,height);source.mapping=THREE.EquirectangularReflectionMapping;source.colorSpace=THREE.SRGBColorSpace;source.needsUpdate=true;
    const generator=new THREE.PMREMGenerator(gl),target=generator.fromEquirectangular(source),previous=scene.environment;
    scene.environment=target.texture;scene.environmentIntensity=.5;source.dispose();generator.dispose();
    return()=>{if(scene.environment===target.texture)scene.environment=previous;target.dispose();};
  },[gl,scene]);return null;
}
