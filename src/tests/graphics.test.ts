import { describe,it,expect } from 'vitest';
import { readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { catalog,assets } from '../data/catalog';
import { PLANT_FORMS,FISH_FORMS } from '../data/forms';
import { rockGeometry,woodGeometry,leafGeometry,substrateTextures } from '../game/assets/surfaces';
import { createFishGeometry } from '../game/assets/fishGeometry';
import { morphology } from '../game/plants/morphology';
import { plantBiology } from '../data/biology';
import { updateMorphology } from '../game/simulation/plantGrowth';
import { createWorld,object,animal } from '../data/initial';
import { constrainObject,footprint } from '../game/interactions/placement';
import { makeTerrain,heightAt } from '../game/terrain/heightfield';
import { parseSave } from '../persistence/save';
import { advanceSimulation,REAL_DAY } from '../game/simulation/realTime';
import { useGame } from '../state/store';
import { canStock } from '../game/fish/capacity';
import { moveAnimals,fishRadius } from '../game/fish/movement';
import { LIGHTING,appearanceOf,qualitySettings } from '../game/scene/settings';
const signature=(g:THREE.BufferGeometry)=>createHash('sha256').update(Buffer.from(g.attributes.position.array.buffer)).digest('hex');
function finiteGeometry(g:THREE.BufferGeometry){for(const name of ['position','normal'])expect(Array.from(g.attributes[name].array).every(Number.isFinite)).toBe(true);expect(g.attributes.position.count).toBeGreaterThan(10);}
describe('Phase 1 registry and geometry',()=>{
  it('contains all requested categories, local previews and explicit asset status',()=>{
    expect(catalog.filter(a=>a.category==='rocks')).toHaveLength(6);expect(catalog.filter(a=>a.category==='wood')).toHaveLength(5);expect(catalog.filter(a=>a.category==='plants')).toHaveLength(15);expect(catalog.filter(a=>a.category==='fish'&&a.id!=='shrimp')).toHaveLength(10);
    expect(new Set(catalog.map(a=>a.id)).size).toBe(catalog.length);
    for(const a of catalog){if(a.modelSpec){expect(a.status).toBe('authored-glb');expect(existsSync('public/'+a.model)).toBe(true);}else{expect(a.status).toBe('procedural-fallback');expect(a.model).toBeNull();}expect(a.preview.startsWith('previews/')).toBe(true);expect(existsSync('public/'+a.preview)).toBe(true);expect(a.placement.surface).toBeTruthy();expect(a.performance.triangles).toBeGreaterThan(0);}
  });
  it('has 18 distinct stone forms and 15 distinct wood forms within their placement envelopes',()=>{
    for(const category of ['rocks','wood']){const signatures=new Set<string>();for(const a of catalog.filter(a=>a.category===category))for(let v=0;v<3;v++){
      const radius=a.size*(category==='wood'?1.5:1),g=category==='wood'?woodGeometry(a.id,v,0,radius):rockGeometry(a.id,v,0,radius);finiteGeometry(g);g.computeBoundingBox();expect(g.boundingBox!.min.y).toBeCloseTo(0,5);expect(g.boundingBox!.max.y).toBeCloseTo(1,5);
      const p=g.attributes.position;for(let i=0;i<p.count;i++)expect(Math.hypot(p.getX(i),p.getZ(i))).toBeLessThanOrEqual(radius+.00001);signatures.add(signature(g));g.dispose();
    }expect(signatures.size).toBe(category==='wood'?15:18);}
  });
  it('has distinct botanical leaf geometry rather than one recolored leaf',()=>{const hashes=new Set<string>();for(const id of Object.keys(PLANT_FORMS)){const g=leafGeometry(id);finiteGeometry(g);hashes.add(signature(g));g.dispose();}expect(hashes.size).toBe(15);});
  it('has distinct animal body geometry and bounded fins/eyes/mouth parts',()=>{
    const hashes=new Set<string>();for(const id of Object.keys(FISH_FORMS)){const f=createFishGeometry(id,0);finiteGeometry(f.body);finiteGeometry(f.tail);hashes.add(signature(f.body));f.body.computeBoundingBox();f.tail.computeBoundingBox();const length=Math.max(f.body.boundingBox!.max.x,f.tail.boundingBox!.max.x+f.tailRoot)-Math.min(f.body.boundingBox!.min.x,f.tail.boundingBox!.min.x+f.tailRoot);expect(length).toBeCloseTo(1,5);expect(f.body.getAttribute('color')).toBeTruthy();f.body.dispose();f.tail.dispose();}expect(hashes.size).toBe(11);
  });
  it('produces colored, linear normal/roughness substrate maps with deterministic bytes',()=>{for(const type of ['sand','soil'] as const){const a=substrateTextures(type),b=substrateTextures(type);expect(a.map.colorSpace).toBe(THREE.SRGBColorSpace);expect(a.normalMap.colorSpace).toBe(THREE.NoColorSpace);expect(a.map.image.data).toEqual(b.map.image.data);expect(new Set(a.map.image.data).size).toBeGreaterThan(12);for(const t of [...Object.values(a),...Object.values(b)])t.dispose();}});
});
describe('Phase 1 biological and save compatibility',()=>{
  for(const id of Object.keys(PLANT_FORMS))it(`${id} grows new morphology and keeps geometry inside the tank`,()=>{
    const terrain=makeTerrain(true),p=object(id,0,0);p.growth=.1;p.bio=plantBiology(p);updateMorphology(p,{terrain});const young=morphology(p);p.growth=.9;updateMorphology(p,{terrain});const mature=morphology(p);expect(mature.count).toBeGreaterThan(young.count);expect(mature.height).toBeGreaterThan(young.height);expect(mature.stage).toBe(4);expect(mature.height+heightAt(terrain,0,0)).toBeLessThanOrEqual(3.3);
  });
  it('loads the previous public release save without losing its layout, ecology or IDs',()=>{const text=readFileSync('qa/qc/built-release/phone-export.json','utf8'),raw=JSON.parse(text),loaded=parseSave(text);expect(loaded).toEqual(raw);expect(loaded.objects).toHaveLength(74);expect(loaded.clock.careMode).toBe('balanced');});
  it('round-trips every new asset, saved variant and appearance through real store placement',()=>{
    const s=useGame.getState();s.newGame('fresh');s.changeMode(true);
    for(const a of catalog){if(['rocks','wood','plants'].includes(a.category)){for(let variant=0;variant<a.variants;variant++){s.set({placingVariant:variant,placingScale:1});s.purchase(a.id);s.place(0,0);}}else s.purchase(a.id);}
    s.edit(w=>{w.appearance={lighting:'warm',frontGlass:false};});const w=useGame.getState().world,loaded=parseSave(JSON.stringify(w));expect(loaded.objects).toHaveLength(54);expect(loaded.animals).toHaveLength(11);expect(loaded.objects).toEqual(w.objects);expect(loaded.appearance).toEqual(w.appearance);
    for(const a of catalog.filter(a=>a.variants===3))expect(new Set(loaded.objects.filter(o=>o.asset===a.id).map(o=>o.variant))).toEqual(new Set([0,1,2]));
  });
  it('simulates every new species over two offline days with finite biology and Balanced preserved',()=>{const w=createWorld('fresh');w.objects=Object.keys(PLANT_FORMS).map((id,i)=>constrainObject(object(id,Math.sin(i)*2,Math.cos(i)*.8),w.terrain));w.animals=Object.keys(FISH_FORMS).map((id,i)=>animal(id,i,w.terrain));const r=advanceSimulation(w,REAL_DAY*2,{offline:true});expect(r.state.clock.careMode).toBe('balanced');expect(r.state.animals.every(f=>Number.isFinite(f.life.lengthCm)&&f.life.ageSeconds===REAL_DAY*2)).toBe(true);expect(()=>parseSave(JSON.stringify(r.state))).not.toThrow();});
  it('rejects corrupt variants, unknown lighting and unknown animals without weakening validation',()=>{for(const mutate of [(w:ReturnType<typeof createWorld>)=>{w.objects[0].variant=7;},(w:ReturnType<typeof createWorld>)=>{w.appearance={lighting:'bad' as 'night',frontGlass:true};},(w:ReturnType<typeof createWorld>)=>{w.animals[0].species='__proto__';}]){const w=createWorld();mutate(w);expect(()=>parseSave(JSON.stringify(w))).toThrow();}});
  it('enforces volume in Living and a hard performance cap in Creative',()=>{const w=createWorld('fresh');w.animals=Array.from({length:20},(_,i)=>animal('betta',i,w.terrain));expect(canStock(w,'neon')).toBe(false);w.mode='creative';expect(canStock(w,'neon')).toBe(true);w.animals=Array.from({length:80},(_,i)=>animal('neon',i,w.terrain));expect(canStock(w,'shrimp')).toBe(false);});
  it('keeps whole animals clear of walls and isolated rocks across all swim zones',()=>{const t=makeTerrain(true),rock=constrainObject(object('seiryu',0,0),t),fish=Object.keys(FISH_FORMS).map((id,i)=>{const f=animal(id,i,t);f.x=.2;f.z=0;f.y=.3;return f;});for(let step=0;step<180;step++)moveAnimals(fish,t,[rock],1/30,step/30);for(const f of fish){const r=fishRadius(f);expect(Math.abs(f.x)+r).toBeLessThanOrEqual(2.96001);expect(Math.abs(f.z)+r).toBeLessThanOrEqual(1.46001);if(f.y<heightAt(t,rock.x,rock.z)+assets.seiryu.height+r)expect(Math.hypot(f.x-rock.x,f.z-rock.z)).toBeGreaterThanOrEqual(footprint(rock)+r-.00001);}});
  it('uses five lighting presets without changing biological light or the old save',()=>{const w=createWorld(),before=JSON.stringify(w);expect(Object.keys(LIGHTING)).toHaveLength(5);expect(LIGHTING.night.intensity).toBeLessThan(LIGHTING.daylight.intensity);expect(appearanceOf(w)).toEqual({lighting:'daylight',frontGlass:true});expect(JSON.stringify(w)).toBe(before);expect(qualitySettings('low').shadows).toBe(false);expect(qualitySettings('auto',true).level).toBe('low');});
  it('keeps adult bottom fish outside a cluster of overlapping stone envelopes',()=>{
    const t=makeTerrain(true),rocks=[object('seiryu',-.55,0),object('dragon',.55,0),object('lava',0,.5)];
    const fish=['cory','oto'].map((id,i)=>{const f=animal(id,i,t);f.life.lengthCm=f.life.adultLengthCm;f.x=0;f.z=0;f.y=.2;return f;});
    for(let step=0;step<90;step++)moveAnimals(fish,t,rocks,1/30,step/30);
    for(const f of fish)for(const rock of rocks)expect(Math.hypot(f.x-rock.x,f.z-rock.z)).toBeGreaterThanOrEqual(footprint(rock)+fishRadius(f)-.00001);
  });
});
