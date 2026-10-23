import * as THREE from 'three';
import type { AssetDef,PlacedObject } from '../types';
import { morphology } from './morphology';
import { heightAt } from '../terrain/heightfield';
// Shared by live foliage, the placement ghost and generated catalog previews.
export function leafPose(item:PlacedObject,asset:AssetDef,terrain:number[],i:number,count:number,target:THREE.Object3D){
  if(asset.modelSpec?.kind==='leaf-module')return authoredLeafPose(item,asset,terrain,i,count,target);
  const shape=morphology(item),form=asset.plant!,angle=i*2.399+item.rotation+(item.bio?.seed??0)%31,r=shape.spread*Math.sqrt(i/count)*.7;
  let x=item.x+Math.cos(angle)*r,z=item.z+Math.sin(angle)*r,rise=0;
  const stem=form.habit==='stem',branch=stem?Math.floor(i/2)%shape.branches:0;
  if(stem){const phase=branch*2.399+item.rotation;x=item.x+Math.cos(phase)*shape.spread*branch/shape.branches*.65;z=item.z+Math.sin(phase)*shape.spread*branch/shape.branches*.65;const node=Math.floor(i/(shape.branches*2)),levels=Math.ceil(count/(shape.branches*2));rise=shape.height*.86*(node+.5)/(levels+1);}
  if(form.habit==='grass'&&shape.runners){const runner=i%(shape.runners+1),phase=runner*2.399+item.rotation;x=item.x+Math.cos(phase)*shape.spread*runner/(shape.runners+1)*.7;z=item.z+Math.sin(phase)*shape.spread*runner/(shape.runners+1)*.7;}
  const h=shape.height*(.72+.28*Math.sin(i*3+1)**2)*(stem?.25:1);
  target.position.set(x,heightAt(terrain,x,z)+item.elevation+rise+(form.habit==='carpet'?.018:0),z);
  target.rotation.set(form.habit==='grass'?.03:form.habit==='carpet'?1.20:.18+(i%4)*.10,stem?branch*2.399+item.rotation:angle,stem?(i%2?-.9:.9):.08*Math.sin(i*7));
  target.scale.set(h,h,h);target.updateMatrix();return target.matrix;
}

// Growth adds individual paired leaves/nodes and runners; it never scales one
// prebuilt adult plant. The three GLB leaf variants are instanced independently.
function authoredLeafPose(item:PlacedObject,asset:AssetDef,terrain:number[],i:number,count:number,target:THREE.Object3D){
 const shape=morphology(item),seed=(item.bio?.seed??0)%31,pair=Math.floor(i/2),side=i%2,angle=pair*2.399+item.rotation+seed;
 let x=item.x,z=item.z,rise=0,yaw=angle,tilt=.55,length=shape.height*.70;
 if(asset.id==='rotala'){
  const branch=pair%shape.branches,level=Math.floor(pair/shape.branches),levels=Math.ceil(count/(shape.branches*2)),a=branch*2.399+item.rotation;
  x+=Math.cos(a)*shape.spread*branch/shape.branches*.65;z+=Math.sin(a)*shape.spread*branch/shape.branches*.65;
  rise=shape.height*.86*(level+.5)/(levels+1);yaw=level*.45+side*Math.PI+a;tilt=1.05;length=Math.min(.23,shape.height*.28)*(1-level/(levels+1)*.34);
 }else if(asset.id==='monte'){
  const r=shape.spread*Math.sqrt((pair+.5)/Math.ceil(count/2))*.72;
  x+=Math.cos(angle)*r;z+=Math.sin(angle)*r;rise=.013;tilt=.75;length=Math.min(.10,shape.height*.9);yaw=angle+side*Math.PI;
 }else{
  const r=shape.spread*Math.sqrt((i+.5)/count)*.38;x+=Math.cos(angle)*r;z+=Math.sin(angle)*r;tilt=.50+(i%4)*.12;length=shape.height*(.58+.29*Math.sin(i*3+1)**2);
 }
 target.position.set(x,heightAt(terrain,x,z)+item.elevation+rise,z);target.rotation.set(tilt,yaw,.07*Math.sin(i*7));target.scale.setScalar(length);target.updateMatrix();return target.matrix;
}
