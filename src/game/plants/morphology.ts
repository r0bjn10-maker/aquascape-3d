import type { PlacedObject } from '../types';
import { PLANT_BALANCE } from '../../data/biology';
export function morphology(p:PlacedObject){
  const b=PLANT_BALANCE[p.asset],stage=p.bio?.stage??Math.min(4,1+Math.floor(p.growth*4));
  const density=p.bio?.density??.6;
  return {stage,count:Math.min(80,Math.max(4,Math.floor((b?.leaves??22)*(.25+stage*.18)*(.65+.35*density)))),height:p.bio?.height??.3,spread:p.bio?.spread??.2,density,branches:p.bio?.branches??1,runners:p.bio?.runners??0};
}
