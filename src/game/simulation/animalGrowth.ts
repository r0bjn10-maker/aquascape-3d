import type { World } from '../types';
import { FISH_FORMS } from '../../data/forms';
import { ANIMAL_BALANCE } from '../../data/biology';
import { clamp,heightAt } from '../terrain/heightfield';
export function restoreAnimalBounds(w:World):World{
  let changed=false;const animals=w.animals.map(f=>{const x=clamp(f.x,-2.74,2.74),z=clamp(f.z,-1.24,1.24),y=clamp(f.y,heightAt(w.terrain,x,z)+(f.species==='shrimp'?.045:FISH_FORMS[f.species]?.zone==='bottom'?.10:.17),3.23);if(x===f.x&&y===f.y&&z===f.z)return f;changed=true;return {...f,x,y,z};});return changed?{...w,animals}:w;
}
export function growAnimals(w:World,days:number,decay=1){
  const p=w.water,quality=(p.clarity+p.oxygen+100-p.waste)/300;
  for(const f of w.animals){
    if(!f.life.alive)continue;const a=ANIMAL_BALANCE[f.species];f.life.ageSeconds+=days*86400;
    f.hunger=clamp(f.hunger+a.hungerPerDay*days,0,100);
    f.life.comfort=clamp(quality*100-(p.co2>80?25:0)-(p.temperature<20||p.temperature>29?30:0),0,100);
    f.energy=clamp(f.energy+((100-f.hunger)*.7+f.life.comfort*.3-f.energy)*days,0,100);
    f.stress=clamp(f.stress+(f.life.comfort<45||p.oxygen<35||p.co2>85?15:-18)*days,0,100);
    f.health=clamp(f.health+(f.stress>65||f.hunger>85?-7*decay:quality>.6?5:-3*decay)*days,0,100);
    const fitness=Math.max(.04,(1-f.hunger/110)*quality*f.health/100);
    f.life.growth=clamp(f.life.growth+(1-f.life.growth)*3/a.maturityDays*fitness*days,0,1);
    f.life.adultLengthCm=a.adultCm;f.life.lengthCm=clamp(Math.max(f.life.lengthCm,a.adultCm*(.25+.75*f.life.growth)),a.adultCm*.2,a.adultCm);
    f.life.alive=f.health>0;
    f.life.behaviour=f.stress>60?'stressed':f.energy<30?'resting':f.hunger>55?'foraging':FISH_FORMS[f.species]?.zone==='bottom'?'grazing':FISH_FORMS[f.species]?.school?'schooling':'foraging';
    f.x=clamp(f.x,-2.74,2.74);f.z=clamp(f.z,-1.24,1.24);f.y=clamp(f.y,heightAt(w.terrain,f.x,f.z)+(f.species==='shrimp'?.045:FISH_FORMS[f.species]?.zone==='bottom'?.10:.17),3.23);
  }
}
