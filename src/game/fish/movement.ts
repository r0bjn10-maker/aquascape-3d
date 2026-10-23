import type { Animal,PlacedObject } from '../types';
import { assets } from '../../data/catalog';
import { FISH_FORMS } from '../../data/forms';
import { clamp,heightAt } from '../terrain/heightfield';
import { footprint } from '../interactions/placement';
export const fishRadius=(f:Animal)=>Math.max(.045,f.life.lengthCm*.065+.025);
export function moveAnimals(fish:Animal[],terrain:number[],objects:PlacedObject[],dt:number,time:number) {
  const obstacles=objects.filter(o=>['rocks','wood'].includes(assets[o.asset]?.category));
  for(const f of fish){
    if(!f.life.alive)continue;
    const form=FISH_FORMS[f.species]??FISH_FORMS.neon,shrimp=f.species==='shrimp',bottom=form.zone==='bottom',radius=fishRadius(f),activity=f.life.behaviour==='resting'?.2:f.life.behaviour==='stressed'?.65:f.life.behaviour==='foraging'?1.15:1,speed=form.speed*activity;
    let ax=Math.sin(time*.3+f.phase)*.15,az=Math.cos(time*.27+f.phase)*.15,ay=Math.sin(time*.38+f.phase)*.04;
    let count=0,cx=0,cy=0,cz=0,avx=0,avy=0,avz=0;
    if(form.school)for(const other of fish){
      if(other===f||other.species!==f.species||!other.life.alive)continue;
      const dx=f.x-other.x,dy=f.y-other.y,dz=f.z-other.z,d=Math.hypot(dx,dy,dz);
      if(d<radius*3&&d>.001){const a=(radius*3-d)*2/d;ax+=dx*a;ay+=dy*a;az+=dz*a;}
      if(d<1.25){count++;cx+=other.x;cy+=other.y;cz+=other.z;avx+=other.vx;avy+=other.vy;avz+=other.vz;}
    }
    if(count){ax+=(cx/count-f.x)*.07+(avx/count-f.vx)*.12;az+=(cz/count-f.z)*.07+(avz/count-f.vz)*.12;ay+=(cy/count-f.y)*.04+(avy/count-f.vy)*.08;}
    const floor=heightAt(terrain,f.x,f.z),desired=bottom?floor+(shrimp?.045:.10):form.zone==='upper'?2.45:1.75;
    ay+=(desired-f.y)*(bottom?2:.13);
    ax+=f.x>2.3?-(f.x-2.3)*2:f.x< -2.3?(-2.3-f.x)*2:0;
    az+=f.z>.95?-(f.z-.95)*2:f.z< -.95?(-.95-f.z)*2:0;
    ay+=f.y<floor+.2?(floor+.2-f.y)*2:f.y>2.9?-(f.y-2.9)*2:0;
    for(const o of obstacles){const a=assets[o.asset],h=heightAt(terrain,o.x,o.z)+o.elevation,dx=f.x-o.x,dz=f.z-o.z,d=Math.hypot(dx,dz),r=footprint(o)+radius+.08;if(f.y<h+a.height*o.scale+radius&&d<r){const force=(r-d)*3/Math.max(.01,d);ax+=dx*force;az+=dz*force;if(!bottom)ay+=.15;}}
    f.vx+=ax*dt;f.vz+=az*dt;f.vy+=ay*dt;
    const v=Math.hypot(f.vx,f.vy,f.vz),target=speed*(.8+.2*Math.sin(time*.5+f.phase));
    if(v>.001){const factor=1+(target/v-1)*Math.min(1,dt*2);f.vx*=factor;f.vy*=factor;f.vz*=factor;}
    const maxX=2.96-radius,maxZ=1.46-radius;
    f.x=clamp(f.x+f.vx*dt,-maxX,maxX);f.z=clamp(f.z+f.vz*dt,-maxZ,maxZ);
    f.y=shrimp?heightAt(terrain,f.x,f.z)+.045:bottom?heightAt(terrain,f.x,f.z)+.10:clamp(f.y+f.vy*dt,heightAt(terrain,f.x,f.z)+radius,3.28-radius);
    // Resolve the whole animal's conservative footprint, including tail extent.
    // Treat branch envelopes as solid: safer than letting fish clip through wood.
    for(let pass=0;pass<2;pass++)for(const o of obstacles){
      const a=assets[o.asset],h=heightAt(terrain,o.x,o.z)+o.elevation+a.height*o.scale;
      if(f.y>=h+radius)continue;
      const r=footprint(o)+radius,dx=f.x-o.x,dz=f.z-o.z,d=Math.hypot(dx,dz);if(d>=r)continue;
      const angle=d>.001?Math.atan2(dz,dx):f.phase,candidates=[angle,0,Math.PI,Math.PI/2,-Math.PI/2].map(t=>({x:o.x+Math.cos(t)*(r+.002),z:o.z+Math.sin(t)*(r+.002)})).filter(p=>Math.abs(p.x)<=maxX&&Math.abs(p.z)<=maxZ);
      candidates.sort((a,b)=>(a.x-f.x)**2+(a.z-f.z)**2-((b.x-f.x)**2+(b.z-f.z)**2));
      if(candidates[0]){f.x=candidates[0].x;f.z=candidates[0].z;}else if(h+radius<3.28-radius)f.y=h+radius;
    }
    if(bottom)f.y=heightAt(terrain,f.x,f.z)+(shrimp?.045:.10);
    if(shrimp&&Math.sin(time*.3+f.phase)>.4){f.vx=0;f.vz=0;}
  }
}
