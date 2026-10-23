import * as THREE from 'three';
import type { AssetDef,PlacedObject } from '../types';
import { morphology } from './morphology';
import { heightAt } from '../terrain/heightfield';
// Shared by live foliage, the placement ghost and generated catalog previews.
export function leafPose(item:PlacedObject,asset:AssetDef,terrain:number[],i:number,count:number,target:THREE.Object3D){
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
