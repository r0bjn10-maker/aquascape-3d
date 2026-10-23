import { Component,Suspense,useMemo,useEffect } from 'react';
import type { ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { AssetDef } from '../types';
import { modelPath } from '../../data/modelAssets';
import { meshFromModel,modelDiagnostics,useModelLease } from './modelResources';
export class AssetBoundary extends Component<{children:ReactNode;fallback:ReactNode;path?:string},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){if(this.props.path)modelDiagnostics.failed.add(this.props.path);}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
export function modelURL(path:string){return import.meta.env.BASE_URL+path.replace(/^\/+/, '');}
function Loaded({asset,path,selected=false}:{asset:AssetDef;path:string;selected?:boolean}){
 const {scene}=useGLTF(modelURL(path));useModelLease(scene);
 const {model,materials}=useMemo(()=>{
  if(asset.modelSpec)meshFromModel(scene);
  const clone=scene.clone(true),materials:THREE.Material[]=[];
  // M1 exports are already ground-centered, +Y up, in catalog game units.
  if(!asset.modelSpec){const box=new THREE.Box3().setFromObject(clone),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=Math.min(asset.size*2/Math.max(size.x,size.z,.001),asset.height/Math.max(size.y,.001));clone.scale.setScalar(scale);clone.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);}
  clone.traverse(child=>{if(child instanceof THREE.Mesh){child.castShadow=true;child.receiveShadow=true;const material=(child.material as THREE.MeshStandardMaterial).clone();material.side=THREE.FrontSide;child.material=material;materials.push(material);}});
  return {model:clone,materials};
 },[scene,asset]);
 useEffect(()=>{for(const m of materials)if(m instanceof THREE.MeshStandardMaterial){m.emissive.set(selected?'#315c50':'#000000');m.emissiveIntensity=.30;}},[materials,selected]);
 useEffect(()=>{modelDiagnostics.loaded.add(path);return ()=>materials.forEach(m=>m.dispose());},[path,materials]);
 return <primitive object={model} dispose={null}/>;
}
export function AssetModel({asset,fallback,variant=0,detail=1,selected=false}:{asset:AssetDef;fallback:ReactNode;variant?:number;detail?:number;selected?:boolean}){
 if(!asset.model)return fallback;const path=modelPath(asset,variant,detail);
 return <AssetBoundary key={path} path={path} fallback={fallback}><Suspense fallback={fallback}><Loaded asset={asset} path={path} selected={selected}/></Suspense></AssetBoundary>;
}
