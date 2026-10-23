import type { World } from '../types';
import { assets } from '../../data/catalog';
import { clamp } from '../terrain/heightfield';
export const DAY_SECONDS=1200;
export function simulate(w:World,seconds:number):World {
  const next={...w,water:{...w.water},objects:w.objects.map(o=>({...o})),animals:w.animals.map(f=>({...f})),achievements:[...w.achievements]},days=seconds/DAY_SECONDS,p=next.water;next.seconds+=seconds;
  const plants=next.objects.filter(o=>assets[o.asset]?.category==='plants'),biomass=plants.reduce((s,o)=>s+o.biomass,0),load=next.animals.reduce((s,f)=>s+(f.species==='shrimp'?.3:1),0),light=p.light*(p.photoperiod/8),creative=next.mode==='creative';
  p.maturity=clamp(p.maturity+(next.equipment.filter?8:1)*days,0,100);
  p.waste=clamp(p.waste+(load*.5-(next.equipment.filter?p.maturity*.16:0))*days,0,100);
  p.nutrients=clamp(p.nutrients+(p.waste*.08-biomass*.08)*days,0,100);
  p.co2=clamp(p.co2+((next.equipment.co2?70:35)-p.co2)*.7*days,0,100);
  p.oxygen=clamp(p.oxygen+((next.equipment.aerator?98:75)+biomass*.1-p.waste*.3-p.co2*.12-p.oxygen)*days,0,100);
  const shrimp=next.animals.filter(f=>f.species==='shrimp').length;
  p.algae=clamp(p.algae+((light/100)*(p.nutrients/100)*12-2-shrimp*.12)*days,0,100);p.clarity=clamp(100-p.waste*.55-p.algae*.4,0,100);
  if(next.equipment.heater)p.temperature+=(24-p.temperature)*Math.min(1,days);
  for(const plant of plants){const spec=assets[plant.asset],suit=Math.min(1,light/(spec.light??45))*Math.min(1,p.co2/(spec.co2??30))*Math.min(1,p.nutrients/30);plant.age+=seconds;plant.growth=clamp(plant.growth+(spec.growthRate??.1)*suit*days,0,1);plant.health=clamp(plant.health+(creative?3:suit>.35?2:-3)*days,10,100);plant.biomass=.3+plant.growth*1.5;}
  for(const f of next.animals){f.hunger=clamp(f.hunger+12*days,0,100);f.energy=clamp(f.energy+(f.hunger<55?4:-8)*days,0,100);const bad=p.waste>55||p.oxygen<40||p.co2>80||p.temperature>29||p.temperature<20;f.stress=clamp(f.stress+(creative?-10:bad?12:-5)*days,0,100);f.health=clamp(f.health+(creative?3:f.stress>65||f.hunger>85?-5:2)*days,10,100);}
  if(!next.achievements.includes('healthy')&&plants.length>=5&&plants.every(p=>p.growth>.7&&p.health>65)){next.achievements.push('healthy');next.coins+=200;}
  return next;
}
export class FixedClock {remainder=0;advance(realSeconds:number,speed:number,step:(seconds:number)=>void){this.remainder+=realSeconds*speed;while(this.remainder>=.25){step(.25);this.remainder-=.25;}}}
export const healthScore=(w:World)=>Math.round((w.water.clarity+w.water.oxygen+(100-w.water.algae)+w.water.maturity)/4);
