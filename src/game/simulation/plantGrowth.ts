import type { World,PlacedObject } from '../types';
import { assets } from '../../data/catalog';
import { PLANT_BALANCE,plantBiology } from '../../data/biology';
import { clamp,heightAt } from '../terrain/heightfield';
export function spaceFactors(world:World){
  const plants=world.objects.filter(o=>PLANT_BALANCE[o.asset]),factors=new Map<string,number>();
  for(const p of plants){let crowd=0;for(const q of plants)if(p!==q&&Math.hypot(p.x-q.x,p.z-q.z)<.35)crowd++;factors.set(p.id,Math.max(.3,1-crowd*.1));}return factors;
}
export function updateMorphology(p:PlacedObject,world:Pick<World,'terrain'>){
  if(!p.bio)p.bio=plantBiology(p);const b=PLANT_BALANCE[p.asset],asset=assets[p.asset];if(!b)return;
  p.bio.stage=Math.min(4,1+Math.floor(p.growth*4));
  p.bio.height=Math.max(.01,Math.min(3.18-heightAt(world.terrain,p.x,p.z)-p.elevation,asset.height*p.scale*(.3+.7*p.growth)));
  p.bio.spread=Math.max(.03,Math.min(b.spread*p.scale*(.25+.75*p.growth),2.95-Math.abs(p.x),1.45-Math.abs(p.z)));
  p.bio.density=clamp((.25+.75*p.growth)*(p.health/150+.34),.05,1);
  p.bio.branches=asset.plant?.habit==='stem'?Math.min(4,1+p.trim+(p.growth>.7?1:0)):1;
  p.bio.runners=asset.plant?.habit==='grass'||asset.plant?.habit==='carpet'?Math.min(4,Math.floor(p.growth*4)):0;
}
export function growPlants(w:World,days:number,light:number,space:Map<string,number>,decay=1){
  for(const p of w.objects){
    const b=PLANT_BALANCE[p.asset];if(!b)continue;if(!p.bio)p.bio=plantBiology(p);const bio=p.bio;if(!bio.alive)continue;
    const a=assets[p.asset];p.age+=days*86400;
    bio.lightCondition=clamp(light/(a.light??45)*100,0,100);bio.nutrientCondition=clamp(w.water.nutrients/30*100,0,100);bio.co2Condition=clamp(w.water.co2/(a.co2??30)*100,0,100);
    bio.temperatureCondition=w.water.temperature>=b.temp[0]&&w.water.temperature<=b.temp[1]?100:35;
    const suitability=Math.min(bio.lightCondition,bio.nutrientCondition,bio.co2Condition,bio.temperatureCondition)/100;
    const lightPlan=w.automation.light,adequateLight=w.water.light>=(a.light??45)*.25&&(!lightPlan.automatic||lightPlan.durationMinutes>=240);
    const healthy=w.water.nutrients>8&&w.water.co2>8&&adequateLight&&bio.temperatureCondition>50;
    p.health=clamp(p.health+(healthy?2:-5*decay)*days,0,100);
    p.growth=clamp(p.growth+(1-p.growth)*b.rate*suitability*(p.health/100)*(space.get(p.id)??1)*days,0,1);
    if(!healthy){p.growth=Math.max(0,p.growth-.025*days);p.biomass=Math.max(.04,p.biomass*(1-.12*days));}else p.biomass=.1+p.growth*1.8;
    bio.alive=p.health>0;updateMorphology(p,w);
  }
}
