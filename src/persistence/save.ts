import type { World } from '../game/types';
import { assets } from '../data/catalog';
import { COLS,ROWS } from '../game/terrain/heightfield';
import { withVisualPose } from '../game/fish/poses';
import { constrainObject } from '../game/interactions/placement';
import type { PlacedObject } from '../game/types';
import { PLANT_BALANCE,ANIMAL_BALANCE } from '../data/biology';
import { migrateSave } from './migration';
export const SAVE_KEY='aquascape-world-v1';
function finite(n:unknown,min:number,max:number):n is number{return typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;}
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
export function parseSave(text:string,now=Date.now()):World {
  if(text.length>2000000)throw Error('Tệp lưu quá lớn (tối đa 2 MB).');
  const raw:unknown=JSON.parse(text,(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))throw Error('Thuộc tính save không hợp lệ.');return value;});
  const w=record(raw)?migrateSave(raw,now):raw;
  if(!record(w)||w.version!==2)throw Error('Phiên bản save không được hỗ trợ.');
  if(typeof w.name!=='string'||w.name.length>80||!['aquarium','creative'].includes(String(w.mode))||!finite(w.seconds,0,1e10)||!finite(w.coins,0,1e9)||!finite(w.seed,0,4294967295))throw Error('Thông tin hồ không hợp lệ.');
  if(!record(w.tank)||w.tank.widthCm!==60||w.tank.depthCm!==30||w.tank.heightCm!==36)throw Error('Kích thước hồ không được hỗ trợ.');
  if(!Array.isArray(w.terrain)||w.terrain.length!==COLS*ROWS||!w.terrain.every(n=>finite(n,.1,1.2)))throw Error('Dữ liệu địa hình không hợp lệ.');
  if(w.substrate!=='soil'&&w.substrate!=='sand')throw Error('Loại nền không hợp lệ.');
  if(!Array.isArray(w.objects)||w.objects.length>240||!Array.isArray(w.animals)||w.animals.length>80)throw Error('Vượt giới hạn sinh vật/vật thể.');
  const ids=new Set<string>();
  for(const o of w.objects){
    if(!record(o)||typeof o.id!=='string'||ids.has(o.id)||typeof o.asset!=='string'||!assets[o.asset]||!['plants','rocks','wood'].includes(assets[o.asset].category))throw Error('Vật thể không hợp lệ.');
    ids.add(o.id);
    if(PLANT_BALANCE[o.asset]){
      if(!record(o.bio)||typeof o.bio.alive!=='boolean')throw Error('Sinh học cây không hợp lệ.');
      for(const [key,min,max] of [['stage',1,4],['height',0,3.3],['spread',0,1.5],['density',0,1],['lightCondition',0,100],['nutrientCondition',0,100],['co2Condition',0,100],['temperatureCondition',0,100],['lastTrimmedUtc',0,8640000000000000],['seed',0,4294967295],['branches',1,4],['runners',0,4]] as const)if(!finite(o.bio[key],min,max))throw Error('Trường sinh học cây không hợp lệ.');
    }
    for(const [k,lo,hi] of [['x',-3,3],['z',-1.5,1.5],['scale',.35,1.6],['rotation',-7,7],['elevation',0,3],['age',0,1e10],['growth',0,1],['health',0,100],['biomass',0,100],['trim',0,1e9]] as const)if(!finite(o[k],lo,hi))throw Error(`Vật thể: ${k} không hợp lệ.`);
    if(o.attachedTo!==undefined&&typeof o.attachedTo!=='string')throw Error('Điểm gắn không hợp lệ.');
    if(o.variant!==undefined&&(!finite(o.variant,0,assets[o.asset].variants-1)||!Number.isInteger(o.variant)))throw Error('Biến thể vật thể không hợp lệ.');
    const constrained=constrainObject(o as unknown as PlacedObject,w.terrain as number[]);
    for(const k of ['x','z','scale','elevation'] as const)if(Math.abs(constrained[k]-(o[k] as number))>1e-6)throw Error('Vật thể vượt giới hạn hồ.');
  }
  for(const f of w.animals){
    if(!record(f)||typeof f.id!=='string'||ids.has(f.id)||typeof f.species!=='string'||!Object.hasOwn(ANIMAL_BALANCE,f.species))throw Error('Sinh vật không hợp lệ.');ids.add(f.id);
    if(!record(f.life)||typeof f.life.alive!=='boolean'||!['schooling','resting','foraging','grazing','stressed'].includes(String(f.life.behaviour)))throw Error('Vòng đời sinh vật không hợp lệ.');
    const adult=ANIMAL_BALANCE[String(f.species)].adultCm;
    if(f.life.adultLengthCm!==adult)throw Error('Kích thước trưởng thành không hợp lệ.');
    for(const [key,min,max] of [['ageSeconds',0,1e12],['lengthCm',0,adult],['growth',0,1],['comfort',0,100]] as const)if(!finite(f.life[key],min,max))throw Error('Trường vòng đời không hợp lệ.');
    for(const [k,lo,hi] of [['x',-3,3],['z',-1.5,1.5],['y',0,3.6],['vx',-5,5],['vy',-5,5],['vz',-5,5],['hunger',0,100],['energy',0,100],['stress',0,100],['health',0,100],['phase',0,1e5]] as const)if(!finite(f[k],lo,hi))throw Error(`Sinh vật: ${k} không hợp lệ.`);
  }
  if(!record(w.water)||!record(w.equipment)||!['filter','co2','heater','aerator'].every(k=>typeof (w.equipment as Record<string,unknown>)[k]==='boolean'))throw Error('Thiết bị không hợp lệ.');
  for(const k of ['clarity','waste','maturity','nutrients','oxygen','co2','algae','light','warmth'])if(!finite(w.water[k],0,100))throw Error('Chỉ số nước không hợp lệ.');
  if(!finite(w.water.temperature,10,40)||!finite(w.water.photoperiod,0,24)||!Array.isArray(w.achievements)||!w.achievements.every(a=>typeof a==='string'&&a.length<60))throw Error('Môi trường không hợp lệ.');
  if(!record(w.automation))throw Error('Thiếu lịch thiết bị.');
  const a=w.automation;
  for(const key of ['light','co2']){const schedule=a[key];if(!record(schedule)||typeof schedule.automatic!=='boolean'||!finite(schedule.startMinute,0,1439)||!Number.isInteger(schedule.startMinute)||!finite(schedule.durationMinutes,0,1440)||!Number.isInteger(schedule.durationMinutes))throw Error('Lịch thiết bị không hợp lệ.');}
  if(!finite((a.co2 as Record<string,unknown>).rate,0,75))throw Error('Lượng CO₂ không hợp lệ.');
  for(const [key,min,max] of [['filterEfficiency',0,1],['heaterTarget',18,30],['heaterEfficiency',0,1]] as const)if(!finite(a[key],min,max))throw Error('Hiệu suất thiết bị không hợp lệ.');
  const feeder=a.feeder;
  if(typeof a.creativeProtection!=='boolean'||!record(feeder)||!Array.isArray(feeder.times)||feeder.times.length>4||!feeder.times.every(t=>finite(t,0,1439)&&Number.isInteger(t))||new Set(feeder.times).size!==feeder.times.length||!finite(feeder.capacity,0,5000)||!finite(feeder.stock,0,feeder.capacity)||!finite(feeder.amount,.1,10)||!finite(feeder.lastFeedUtc,0,8640000000000000))throw Error('Máy cho ăn không hợp lệ.');
  if(!record(w.clock)||typeof w.clock.wallClockReview!=='boolean'||!['balanced','relaxed','challenge'].includes(String(w.clock.careMode)))throw Error('Chế độ chăm sóc không hợp lệ.');
  for(const key of ['lastSimulatedUtc','lastSavedUtc','simulationUtc'])if(!finite(w.clock[key],0,8640000000000000))throw Error('Mốc UTC không hợp lệ.');
  if(!finite(w.clock.revision,0,1e12)||!Number.isInteger(w.clock.revision)||!finite(w.clock.remainderSeconds,0,60))throw Error('Revision hoặc thời gian dư không hợp lệ.');
  if(w.appearance!==undefined&&(!record(w.appearance)||!['daylight','warm','cool','evening','night'].includes(String(w.appearance.lighting))||typeof w.appearance.frontGlass!=='boolean'))throw Error('Thiết lập đồ họa không hợp lệ.');
  return JSON.parse(JSON.stringify(w)) as World;
}
export function loadWorld(storage:Pick<Storage,'getItem'>=globalThis.localStorage):World|null {try{const t=storage.getItem(SAVE_KEY);if(t){try{return parseSave(t);}catch{/* Recover only a validated checkpoint. */}}const cp=storage.getItem(SAVE_KEY+'-checkpoint');return cp?parseSave(cp):null;}catch{return null;}}
export const serializableWorld=(w:World)=>({...w,animals:w.animals.map(withVisualPose)});
export function saveWorld(w:World,storage:Pick<Storage,'setItem'>=localStorage){storage.setItem(SAVE_KEY,JSON.stringify(serializableWorld(w)));}
export function downloadSave(w:World,visualPose=true){const url=URL.createObjectURL(new Blob([JSON.stringify(visualPose?serializableWorld(w):w,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='aquascape-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
