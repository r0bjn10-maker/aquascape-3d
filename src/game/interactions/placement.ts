import { resolveAsset } from '../../data/catalog';
import { clamp,heightAt } from '../terrain/heightfield';
import type { PlacedObject,World } from '../types';
export const footprint=(o:PlacedObject)=>resolveAsset(o.asset).size*o.scale*(resolveAsset(o.asset).category==='wood'?1.5:1);
export function constrainObject(o:PlacedObject,terrain:number[]):PlacedObject {
  const a=resolveAsset(o.asset),factor=a.category==='wood'?1.5:1,scale=clamp(o.scale,.35,Math.min(1.6,1.45/(a.size*factor))),r=a.size*scale*factor;
  const x=clamp(o.x,-3+r,3-r),z=clamp(o.z,-1.5+r,1.5-r),finalScale=Math.min(scale,Math.max(.35,(3.25-heightAt(terrain,x,z))/a.height));
  return {...o,x,z,scale:finalScale,rotation:o.rotation%(Math.PI*2),elevation:clamp(o.elevation,0,Math.max(0,3.25-heightAt(terrain,x,z)-a.height*finalScale))};
}
export function applyTransform(w:World,id:string,patch:Partial<PlacedObject>){
  const old=w.objects.find(o=>o.id===id);if(!old)return;
  const next=constrainObject({...old,...patch},w.terrain),turn=next.rotation-old.rotation,ratio=next.scale/old.scale;
  w.objects=w.objects.map(o=>{
    if(o.id===id)return next;if(o.attachedTo!==id)return o;
    const dx=o.x-old.x,dz=o.z-old.z,x=next.x+(dx*Math.cos(turn)+dz*Math.sin(turn))*ratio,z=next.z+(-dx*Math.sin(turn)+dz*Math.cos(turn))*ratio;
    const y=heightAt(w.terrain,next.x,next.z)+next.elevation+(heightAt(w.terrain,o.x,o.z)+o.elevation-heightAt(w.terrain,old.x,old.z)-old.elevation)*ratio;
    return constrainObject({...o,x,z,elevation:y-heightAt(w.terrain,x,z)},w.terrain);
  });
}
