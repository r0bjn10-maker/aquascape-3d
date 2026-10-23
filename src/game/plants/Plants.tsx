import { useMemo,useRef,useLayoutEffect,useEffect } from 'react';
import { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { modelPath } from '../../data/modelAssets';
import { meshFromModel,modelDiagnostics,useModelLease } from '../assets/modelResources';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame,visibleWorld } from '../../state/store';
import { catalog,assets } from '../../data/catalog';
import { heightAt } from '../terrain/heightfield';
import { leafGeometry } from '../assets/surfaces';
import type { AssetDef } from '../types';
import { selectObject } from '../interactions/Builder';
import { AssetBoundary,modelURL,AssetModel } from '../assets/AssetModel';
import { morphology } from './morphology';
import { leafPose } from './layout';
import { qualitySettings } from '../scene/settings';
const dummy=new THREE.Object3D();
function Species({asset,sourceGeometry,sourceMaterial,variant}:{asset:AssetDef;sourceGeometry?:THREE.BufferGeometry;sourceMaterial?:THREE.MeshStandardMaterial;variant?:number}){
  const mesh=useRef<THREE.InstancedMesh>(null),time=useMemo(()=>({value:0}),[]);
  const terrain=useGame(s=>visibleWorld(s).terrain),all=useGame(s=>visibleWorld(s).objects),selected=useGame(s=>s.selected);
  const items=useMemo(()=>all.filter(o=>o.asset===asset.id),[all,asset.id]);
  const quality=useGame(s=>s.quality),adaptiveLow=useGame(s=>s.adaptiveLow),qualityProfile=qualitySettings(quality,adaptiveLow);
  const geometry=useMemo(()=>sourceGeometry?.clone()??leafGeometry(asset.id,qualityProfile.detail),[asset.id,qualityProfile.detail,sourceGeometry]);
  const material=useMemo(()=>{
    const mat=sourceMaterial?.clone()??new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.73,side:THREE.DoubleSide});
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uTime=time;
      shader.vertexShader='uniform float uTime; varying vec2 vLeafUV;\n'+shader.vertexShader;
      shader.fragmentShader='varying vec2 vLeafUV;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float midrib=exp(-abs(vLeafUV.x-.5)*100.);
        float vein=pow(max(0.,cos((vLeafUV.y+abs(vLeafUV.x-.5)*.45)*95.)),18.);
        diffuseColor.rgb*=.90+.10*vLeafUV.y+midrib*.17+vein*.035;`);
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vLeafUV=uv; float phase=instanceMatrix[3].x*3.7+instanceMatrix[3].z*5.3+instanceMatrix[3].y*9.;
        transformed.x += sin(uTime*1.15+phase+position.y*2.0)*0.045*pow(position.y,2.0);
        transformed.z += cos(uTime*0.7+phase)*0.023*pow(position.y,2.0);`);
    };
    mat.customProgramCacheKey=()=>`leaf-veins-${asset.id}`;
    return mat;
  },[asset,time,sourceMaterial]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>()=>material.dispose(),[material]);
  const mapping=useRef<string[]>([]);
  const transitions=useRef({from:[] as number[][],to:[] as number[][],current:[] as number[][],keys:[] as string[],elapsed:2});
  useLayoutEffect(()=>{
    if(!mesh.current)return;
    let index=0;mapping.current=[];
    const previous=new Map(transitions.current.keys.map((key,i)=>[key,transitions.current.current[i]])),from:number[][]=[],to:number[][]=[],keys:string[]=[];
    for(const item of items){
      const shape=morphology(item),form=asset.plant!,n=Math.min(sourceMaterial&&qualityProfile.detail===0?32:qualityProfile.leafLimit,asset.id==='anubias'&&sourceMaterial?Math.max(4,Math.ceil(shape.count*.55)):shape.count);
      for(let i=0;i<n;i++){
        if(variant!==undefined&&i%3!==variant)continue;
        leafPose(item,asset,terrain,i,n,dummy);
        // Keep complete leaf geometry (including sway allowance) inside the glass.
        geometry.computeBoundingBox();const bounds=geometry.boundingBox!.clone().applyMatrix4(dummy.matrix);
        dummy.position.x+=Math.max(0,-2.90-bounds.min.x)-Math.max(0,bounds.max.x-2.90);
        dummy.position.z+=Math.max(0,-1.40-bounds.min.z)-Math.max(0,bounds.max.z-1.40);
        if(bounds.max.y>3.2)dummy.scale.y*=Math.max(.1,(3.2-dummy.position.y)/(bounds.max.y-dummy.position.y));
        dummy.updateMatrix();const key=item.id+':'+i,target=dummy.matrix.toArray(),start=previous.get(key)?.slice()??target.slice();
        if(previous.size&&!previous.has(key))for(let j=0;j<12;j++)start[j]*=.01;
        from.push(start);to.push(target);keys.push(key);mesh.current.setMatrixAt(index,new THREE.Matrix4().fromArray(start));
        const color=new THREE.Color(sourceMaterial?'#ffffff':asset.color);if(!sourceMaterial)color.lerp(new THREE.Color(form.tip),form.habit==='stem'?((i/n)**2)*.6:.12+(i%5)*.035);color.multiplyScalar(.82+(i%5)*.065);
        if(item.health<75)color.lerp(new THREE.Color('#a69c4b'),Math.min(.85,(75-item.health)/55));
        if(selected===item.id)color.lerp(new THREE.Color('#bce7ac'),.3);
        mesh.current.setColorAt(index,color);mapping.current[index]=item.id;index++;
      }
    }
    mesh.current.count=index;mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
    transitions.current={from,to,keys,current:from.map(m=>m.slice()),elapsed:0};
    mesh.current.computeBoundingSphere();
  },[items,terrain,asset,selected,geometry,qualityProfile.leafLimit,variant,sourceMaterial]);
  useFrame((_,dt)=>{time.value+=Math.min(dt,.1);const tr=transitions.current;if(mesh.current&&tr.elapsed<1.5){tr.elapsed+=Math.min(dt,.25);const t=Math.min(1,tr.elapsed/1.5);for(let i=0;i<tr.to.length;i++){for(let j=0;j<16;j++)tr.current[i][j]=tr.from[i][j]+(tr.to[i][j]-tr.from[i][j])*t;dummy.matrix.fromArray(tr.current[i]);mesh.current.setMatrixAt(i,dummy.matrix);}mesh.current.instanceMatrix.needsUpdate=true;}});
  return <instancedMesh ref={mesh} args={[geometry,material,Math.max(1,items.length*80)]} castShadow receiveShadow frustumCulled={false} onClick={e=>{if(e.instanceId!==undefined)selectObject(mapping.current[e.instanceId],e);}}/>;
}
function LoadedLeaves({asset,variant,path}:{asset:AssetDef;variant:number;path:string}){
  const {scene}=useGLTF(modelURL(path));useModelLease(scene);
  const source=useMemo(()=>meshFromModel(scene),[scene]);
  useEffect(()=>{modelDiagnostics.loaded.add(path);},[path]);
  return <Species asset={asset} variant={variant} sourceGeometry={source.geometry} sourceMaterial={source.material as THREE.MeshStandardMaterial}/>;
}
function AuthoredPlants({asset}:{asset:AssetDef}){
  const quality=useGame(s=>s.quality),adaptiveLow=useGame(s=>s.adaptiveLow),detail=qualitySettings(quality,adaptiveLow).detail;
  return <>{[0,1,2].map(variant=>{const path=modelPath(asset,variant,detail),fallback=<Species asset={asset} variant={variant}/>;
    return <AssetBoundary key={path} path={path} fallback={fallback}><Suspense fallback={fallback}><LoadedLeaves asset={asset} variant={variant} path={path}/></Suspense></AssetBoundary>;
  })}</>;
}
function FallbackPlant({asset}:{asset:AssetDef}){
  const geometry=useMemo(()=>leafGeometry(asset.id),[asset.id]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group>{Array.from({length:10},(_,i)=><mesh key={i} geometry={geometry} rotation={[.2+(i%3)*.2,i*2.399,0]} position={[Math.cos(i*2.399)*asset.size*.5,0,Math.sin(i*2.399)*asset.size*.5]} scale={[1,asset.height,1]}><meshStandardMaterial color={asset.color} roughness={.8} side={THREE.DoubleSide}/></mesh>)}</group>;
}
function ModelPlants({asset}:{asset:AssetDef}){
  const items=useGame(s=>visibleWorld(s).objects),terrain=useGame(s=>visibleWorld(s).terrain);
  return <>{items.filter(o=>o.asset===asset.id).map(o=><group key={o.id} position={[o.x,heightAt(terrain,o.x,o.z)+o.elevation,o.z]} rotation={[0,o.rotation,0]} scale={o.scale*(.5+o.growth*.5)} onClick={e=>selectObject(o.id,e)}><AssetModel asset={asset} fallback={<FallbackPlant asset={asset}/>}/></group>)}</>;
}
function Stems(){
  const items=useGame(s=>visibleWorld(s).objects),terrain=useGame(s=>visibleWorld(s).terrain),ref=useRef<THREE.InstancedMesh>(null),ids=useRef<string[]>([]);
  useLayoutEffect(()=>{if(!ref.current)return;let n=0;ids.current=[];const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),start=new THREE.Vector3(),end=new THREE.Vector3();
    for(const o of items){const form=assets[o.asset]?.plant;if(!o.bio?.alive||!form||!['stem','grass','rhizome','carpet'].includes(form.habit))continue;const b=o.bio,stem=form.habit==='stem',branches=stem?b.branches:form.habit==='grass'||form.habit==='carpet'?b.runners:1;
      for(let i=0;i<branches;i++){const angle=(!stem?i+1:i)*2.399+o.rotation,r=stem?b.spread*i/branches*.65:b.spread*.65;
        start.set(o.x,heightAt(terrain,o.x,o.z)+o.elevation+.02,o.z);
        const x=Math.max(-2.93,Math.min(2.93,o.x+Math.cos(angle)*r)),z=Math.max(-1.43,Math.min(1.43,o.z+Math.sin(angle)*r));
        if(stem)start.set(x,heightAt(terrain,x,z)+o.elevation+.02,z);
        end.set(x,stem?start.y+b.height*.85:heightAt(terrain,x,z)+o.elevation+.025,z);
        direction.subVectors(end,start);dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());dummy.scale.set(.009,direction.length(),.009);dummy.updateMatrix();ref.current.setMatrixAt(n,dummy.matrix);ids.current[n++]=o.id;
      }
    }ref.current.count=n;ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();
  },[items,terrain]);
  return <instancedMesh ref={ref} args={[undefined,undefined,1200]} frustumCulled={false} onClick={e=>{if(e.instanceId!==undefined)selectObject(ids.current[e.instanceId],e);}}><cylinderGeometry args={[1,1,1,6]}/><meshStandardMaterial color="#58743d" roughness={.85}/></instancedMesh>;
}
export function Plants(){const objects=useGame(s=>visibleWorld(s).objects);return <><Stems/>{catalog.filter(a=>a.category==='plants'&&objects.some(o=>o.asset===a.id)).map(a=>a.modelSpec?.kind==='leaf-module'?<AuthoredPlants key={a.id} asset={a}/>:a.model?<ModelPlants key={a.id} asset={a}/>:<Species key={a.id} asset={assets[a.id]}/>)}</>;}
