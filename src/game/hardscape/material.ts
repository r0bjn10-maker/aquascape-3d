import * as THREE from 'three';
export function stoneMaterial(color:string,kind='seiryu'){
  const material=new THREE.MeshStandardMaterial({color,roughness:kind==='river'?.72:.95,vertexColors:true,flatShading:kind==='seiryu'||kind==='slate'});
  material.customProgramCacheKey=()=>`stone-v2-${kind}`;
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vStone;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;');
    shader.fragmentShader='varying vec3 vStone;\n'+shader.fragmentShader;
    const pattern=kind==='dragon'?'diffuseColor.rgb*=.8+grain*.13-pore*.46;':kind==='lava'?'diffuseColor.rgb*=.7+grain*.22-pore*.55;':kind==='slate'?'diffuseColor.rgb*=.77+sin(vStone.y*126.+vStone.x*5.)*.13;':kind==='granite'?'diffuseColor.rgb=mix(diffuseColor.rgb*(.78+grain*.3),vec3(.68,.64,.55),step(.7,grain)*.55);':kind==='river'?'diffuseColor.rgb*=.92+grain*.05;':'diffuseColor.rgb=mix(diffuseColor.rgb*(.85+grain*.08),vec3(.63,.67,.60),seam*.22);';
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float grain=sin(vStone.x*173.+sin(vStone.y*97.))*sin(vStone.z*141.+vStone.y*109.);
      float seam=pow(max(0.,sin(vStone.y*31.+sin(vStone.x*8.)*.7+vStone.z*5.)),20.);
      float pore=pow(max(0.,sin(vStone.x*38.+vStone.y*21.)*sin(vStone.z*31.+vStone.y*19.)),5.);
      ${pattern}`);
  };
  return material;
}
export function woodMaterial(color:string){
  const material=new THREE.MeshStandardMaterial({color,roughness:.88});
  material.customProgramCacheKey=()=> 'wood-grain-v2';
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vWood;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWood=position;');
    shader.fragmentShader='varying vec3 vWood;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float bark=sin(vWood.x*93.+sin(vWood.y*19.+vWood.z*14.)*3.)*sin(vWood.z*71.+vWood.y*9.);
      float groove=pow(max(0.,sin(vWood.x*34.+vWood.z*27.+sin(vWood.y*7.))),7.);
      diffuseColor.rgb*=.9+bark*.09-groove*.22;`);
  };return material;
}
