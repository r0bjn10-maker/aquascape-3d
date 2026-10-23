export type Category = 'rocks' | 'wood' | 'plants' | 'fish' | 'equipment';
export type Mode = 'aquarium' | 'creative';
export type Quality = 'auto' | 'low' | 'medium' | 'high';
export type CameraView = 'perspective' | 'front' | 'top' | 'orbit';
export type LightingPreset='daylight'|'warm'|'cool'|'evening'|'night';
export interface Appearance {lighting:LightingPreset;frontGlass:boolean}
export interface PlantForm {habit:'carpet'|'grass'|'rosette'|'rhizome'|'stem'|'moss';leaf:'round'|'oval'|'strap'|'needle'|'lance'|'fern'|'crypt'|'java-moss'|'christmas-moss';width:number;bend:number;tip:string;leaves:number;rate:number;spread:number;group:'foreground'|'midground'|'background'|'moss'}
export interface FishForm {body:[number,number];snout:number;tail:'fork'|'round'|'fan'|'veil'|'paddle';color:string;accent:string;mark:'neon'|'cardinal'|'ember'|'rummy'|'harlequin'|'chili'|'guppy'|'betta'|'cory'|'oto'|'shrimp';dorsal:number;ventral:number;speed:number;zone:'middle'|'upper'|'bottom';school:boolean;adultCm:number;maturityDays:number;hungerPerDay:number}
export interface AssetDef {
  id: string; name: string; latin?: string; category: Category; price: number; color: string;
  description: string; size: number; height: number; attachment?: boolean;
  light?: number; co2?: number; growthRate?: number; zone?: string;
  model: string | null; license: string; bounds: [number, number, number];
  preview:string;status:'final'|'procedural-fallback'|'placeholder';variants:number;
  placement:{surface:'substrate'|'hardscape-or-substrate'|'water'|'equipment';zone:string};
  material:{kind:string;roughness:number;metalness:number};
  performance:{triangles:number;drawCalls:number;instanced:boolean};
  plant?:PlantForm;fish?:FishForm;
}
export interface PlacedObject {
  id: string; asset: string; x: number; z: number; elevation: number; rotation: number; scale: number;
  age: number; growth: number; health: number; biomass: number; trim: number; attachedTo?: string; bio?:PlantBiology;variant?:number;
}
export interface Animal {
  id: string; species: string; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  hunger: number; energy: number; stress: number; health: number; phase: number; life:AnimalLife;
}
export interface PlantBiology {stage:number;height:number;spread:number;density:number;lightCondition:number;nutrientCondition:number;co2Condition:number;temperatureCondition:number;lastTrimmedUtc:number;seed:number;branches:number;runners:number;alive:boolean}
export interface AnimalLife {ageSeconds:number;lengthCm:number;adultLengthCm:number;growth:number;comfort:number;behaviour:'schooling'|'resting'|'foraging'|'grazing'|'stressed';alive:boolean}
export interface Water {
  clarity: number; waste: number; maturity: number; nutrients: number; oxygen: number;
  co2: number; algae: number; temperature: number; light: number; photoperiod: number; warmth: number;
}
export interface World {
  version: 2; name: string; mode: Mode; seconds: number; coins: number; seed: number; clock: LivingClock;
  tank: {widthCm: number; depthCm: number; heightCm: number};
  terrain: number[]; substrate: 'sand' | 'soil'; objects: PlacedObject[]; animals: Animal[];
  water: Water; equipment: {filter: boolean; heater: boolean; co2: boolean; aerator: boolean;feeder:boolean};automation:Automation;
  achievements: string[];
  appearance?:Appearance;
}
export type CareMode='balanced'|'relaxed'|'challenge';
export interface LivingClock {
  lastSimulatedUtc:number; lastSavedUtc:number; simulationUtc:number; revision:number;
  remainderSeconds:number; careMode:CareMode;
  wallClockReview:boolean;
}
export interface DailySchedule {automatic:boolean;startMinute:number;durationMinutes:number}
export interface Automation {
  light:DailySchedule;co2:DailySchedule&{rate:number};filterEfficiency:number;
  heaterTarget:number;heaterEfficiency:number;creativeProtection:boolean;
  feeder:{times:number[];amount:number;stock:number;capacity:number;lastFeedUtc:number};
}
export interface Activity {lightSeconds:number;co2Seconds:number;filterSeconds:number;feedings:number;foodConsumed:number;emptyFeedings:number}
export interface SimulationEvent {type:'feed'|'empty-feeder';utc:number;amount:number}
export interface BioSnapshot {plantBiomass:number;carpetCoverage:number;meanPlantHeight:number;plantHealth:number;animalLength:number;animalAgeDays:number;animalHealth:number;livingAnimals:number;algae:number;clarity:number;waste:number}
export interface ProgressReport {elapsedSeconds:number;before:BioSnapshot;after:BioSnapshot;activity:Activity;steps:number;recommendations:string[]}
