import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { catalog } from '../../data/catalog';
import { rockGeometry,woodGeometry,leafGeometry } from './surfaces';
import { createFishGeometry } from './fishGeometry';
import { leafPose } from '../plants/layout';
import { morphology } from '../plants/morphology';
import { plantBiology } from '../../data/biology';
import { updateMorphology } from '../simulation/plantGrowth';
import { makeTerrain } from '../terrain/heightfield';
import type { AssetDef,PlacedObject } from '../types';
export { catalog };
export function previewGeometry(asset:AssetDef,variant=0,growth=.75){
  if(asset.category==='rocks')return {geometry:rockGeometry(asset.id,variant,0,asset.size).scale(1,asset.height,1),color:asset.color};
  if(asset.category==='wood')return {geometry:woodGeometry(asset.id,variant,0,asset.size*1.5).scale(1,asset.height,1),color:asset.color};
  if(asset.category==='fish'){const f=createFishGeometry(asset.id,0);f.tail.translate(f.tailRoot,0,0);const geometry=mergeGeometries([f.body,f.tail]);f.body.dispose();f.tail.dispose();return {geometry,color:'#ffffff'};}
  if(asset.category==='plants'){
    const item:PlacedObject={id:`preview-${asset.id}`,asset:asset.id,x:0,z:0,scale:1,elevation:0,rotation:0,age:0,growth,health:95,biomass:1,trim:0};item.bio=plantBiology(item);
    const terrain=makeTerrain(true);updateMorphology(item,{terrain});const source=leafGeometry(asset.id,0),shape=morphology(item),dummy=new THREE.Object3D(),parts:THREE.BufferGeometry[]=[];
    for(let i=0;i<shape.count;i++){leafPose(item,asset,terrain,i,shape.count,dummy);parts.push(source.clone().applyMatrix4(dummy.matrix));}
    source.dispose();const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());return {geometry,color:asset.color};
  }
  const geometry=new THREE.BoxGeometry(.55,.8,.35);return {geometry,color:asset.color};
}
export function previewTriangles(asset:AssetDef,variant=0){
  const {geometry:g,color}=previewGeometry(asset,variant);g.computeBoundingBox();
  const box=g.boundingBox!,center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z)*.7+.03;
  const camera=new THREE.OrthographicCamera(-extent,extent,extent*.875,-extent*.875,.01,100);
  camera.position.copy(center).add(new THREE.Vector3(asset.category==='fish'?.9:2.4,asset.category==='fish'?.45:1.6,3).normalize().multiplyScalar(extent*6));camera.lookAt(center);camera.updateMatrixWorld();
  const project=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),position=g.attributes.position,normals=g.attributes.normal,colors=g.attributes.color,index=g.index,base=new THREE.Color(color),light=new THREE.Vector3(-.4,1,.7).normalize(),triangles=[];
  const v=new THREE.Vector3(),n=new THREE.Vector3(),c=new THREE.Color(),count=index?.count??position.count;
  for(let i=0;i<count;i+=3){let depth=0,nx=0,ny=0,nz=0,red=0,green=0,blue=0;const points=[];
    for(let k=0;k<3;k++){const j=index?index.getX(i+k):i+k;v.fromBufferAttribute(position,j).applyMatrix4(project);points.push([+(64+v.x*61).toFixed(2),+(56-v.y*53).toFixed(2)]);depth+=v.z;n.fromBufferAttribute(normals,j);nx+=n.x;ny+=n.y;nz+=n.z;if(colors)c.fromBufferAttribute(colors,j).multiply(base);else c.copy(base);red+=c.r;green+=c.g;blue+=c.b;}
    const shade=.55+.45*Math.abs(n.set(nx,ny,nz).normalize().dot(light));c.setRGB(red/3*shade,green/3*shade,blue/3*shade);triangles.push({points,depth:depth/3,color:'#'+c.getHexString()});
  }
  triangles.sort((a,b)=>b.depth-a.depth);g.dispose();return triangles;
}
