import type { World,PlacedObject,Animal } from '../game/types';
import { makeTerrain,heightAt } from '../game/terrain/heightfield';
import { constrainObject } from '../game/interactions/placement';
import { createClock } from '../game/simulation/realTime';
import { plantBiology,animalLife,PLANT_BALANCE } from './biology';
import { defaultAutomation } from './automation';
import { FISH_FORMS } from './forms';
import { updateMorphology } from '../game/simulation/plantGrowth';
let sequence=0;
export const uid=()=>`aq-${Date.now().toString(36)}-${(++sequence).toString(36)}`;
export function object(asset:string,x:number,z:number,scale=1,rotation=0):PlacedObject {
  const o:PlacedObject={id:uid(),asset,x,z,elevation:0,rotation:rotation%(Math.PI*2),scale,age:0,growth:.6,health:95,biomass:1,trim:0};if(PLANT_BALANCE[asset])o.bio=plantBiology(o);return o;
}
export function animal(species:string,i:number,terrain:number[]):Animal {
  const x=Math.sin(i*2.1)*1.8,z=Math.cos(i*1.7)*.8;
  return {id:uid(),life:animalLife(species),species,x,y:species==='shrimp'?heightAt(terrain,x,z)+.05:FISH_FORMS[species]?.zone==='bottom'?heightAt(terrain,x,z)+.1:1.2+(i%5)*.3,z,vx:.2,vy:0,vz:.1,hunger:15,energy:90,stress:5,health:95,phase:i*2.41};
}
export function createWorld(kind:'sample'|'fresh'|'creative'='sample'):World {
  const terrain=makeTerrain(kind==='fresh');
  const objects:PlacedObject[]=[];
  if(kind!=='fresh'){
    objects.push(object('seiryu',-1.25,-.25,1.3,-.3),object('seiryu',-1.85,.1,.8,.7),object('dragon',1.5,-.5,.8,.4),object('river',-.6,.55,.5),object('river',.8,.8,.4),object('branch',.8,-.5,1.05,-.3));
    for(let i=0;i<13;i++)objects.push(object('vallis',-2.55+i*.43,-1.12+Math.sin(i)*.12,.85+(i%3)*.18,i*.7));
    for(let i=0;i<12;i++)objects.push(object('rotala',.8+(i%4)*.37,-.85+Math.floor(i/4)*.25,.65+(i%3)*.12,i));
    for(let i=0;i<9;i++)objects.push(object('fern',-2.25+(i%3)*.4,-.6+Math.floor(i/3)*.38,.65+(i%3)*.15,i));
    for(let i=0;i<11;i++)objects.push(object('anubias',-1.7+(i%5)*.85,-.1+Math.floor(i/5)*.4,.8,i));
    for(let i=0;i<24;i++){
      const x=-2.55+(i%8)*.72,z=.65+Math.floor(i/8)*.23;
      if(Math.abs(x-.15)> .55)objects.push(object('monte',x,z,.9+(i%3)*.25,i));
    }
    for(let i=0;i<5;i++)objects.push(object('moss',1.2+i*.2,-.25,.8,i));
  }
  return {version:2,clock:createClock(),automation:defaultAutomation(),name:'Thung lũng xanh',mode:kind==='creative'?'creative':'aquarium',seconds:0,coins:1500,seed:401,tank:{widthCm:60,depthCm:30,heightCm:36},terrain,substrate:'sand',objects:objects.map(o=>{const p=constrainObject(o,terrain);if(p.bio)updateMorphology(p,{terrain});return p;}),animals:kind==='fresh'?[]:Array.from({length:18},(_,i)=>animal(i<11?'neon':i<15?'ember':'shrimp',i,terrain)),water:{clarity:96,waste:10,maturity:kind==='fresh'?5:85,nutrients:55,oxygen:90,co2:45,algae:8,temperature:24,light:65,photoperiod:8,warmth:55},equipment:{feeder:kind!=='fresh',filter:kind!=='fresh',heater:false,co2:false,aerator:kind!=='fresh'},achievements:[]};
}
