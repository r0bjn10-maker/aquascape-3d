import type { World } from '../types';
import { CARE_BALANCE } from '../../data/welfare';
export function welfarePolicy(input:World,offline:boolean){
  const p=CARE_BALANCE[input.clock.careMode],creative=input.mode==='creative'&&input.automation.creativeProtection;
  const protectedAbsence=offline&&input.clock.careMode!=='challenge';
  const floor=(health:number,min:number,decline:number)=>Math.min(health,Math.max(min,health-decline));
  const plants=new Map(input.objects.filter(p=>p.bio?.alive).map(o=>[o.id,creative?o.health:protectedAbsence?floor(o.health,p.plantFloor,p.plantDecline):0]));
  const fish=new Map(input.animals.filter(f=>f.life.alive).map(f=>[f.id,creative?f.health:protectedAbsence?floor(f.health,p.animalFloor,p.animalDecline):0]));
  return (world:World)=>{for(const o of world.objects)if(o.bio){o.health=Math.max(o.health,plants.get(o.id)??0);o.bio.alive=o.health>0;}for(const f of world.animals){f.health=Math.max(f.health,fish.get(f.id)??0);f.life.alive=f.health>0;if(creative)f.stress=Math.min(f.stress,input.animals.find(a=>a.id===f.id)?.stress??f.stress);}};
}
