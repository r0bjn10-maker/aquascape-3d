import type { World } from '../types';
import { FISH_FORMS } from '../../data/forms';
export function stockCapacity(world:World){
  const volume=world.tank.widthCm*world.tank.depthCm*world.tank.heightCm/1000;
  const used=world.animals.filter(f=>f.life.alive).reduce((sum,f)=>sum+f.life.adultLengthCm*(f.species==='shrimp'?.25:1),0);
  return {volume,used,budget:volume*1.2,limit:80};
}
export function canStock(world:World,species:string){const c=stockCapacity(world),form=FISH_FORMS[species];return !!form&&world.animals.length<c.limit&&(world.mode==='creative'||c.used+form.adultCm*(species==='shrimp'?.25:1)<=c.budget);}
