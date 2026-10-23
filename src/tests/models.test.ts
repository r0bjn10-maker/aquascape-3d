import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {assets} from '../data/catalog';
import {M1_IDS,modelPath} from '../data/modelAssets';
import {createWorld,object,animal} from '../data/initial';
import {parseSave} from '../persistence/save';
import {morphology} from '../game/plants/morphology';
import {updateMorphology} from '../game/simulation/plantGrowth';
import {moveAnimals,fishRadius} from '../game/fish/movement';
import {footprint} from '../game/interactions/placement';
import {heightAt} from '../game/terrain/heightfield';
interface ModelEntry {id:string;variant:number;lod:string;file:string;sha256:string;triangles:number}
const manifest=JSON.parse(readFileSync('public/models/m1/manifest.json','utf8')) as {assets:ModelEntry[];textures:{file:string;sha256:string}[];source:string;license:string};
function glb(file:string){const b=readFileSync('public/'+file);expect(b.readUInt32LE(0)).toBe(0x46546c67);expect(b.readUInt32LE(4)).toBe(2);expect(b.readUInt32LE(8)).toBe(b.length);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());}
function shapeSignature(file:string){
 const b=readFileSync('public/'+file),length=b.readUInt32LE(12),d=glb(file),a=d.accessors[d.meshes[0].primitives[0].attributes.POSITION],v=d.bufferViews[a.bufferView],data=Buffer.alloc(a.count*12),start=28+length+(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??12;
 for(let i=0;i<a.count;i++)b.copy(data,i*12,start+i*stride,start+i*stride+12);return createHash('sha256').update(data).digest('hex');
}
describe('M1 authored GLB distribution and old-world compatibility',()=>{
 it('upgrades exactly the nine requested families with real local GLBs and provenance',()=>{
  expect(M1_IDS).toHaveLength(9);expect(manifest.assets).toHaveLength(42);expect(manifest.license).toBe('CC0-1.0');expect(existsSync(manifest.source)).toBe(true);
  for(const id of M1_IDS){expect(assets[id].status).toBe('authored-glb');expect(assets[id].modelSpec).toBeTruthy();expect(existsSync('public/'+modelPath(assets[id],0,0))).toBe(true);}
 });
 it('matches every GLB and texture byte to the published manifest',()=>{for(const item of [...manifest.assets,...manifest.textures])expect(createHash('sha256').update(readFileSync('public/'+item.file)).digest('hex')).toBe(item.sha256);});
 it('provides PBR base, roughness and normal maps and resolves every texture locally',()=>{
  for(const a of manifest.assets){const d=glb(a.file),m=d.materials[0];expect(m.normalTexture).toBeTruthy();expect(m.pbrMetallicRoughness.baseColorTexture).toBeTruthy();expect(m.pbrMetallicRoughness.metallicRoughnessTexture).toBeTruthy();expect(m.pbrMetallicRoughness.metallicFactor).toBe(0);for(const im of d.images)expect(existsSync(join('public',dirname(a.file),im.uri))).toBe(true);}
 });
 it('has bounded mobile budgets and a real lower-detail mesh for every variant',()=>{
  for(const a of manifest.assets.filter((a)=>a.lod==='low')){const high=manifest.assets.find((h)=>h.id===a.id&&h.variant===a.variant&&h.lod==='high');expect(a.triangles).toBeLessThan(high!.triangles*.6);expect(a.sha256).not.toBe(high!.sha256);expect(a.triangles).toBeLessThanOrEqual(a.id==='spider'?2600:assets[a.id].category==='plants'?64:1700);}
 });
 it('keeps hardscape within the exact placement cylinder and ground-centered in every LOD',()=>{
  for(const a of manifest.assets.filter((a)=>assets[a.id].modelSpec?.kind==='hardscape')){const d=glb(a.file),acc=d.accessors[d.meshes[0].primitives[0].attributes.POSITION],asset=assets[a.id],radius=asset.size*(asset.category==='wood'?1.5:1);expect(acc.min[1]).toBeCloseTo(0,5);expect(acc.max[1]).toBeCloseTo(asset.height,4);expect(Math.max(Math.abs(acc.min[0]),Math.abs(acc.max[0]),Math.abs(acc.min[2]),Math.abs(acc.max[2]))).toBeLessThanOrEqual(radius+.00001);}
 });
 it('includes three genuinely different hardscape and leaf shapes for both LODs',()=>{for(const id of M1_IDS.filter(id=>assets[id].variants===3))for(const lod of ['low','high'])expect(new Set(manifest.assets.filter((a)=>a.id===id&&a.lod===lod).map((a)=>shapeSignature(a.file))).size).toBe(3);});
 for(const id of ['neon','betta','shrimp'])it(`${id} has anatomical geometry plus animated morph targets in both LODs`,()=>{
  for(const a of manifest.assets.filter((a)=>a.id===id)){const d=glb(a.file),p=d.meshes[0].primitives[0];expect(p.targets).toHaveLength(2);expect(p.targets.every((t:Record<string,number>)=>t.POSITION!==undefined)).toBe(true);expect(d.animations[0].name).toBe('Swim');expect(d.animations[0].channels[0].target.path).toBe('weights');expect(d.accessors[p.attributes.POSITION].count).toBeGreaterThan(300);expect(d.accessors[p.attributes.POSITION].max[0]-d.accessors[p.attributes.POSITION].min[0]).toBeCloseTo(1,3);}
 });
 it('grows new leaves, branches and runners instead of scaling a static adult cluster',()=>{const w=createWorld('fresh');for(const id of ['monte','rotala','anubias']){const p=object(id,0,0);p.growth=.08;updateMorphology(p,w);const young=morphology(p);p.growth=.92;updateMorphology(p,w);const adult=morphology(p);expect(adult.count).toBeGreaterThan(young.count);expect(adult.spread).toBeGreaterThan(young.spread);if(id==='monte')expect(adult.runners).toBeGreaterThan(young.runners);if(id==='rotala')expect(adult.branches).toBeGreaterThan(young.branches);}});
 it('preserves all stable IDs, Balanced and old save bytes when parsing',()=>{const text=readFileSync('qa/qc/built-release/phone-export.json','utf8');expect(parseSave(text)).toEqual(JSON.parse(text));expect(parseSave(text).clock.careMode).toBe('balanced');});
 it('keeps juveniles and adult animated-model envelopes outside glass and hardscape',()=>{
  for(const adult of [false,true]){const w=createWorld('fresh'),obstacle=object('spider',0,0,.75);w.objects=[obstacle];w.animals=['neon','betta','shrimp'].map((id,i)=>{const f=animal(id,i,w.terrain);if(adult)f.life.lengthCm=f.life.adultLengthCm;f.x=.1;f.y=.3;f.z=.1;return f;});
   for(let i=0;i<300;i++)moveAnimals(w.animals,w.terrain,w.objects,1/30,i/30);
   for(const f of w.animals){const r=fishRadius(f);expect(Math.abs(f.x)+r).toBeLessThanOrEqual(2.96001);expect(Math.abs(f.z)+r).toBeLessThanOrEqual(1.46001);if(f.y<heightAt(w.terrain,0,0)+assets.spider.height*.75+r)expect(Math.hypot(f.x,f.z)).toBeGreaterThanOrEqual(footprint(obstacle)+r-.00001);}
  }
 });
});
