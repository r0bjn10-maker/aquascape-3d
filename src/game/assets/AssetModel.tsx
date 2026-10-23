import { Component,Suspense,useMemo } from 'react';
import type { ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { AssetDef } from '../types';
export class AssetBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}
export function modelURL(path:string){return import.meta.env.BASE_URL+path.replace(/^\/+/, '');}
function Loaded({asset}:{asset:AssetDef}){
  const {scene}=useGLTF(modelURL(asset.model!));
  const model=useMemo(()=>{
    const clone=scene.clone(true),box=new THREE.Box3().setFromObject(clone),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    // Normalize to catalog dimensions while keeping the model's bottom at ground.
    const scale=Math.min(asset.size*2/Math.max(size.x,size.z,.001),asset.height/Math.max(size.y,.001));
    clone.scale.setScalar(scale);clone.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
    clone.traverse(child=>{if(child instanceof THREE.Mesh){child.castShadow=true;child.receiveShadow=true;}});
    return clone;
  },[scene,asset]);
  return <primitive object={model}/>;
}
export function AssetModel({asset,fallback}:{asset:AssetDef;fallback:ReactNode}){
  if(!asset.model)return fallback;
  return <AssetBoundary key={asset.model} fallback={fallback}><Suspense fallback={fallback}><Loaded asset={asset}/></Suspense></AssetBoundary>;
}
