import { createClock } from '../game/simulation/realTime';
import { plantBiology,animalLife,PLANT_BALANCE } from '../data/biology';
import type { PlacedObject,Animal } from '../game/types';
import { defaultAutomation } from '../data/automation';
export function migrateSave(raw:Record<string,unknown>,now:number){
  if(raw.version!==1&&raw.version!==2)return raw;
  const result={...raw,version:2,clock:raw.version===1?createClock(now):raw.clock&&typeof raw.clock==='object'?{wallClockReview:false,...raw.clock}:raw.clock};
  return {...result,automation:raw.automation??defaultAutomation(),equipment:raw.equipment&&typeof raw.equipment==='object'?{feeder:false,...raw.equipment}:raw.equipment,objects:Array.isArray(raw.objects)?raw.objects.map((o:PlacedObject)=>o&&PLANT_BALANCE[o.asset]&&!o.bio?{...o,bio:plantBiology(o)}:o):raw.objects,animals:Array.isArray(raw.animals)?raw.animals.map((f:Animal)=>f&&!f.life?{...f,life:animalLife(f.species)}:f):raw.animals};
}
