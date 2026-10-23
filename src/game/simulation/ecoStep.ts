import type { World,Activity } from '../types';
import { effectiveLight,effectiveCO2 } from './automation';
import { clamp } from '../terrain/heightfield';
import { growPlants } from './plantGrowth';
import { growAnimals } from './animalGrowth';
import { CARE_BALANCE } from '../../data/welfare';
export function stepEcology(w:World,seconds:number,utc:number,space:Map<string,number>,activity:Activity){
  const days=seconds/86400,p=w.water,a=w.automation,light=effectiveLight(w,utc),co2=effectiveCO2(w,utc);
  const policy=CARE_BALANCE[w.clock.careMode];
  const animals=w.animals.filter(f=>f.life.alive),bioload=animals.reduce((n,f)=>n+(f.species==='shrimp'?.25:1)*Math.pow(f.life.lengthCm/f.life.adultLengthCm,2),0),biomass=w.objects.reduce((n,p)=>n+(p.bio?.alive?p.biomass:0),0);
  p.maturity=clamp(p.maturity+(w.equipment.filter?8:.5)*days,0,100);
  p.waste=clamp(p.waste+(bioload*.5-(w.equipment.filter?p.maturity*.18*a.filterEfficiency:0))*days,0,100);
  p.nutrients=clamp(p.nutrients+(p.waste*.04-biomass*.02)*days,0,100);
  p.co2=clamp(p.co2+((co2?25+a.co2.rate:25)-p.co2)*(1-Math.exp(-8*days)),0,100);
  const oxygenTarget=(w.equipment.aerator?98:84)+(light?biomass*.03:0)-p.waste*.22-Math.max(0,p.co2-50)*.45-bioload*.1;
  p.oxygen=clamp(p.oxygen+(oxygenTarget-p.oxygen)*(1-Math.exp(-4*days)),0,100);
  const shrimp=animals.filter(f=>f.species==='shrimp').length;
  const algaeDelta=((light/100)*(p.nutrients/100)*9-.9-shrimp*.12)*days;
  p.algae=clamp(p.algae+algaeDelta*(algaeDelta>0?policy.algae:1),0,100);
  p.clarity=clamp(100-p.waste*.55-p.algae*.4,0,100);
  const target=w.equipment.heater?a.heaterTarget:24,rate=w.equipment.heater?a.heaterEfficiency*4:.4;
  p.temperature=clamp(p.temperature+(target-p.temperature)*(1-Math.exp(-rate*days)),10,40);
  // Rates are calibrated per complete lit day; darkness is normal, not a daily penalty.
  const normalizedLight=light*(a.light.automatic?1440/Math.max(60,a.light.durationMinutes):1);
  growPlants(w,days,normalizedLight,space,policy.decay);growAnimals(w,days,policy.decay);
  if(light)activity.lightSeconds+=seconds;if(co2)activity.co2Seconds+=seconds;if(w.equipment.filter)activity.filterSeconds+=seconds;
}
