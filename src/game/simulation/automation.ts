import type { World,DailySchedule,Activity,SimulationEvent } from '../types';
import { clamp } from '../terrain/heightfield';
export const DAY_MS=86400000;
export function scheduleOn(schedule:DailySchedule,utc:number){
  const minute=((utc/60000)%1440+1440)%1440;
  return ((minute-schedule.startMinute+1440)%1440)<schedule.durationMinutes;
}
export function effectiveLight(w:World,utc=w.clock.simulationUtc){return !w.automation.light.automatic||scheduleOn(w.automation.light,utc)?w.water.light:0;}
export function effectiveCO2(w:World,utc:number){return w.equipment.co2&&(!w.automation.co2.automatic||scheduleOn(w.automation.co2,utc));}
export function feed(w:World,amount:number){
  const animals=w.animals.filter(f=>f.life.alive);if(!animals.length)return;
  const portion=amount*300/animals.length;
  for(const f of animals){f.hunger=clamp(f.hunger-portion,0,100);f.energy=clamp(f.energy+portion*.3,0,100);}
  w.water.waste=clamp(w.water.waste+amount*3,0,100);w.water.nutrients=clamp(w.water.nutrients+amount*1.5,0,100);
}
export function boundaries(w:World,from:number,to:number){
  const a=w.automation,minutes=new Set<number>([...(w.equipment.feeder?a.feeder.times:[])]);
  for(const s of [a.light,a.co2])if(s.automatic){minutes.add(s.startMinute);minutes.add((s.startMinute+s.durationMinutes)%1440);}
  const cuts=[from,to];for(let day=Math.floor(from/DAY_MS);day<=Math.floor(to/DAY_MS);day++)for(const minute of minutes){const utc=day*DAY_MS+minute*60000;if(utc>from&&utc<to)cuts.push(utc);}
  return [...new Set(cuts)].sort((a,b)=>a-b);
}
export function applyFeeder(w:World,utc:number,activity:Activity,events:SimulationEvent[]){
  const f=w.automation.feeder,minute=((utc/60000)%1440+1440)%1440;
  if(!w.equipment.feeder||utc<=f.lastFeedUtc||!f.times.some(t=>Math.abs(t-minute)<1e-6))return;
  f.lastFeedUtc=utc;const amount=Math.min(f.stock,f.amount);f.stock=Math.max(0,f.stock-amount);
  if(amount>0){feed(w,amount);activity.feedings++;activity.foodConsumed+=amount;}else activity.emptyFeedings++;
  events.push({type:amount?'feed':'empty-feeder',utc,amount});if(events.length>40)events.shift();
}
