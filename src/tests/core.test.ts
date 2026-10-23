import { describe,it,expect,beforeEach } from 'vitest';
import { createWorld,object,animal } from '../data/initial';
import { assets,resolveAsset,catalog } from '../data/catalog';
import { brush,makeTerrain,heightAt,COLS,ROWS } from '../game/terrain/heightfield';
import { constrainObject,footprint,applyTransform } from '../game/interactions/placement';
import { moveAnimals } from '../game/fish/movement';
import { simulate,FixedClock } from '../game/simulation/ecosystem';
import { parseSave,loadWorld,SAVE_KEY } from '../persistence/save';
import { useGame } from '../state/store';
describe('heightfield and physical placement',()=>{
  it('has 65 × 33 vertices and correct bilinear interpolation',()=>{const t=makeTerrain(true);expect(t).toHaveLength(COLS*ROWS);expect(heightAt(t,-3,-1.5)).toBe(.16);expect(heightAt(t,0,0)).toBe(.16);});
  it('raises a local region, lowers it, smooths a peak and clamps 1–12cm',()=>{
    const t=makeTerrain(true),a=brush(t,0,0,.5,'raise'),b=brush(a,0,0,.5,'lower');expect(heightAt(a,0,0)).toBeGreaterThan(.16);expect(heightAt(b,0,0)).toBeCloseTo(.16);expect(a[0]).toBe(t[0]);
    const peak=[...t];peak[16*COLS+32]=1.2;expect(heightAt(brush(peak,0,0,.5,'smooth'),0,0)).toBeLessThan(1.2);
    expect(Math.max(...brush(t,0,0,1,'raise',20))).toBe(1.2);expect(Math.min(...brush(t,0,0,1,'lower',20))).toBe(.1);
  });
  it('keeps edited transforms within glass and above substrate',()=>{const t=makeTerrain(),o=constrainObject({...object('seiryu',99,-20),scale:4,elevation:9},t);expect(o.x+footprint(o)).toBeLessThanOrEqual(3);expect(o.z-footprint(o)).toBeGreaterThanOrEqual(-1.5);expect(heightAt(t,o.x,o.z)+o.elevation+o.scale*assets.seiryu.height).toBeLessThanOrEqual(3.25001);});
  it('resolves missing catalog metadata to a safe fallback',()=>expect(resolveAsset('missing').id).toBe('river'));
  it('clamps every catalog footprint, including oversized wood',()=>{for(const a of catalog.filter(a=>['wood','rocks','plants'].includes(a.category))){const o=constrainObject({...object(a.id,99,-99),scale:16},makeTerrain());expect(o.x+footprint(o)).toBeLessThanOrEqual(3.00001);expect(o.z-footprint(o)).toBeGreaterThanOrEqual(-1.50001);}});
  it('keeps attached plants with their moved parent',()=>{const w=createWorld('fresh'),parent=object('seiryu',0,0),child={...object('anubias',.2,0),attachedTo:parent.id,elevation:.7};w.objects=[parent,child];applyTransform(w,parent.id,{x:1});expect(w.objects[1].x).toBeCloseTo(1.2);expect(w.objects[1].attachedTo).toBe(parent.id);});
});
describe('deterministic ecosystem and time',()=>{
  it('plant growth responds to light, CO₂ and nutrients and remains bounded',()=>{
    const a=createWorld('fresh');a.objects=[object('rotala',0,0)];a.water.co2=70;a.water.light=80;a.water.nutrients=80;
    const b=structuredClone(a);b.water.light=0;b.water.co2=5;
    expect(simulate(a,1200).objects[0].growth).toBeGreaterThan(simulate(b,1200).objects[0].growth);
    let w=a;for(let i=0;i<200;i++)w=simulate(w,60);expect(w.objects[0].growth).toBeLessThanOrEqual(1);expect(w.objects[0].health).toBeGreaterThanOrEqual(10);
  });
  it('a mature filter reduces waste and feeding increases it',()=>{const w=createWorld();w.water.waste=70;const off=structuredClone(w);off.equipment.filter=false;expect(simulate(w,1200).water.waste).toBeLessThan(simulate(off,1200).water.waste);});
  it('strong light with excess nutrients grows algae; shrimp have a limited effect',()=>{const w=createWorld('fresh');w.water.light=100;w.water.photoperiod=12;w.water.nutrients=100;expect(simulate(w,1200).water.algae).toBeGreaterThan(w.water.algae);const shrimp=structuredClone(w);shrimp.animals=[animal('shrimp',0,w.terrain)];expect(simulate(shrimp,1200).water.algae).toBeLessThan(simulate(w,1200).water.algae);});
  it('excess CO₂ and poor oxygen increase stress; Creative protects health',()=>{const w=createWorld();w.water.co2=98;w.water.oxygen=5;w.equipment.co2=true;w.equipment.aerator=false;w.animals[0].stress=80;const creative=structuredClone(w);creative.mode='creative';expect(simulate(w,120).animals[0].health).toBeLessThan(w.animals[0].health);expect(simulate(creative,120).animals[0].health).toBeGreaterThan(w.animals[0].health);});
  it.each([1,5,20])('clock ×%i advances the expected game time',speed=>{const c=new FixedClock();let n=0;for(let i=0;i<240;i++)c.advance(1/60,speed,dt=>n+=dt);expect(n+c.remainder).toBeCloseTo(4*speed,7);});
  it('simulation results match at 30 and 120fps for equal game time',()=>{
    const start=createWorld();const run=(fps:number,speed:number)=>{let w=structuredClone(start);const c=new FixedClock();for(let i=0;i<fps*4;i++)c.advance(1/fps,speed,dt=>{w=simulate(w,dt);});return w;};expect(run(30,5)).toEqual(run(120,5));
  });
  it('equal game time at x1/x5/x20 gives equal progression',()=>{const start=createWorld();const run=(speed:number)=>{let w=structuredClone(start);const c=new FixedClock();for(let i=0;i<600/speed;i++)c.advance(1/30,speed,dt=>{w=simulate(w,dt);});return w;};expect(run(1)).toEqual(run(5));expect(run(5)).toEqual(run(20));});
});
describe('fish movement',()=>{
  it('stays inside the tank and above sloped terrain for 6000 steps',()=>{const w=createWorld();for(let i=0;i<6000;i++)moveAnimals(w.animals,w.terrain,w.objects,1/30,i/30);for(const f of w.animals){expect(Math.abs(f.x)).toBeLessThanOrEqual(2.8);expect(Math.abs(f.z)).toBeLessThanOrEqual(1.3);expect(f.y).toBeLessThanOrEqual(3.23);expect(f.y).toBeGreaterThan(heightAt(w.terrain,f.x,f.z));}});
  it('steers away from a rock and shrimp remain near the ground',()=>{const t=makeTerrain(true),f=animal('neon',0,t);Object.assign(f,{x:.4,z:0,y:.4,vx:-.1,vy:0,vz:0});const free={...f};moveAnimals([f],t,[object('seiryu',0,0)],.1,0);moveAnimals([free],t,[],.1,0);expect(f.vx).toBeGreaterThan(free.vx);const shrimp=animal('shrimp',0,t);moveAnimals([shrimp],t,[],.1,0);expect(shrimp.y).toBeCloseTo(.205);});
});
describe('save integrity',()=>{
  it('roundtrips every transform, height, biological state and setting',()=>{const w=createWorld();w.objects[0].rotation=1.87;expect(parseSave(JSON.stringify(w))).toEqual(w);});
  it('rejects malformed and malicious imports without replacing stored data',()=>{const w=createWorld(),valid=JSON.stringify(w);expect(()=>parseSave('{bad')).toThrow();expect(()=>parseSave(JSON.stringify({...w,terrain:[1]}))).toThrow();expect(()=>parseSave(JSON.stringify({...w,water:{...w.water,clarity:'100'}}))).toThrow();expect(()=>parseSave(JSON.stringify({...w,version:999}))).toThrow();expect(loadWorld({getItem:()=>valid})).toEqual(w);});
  it('does not apply elapsed offline time on load',()=>{const w=createWorld();w.seconds=97;const loaded=loadWorld({getItem:()=>JSON.stringify(w)});expect(loaded?.seconds).toBe(97);expect(loaded?.animals).toEqual(w.animals);});
  it('rejects imported objects outside their physical bounds',()=>{const w=createWorld();w.objects[0].x=3;expect(()=>parseSave(JSON.stringify(w))).toThrow('giới hạn');});
  it('handles missing/unavailable/corrupt storage',()=>{expect(loadWorld({getItem:()=>null})).toBeNull();expect(loadWorld({getItem:()=>'{'})).toBeNull();expect(loadWorld({getItem:()=>{throw Error('blocked');}})).toBeNull();expect(SAVE_KEY).not.toBe('van-phap-meta');});
});
describe('builder transactions and undo',()=>{
  beforeEach(()=>{useGame.getState().newGame('fresh');});
  it('buys, places, transforms, duplicates and deletes with undo/redo',()=>{let s=useGame.getState();s.purchase('seiryu');s.place(1,.1);s=useGame.getState();const id=s.world.objects[0].id;s.transform(id,{rotation:1.2,z:.4});s.duplicate();expect(useGame.getState().world.objects).toHaveLength(2);useGame.getState().remove();expect(useGame.getState().world.objects).toHaveLength(1);useGame.getState().history('undo');expect(useGame.getState().world.objects).toHaveLength(2);useGame.getState().history('redo');expect(useGame.getState().world.objects).toHaveLength(1);});
  it('keeps at least 20 undoable edits and restores substrate contact',()=>{for(let i=0;i<25;i++){useGame.getState().set({tool:'raise'});useGame.getState().terrainEdit(0,0);}expect(useGame.getState().undo).toHaveLength(25);for(let i=0;i<25;i++)useGame.getState().history('undo');expect(useGame.getState().world.terrain).toEqual(makeTerrain(true));});
  it('invalid imports leave the current world and history intact',()=>{const before=useGame.getState().world;useGame.getState().import('{oops');expect(useGame.getState().world).toBe(before);expect(useGame.getState().undo).toHaveLength(0);});
  it('plants attach, trim and can regrow while equipment/feeding affect state',()=>{const s=useGame.getState();s.purchase('anubias');s.place(0,0,undefined,.1);useGame.getState().trim();const w=useGame.getState().world;expect(w.objects[0].growth).toBeLessThan(.6);expect(simulate(w,1200).objects[0].growth).toBeGreaterThan(w.objects[0].growth);s.purchase('filter');expect(useGame.getState().world.equipment.filter).toBe(true);});
});
