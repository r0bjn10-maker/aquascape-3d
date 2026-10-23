import type { AnimalLife,PlacedObject,PlantBiology } from '../game/types';
import { assets } from './catalog';
import { PLANT_FORMS,FISH_FORMS } from './forms';
export const PLANT_BALANCE:Record<string,{rate:number;spread:number;leaves:number;temp:[number,number]}>={
  monte:{rate:.24,spread:.6,leaves:56,temp:[20,28]},rotala:{rate:.29,spread:.4,leaves:64,temp:[20,29]},vallis:{rate:.23,spread:.48,leaves:32,temp:[18,29]},anubias:{rate:.065,spread:.4,leaves:22,temp:[20,29]},fern:{rate:.10,spread:.4,leaves:28,temp:[20,29]},moss:{rate:.18,spread:.5,leaves:66,temp:[18,28]},
};
for(const [id,form] of Object.entries(PLANT_FORMS))if(!PLANT_BALANCE[id])PLANT_BALANCE[id]={rate:form.rate,spread:form.spread,leaves:form.leaves,temp:[20,29]};
export const ANIMAL_BALANCE:Record<string,{adultCm:number;maturityDays:number;hungerPerDay:number}>=Object.fromEntries(Object.entries(FISH_FORMS).map(([id,f])=>[id,{adultCm:f.adultCm,maturityDays:f.maturityDays,hungerPerDay:f.hungerPerDay}]));
export function seedOf(id:string){let n=2166136261;for(const char of id)n=Math.imul(n^char.charCodeAt(0),16777619);return n>>>0;}
export function plantBiology(o:Pick<PlacedObject,'id'|'asset'|'growth'|'scale'|'trim'>):PlantBiology {
  const a=assets[o.asset],b=PLANT_BALANCE[o.asset];
  return {stage:Math.min(4,1+Math.floor(o.growth*4)),height:(a?.height??.3)*o.scale*(.3+.7*o.growth),spread:(b?.spread??.3)*o.scale*(.25+.75*o.growth),density:.25+.75*o.growth,lightCondition:80,nutrientCondition:80,co2Condition:80,temperatureCondition:100,lastTrimmedUtc:0,seed:seedOf(o.id),branches:Math.min(4,1+o.trim),runners:0,alive:true};
}
export function animalLife(species:string):AnimalLife {const a=ANIMAL_BALANCE[species]??ANIMAL_BALANCE.neon;return {ageSeconds:0,lengthCm:a.adultCm*.36,adultLengthCm:a.adultCm,growth:.15,comfort:90,behaviour:FISH_FORMS[species]?.zone==='bottom'?'grazing':'schooling',alive:true};}
