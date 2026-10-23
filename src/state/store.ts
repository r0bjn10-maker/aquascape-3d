import { create } from 'zustand';
import { createWorld,object,animal,uid } from '../data/initial';
import { assets } from '../data/catalog';
import type { CameraView,Quality,World,PlacedObject,CareMode,ProgressReport } from '../game/types';
import { brush } from '../game/terrain/heightfield';
import { constrainObject,applyTransform } from '../game/interactions/placement';
import { loadWorld,parseSave } from '../persistence/save';
import { persistCurrentWorld } from './persist';
import { commitSession,offlineDatabase } from '../persistence/journal';
import { advanceSimulation,catchUp,MAX_ABSENCE,REAL_DAY } from '../game/simulation/realTime';
import { updateMorphology } from '../game/simulation/plantGrowth';
import { canStock } from '../game/fish/capacity';
export type Tool='select'|'place'|'raise'|'lower'|'smooth';
export interface State {
  hasSavedWorld:boolean;editEpoch:number;syncApplying:boolean;session:'loading'|'active'|'readonly';offlineWarning:string;world:World;camera:CameraView;quality:Quality;adaptiveLow:boolean;glass:boolean;zen:boolean;started:boolean;selected:string|null;cameraRevision:number;placingVariant:number;placingScale:number;
  tool:Tool;placing:string|null;brushRadius:number;speed:number;notice:string;panel:'plants'|'layout'|'fish'|'equipment'|'care'|null;
  preview:{state:World;report:ProgressReport;kind:'future'|'before'}|null;returnReport:ProgressReport|null;comparisonBefore:World|null;reportOpen:boolean;
  previewDays:(days:number)=>void;changeCare:(mode:CareMode)=>void;changeMode:(creative:boolean)=>void;processAbsence:()=>void;
  undo:World[];redo:World[];dragging:boolean;saved:boolean;attachment:boolean;zenOrbit:boolean;
  set:(patch:Partial<State>)=>void;edit:(fn:(w:World)=>void)=>void;newGame:(kind:'sample'|'fresh'|'creative')=>void;
  purchase:(asset:string)=>void;place:(x:number,z:number,attachedTo?:string,elevation?:number)=>void;
  transform:(id:string,patch:Partial<PlacedObject>)=>void;remove:()=>void;duplicate:()=>void;trim:()=>void;
  terrainEdit:(x:number,z:number)=>void;history:(direction:'undo'|'redo')=>void;save:()=>void;import:(text:string)=>void;
}
const initial=loadWorld();
export const useGame=create<State>((set,get)=>({
  hasSavedWorld:!!initial,editEpoch:0,syncApplying:false,session:typeof document==='undefined'?'active':'loading',offlineWarning:'',world:initial??createWorld(),camera:'perspective',quality:globalThis.location?.search.includes('quality=low')?'low':'auto',adaptiveLow:false,glass:true,zen:false,started:false,selected:null,cameraRevision:0,placingVariant:0,placingScale:1,
  preview:null,returnReport:null,comparisonBefore:null,reportOpen:false,
  previewDays:days=>{const s=get(),r=advanceSimulation(s.world,days*REAL_DAY,{offline:true});set({preview:{state:r.state,report:r.report,kind:'future'},panel:null,selected:null,tool:'select',placing:null});},
  changeCare:mode=>{if(get().session==='readonly'||get().syncApplying)return;const r=advanceSimulation(get().world,0,{flushRemainder:true});get().edit(w=>{Object.assign(w,r.state);w.clock={...w.clock,careMode:mode};});},
  changeMode:creative=>{if(get().session==='readonly'||get().syncApplying)return;const r=advanceSimulation(get().world,0,{flushRemainder:true});get().edit(w=>{Object.assign(w,r.state);w.mode=creative?'creative':'aquarium';});set({speed:1});},
  processAbsence:async()=>{try{const s=get(),elapsed=Math.max(0,(Date.now()-s.world.clock.lastSimulatedUtc)/1000),r=advanceSimulation(s.world,Math.min(elapsed,MAX_ABSENCE),{offline:true});r.state.clock.wallClockReview=false;const world=await commitSession(r.state,true);set({world,comparisonBefore:s.world,returnReport:r.report,reportOpen:true,offlineWarning:elapsed>MAX_ABSENCE?'Còn thời gian chưa xử lý; có thể tiếp tục trong menu.':''});}catch(e){set({notice:String(e)});}},
  tool:'select',placing:null,brushRadius:.45,speed:1,notice:'',panel:null,undo:[],redo:[],dragging:false,saved:!!initial,attachment:false,zenOrbit:true,set,
  edit:fn=>{if(get().session==='readonly'||get().syncApplying||get().preview)return;const s=get(),world=structuredClone(s.world);fn(world);for(const o of world.objects)if(o.bio)updateMorphology(o,world);const rocks=world.objects.filter(o=>assets[o.asset]?.category==='rocks').length,plants=world.objects.filter(o=>assets[o.asset]?.category==='plants').length;for(const [id,done] of [['rocks',rocks>=3],['plants',plants>=5],['filter',world.equipment.filter],['fish',world.animals.length>=6]] as const)if(done&&!world.achievements.includes(id)){world.achievements.push(id);world.coins+=75;}set({world,editEpoch:s.editEpoch+1,undo:[...s.undo,s.world].slice(-40),redo:[],saved:false});},
  newGame:kind=>{if(get().session==='readonly'||get().syncApplying)return;set({editEpoch:get().editEpoch+1,world:createWorld(kind),started:true,selected:null,undo:[],redo:[],tool:'select',placing:null,panel:null,saved:false,speed:1,preview:null,returnReport:null,comparisonBefore:null,reportOpen:false,offlineWarning:'',notice:kind==='fresh'?'Living 1:1 · Balanced. Hãy trồng cây và chạy lọc trước.':'Living 1:1 · Balanced. Hồ sẽ tiếp tục phát triển khi bạn vắng mặt.'});},
  purchase:asset=>{if(get().session==='readonly'||get().syncApplying||get().preview)return;const s=get(),d=assets[asset];if(!d)return;if(s.world.mode!=='creative'&&s.world.coins<d.price){set({notice:'Chưa đủ xu. Các bước làm quen có thưởng xu.'});return;}if(d.category==='equipment'){const key=asset as keyof World['equipment'];if(s.world.equipment[key]){set({notice:'Thiết bị đã được lắp.'});return;}s.edit(w=>{w.equipment[key]=true;if(w.mode!=='creative')w.coins-=d.price;});set({notice:`Đã lắp ${d.name}.`});}else if(d.category==='fish'){if(!canStock(s.world,asset)){set({notice:'Đã đạt sức chứa hồ hoặc giới hạn 80 sinh vật. Creative vẫn giữ giới hạn hiệu năng.'});return;}s.edit(w=>{w.animals.push(animal(asset,w.animals.length,w.terrain));if(w.mode!=='creative')w.coins-=d.price;});set({notice:`Đã thả ${d.name}.`,placing:null,tool:'select'});}else set({attachment:!!d.attachment&&s.attachment,placing:asset,tool:'place',selected:null,notice:`Chạm nền để đặt ${d.name}. Esc để hủy.`});},
  place:(x,z,attachedTo,elevation=0)=>{if(get().session==='readonly'||get().syncApplying||get().preview)return;const s=get(),d=s.placing?assets[s.placing]:null;if(!d)return;if(s.world.objects.length>=240){set({notice:'Giới hạn 240 vật thể.'});return;}if(s.world.mode!=='creative'&&s.world.coins<d.price){set({notice:'Không đủ xu.'});return;}const o=constrainObject({...object(d.id,x,z,s.placingScale),variant:s.placingVariant%d.variants,elevation,attachedTo:attachedTo&&d.attachment?attachedTo:undefined},s.world.terrain);if(d.category==='plants')o.growth=.12;s.edit(w=>{w.objects.push(o);if(w.mode!=='creative')w.coins-=d.price;});set({selected:o.id,notice:`Đã đặt ${d.name}. Có thể đặt tiếp.`});},
  transform:(id,patch)=>get().edit(w=>applyTransform(w,id,patch)),
  remove:()=>{const s=get();if(!s.selected)return;s.edit(w=>{w.objects=w.objects.filter(o=>o.id!==s.selected);for(const o of w.objects)if(o.attachedTo===s.selected){delete o.attachedTo;o.elevation=0;}});set({selected:null,notice:'Đã xóa. Có thể hoàn tác.'});},
  duplicate:()=>{const s=get(),o=s.world.objects.find(o=>o.id===s.selected);if(!o||s.world.objects.length>=240)return;const d=assets[o.asset];if(s.world.mode!=='creative'&&s.world.coins<d.price){set({notice:'Không đủ xu.'});return;}const id=uid();s.edit(w=>{w.objects.push(constrainObject({...o,id,x:o.x+.35,z:o.z+.15},w.terrain));if(w.mode!=='creative')w.coins-=d.price;});set({selected:id});},
  trim:()=>{const s=get();s.edit(w=>{const o=w.objects.find(o=>o.id===s.selected);if(o&&assets[o.asset]?.category==='plants'){o.growth=Math.max(.05,o.growth*.45);o.biomass*=.5;o.trim++;if(o.bio){o.bio.lastTrimmedUtc=w.clock.simulationUtc;o.bio.branches=Math.min(4,o.bio.branches+1);}}});},
  terrainEdit:(x,z)=>{const s=get();if(!['raise','lower','smooth'].includes(s.tool))return;s.edit(w=>{w.terrain=brush(w.terrain,x,z,s.brushRadius,s.tool as 'raise'|'lower'|'smooth');w.objects=w.objects.map(o=>constrainObject(o,w.terrain));if(!w.achievements.includes('terrain')){w.achievements.push('terrain');w.coins+=75;}});},
  history:direction=>{if(get().session==='readonly'||get().syncApplying||get().preview)return;const s=get(),from=s[direction];if(!from.length)return;const other=direction==='undo'?'redo':'undo';set({editEpoch:s.editEpoch+1,world:{...from[from.length-1],clock:s.world.clock,seconds:s.world.seconds},[direction]:from.slice(0,-1),[other]:[...s[other],s.world].slice(-40),selected:null,saved:false});},
  save:async()=>{if(get().session!=='active'||get().syncApplying){set({notice:'Tab này chỉ xem hoặc đang nhận dữ liệu; chưa ghi hồ.'});return;}set({saved:false});try{await persistCurrentWorld(true);set({notice:'Đã lưu hồ offline trên thiết bị này.'});}catch{set({saved:false,notice:'Không thể lưu. Hãy xuất JSON để giữ hồ.'});}},
  import:async text=>{if(get().session==='readonly'||get().syncApplying)return;const browser=typeof document!=='undefined';try{
    const previous=parseSave(text),r=catchUp(previous,Date.now());if(browser){await persistCurrentWorld();set({syncApplying:true});await offlineDatabase?.mutate(record=>record,'Trước khi nhập JSON');}
    const world=browser?await commitSession(r.state,true):r.state;
    set({world,hasSavedWorld:browser||get().hasSavedWorld,editEpoch:get().editEpoch+1,saved:browser,undo:[...get().undo,get().world].slice(-40),redo:[],preview:null,started:true,selected:null,placing:null,tool:'select',comparisonBefore:previous,returnReport:'report' in r?r.report:null,reportOpen:'report' in r&&r.processedSeconds>=60,notice:'Đã nhập hồ. Bố cục cũ có thể hoàn tác.'});
  }catch(e){set({notice:e instanceof Error?e.message:'Tệp lưu không hợp lệ.'});}finally{if(browser)set({syncApplying:false});}},
}));

export const visibleWorld=(s:State)=>s.preview?.state??s.world;
