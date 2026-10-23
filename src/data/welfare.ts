import type { CareMode } from '../game/types';
export const CARE_BALANCE:Record<CareMode,{decay:number;algae:number;plantFloor:number;animalFloor:number;plantDecline:number;animalDecline:number}>={
  balanced:{decay:1,algae:1,plantFloor:20,animalFloor:30,plantDecline:35,animalDecline:30},
  relaxed:{decay:.35,algae:.45,plantFloor:50,animalFloor:60,plantDecline:10,animalDecline:12},
  challenge:{decay:1.7,algae:1.2,plantFloor:0,animalFloor:0,plantDecline:100,animalDecline:100},
};
