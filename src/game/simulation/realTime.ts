import type { LivingClock,World } from '../types';
import { spaceFactors } from './plantGrowth';
import { boundaries,applyFeeder } from './automation';
import { stepEcology } from './ecoStep';
import type { Activity,SimulationEvent } from '../types';
import { welfarePolicy } from './welfare';
import { progressReport } from './report';
import { restoreAnimalBounds } from './animalGrowth';

export const REAL_DAY=86400, BIO_STEP=60, MAX_ABSENCE=366*REAL_DAY;
export function createClock(now=Date.now()):LivingClock{return {lastSimulatedUtc:now,lastSavedUtc:now,simulationUtc:now,revision:0,remainderSeconds:0,careMode:'balanced',wallClockReview:false};}
export class MonotonicClock {
  private previous:number;
  constructor(now:number){this.previous=now;}
  elapsed(now:number){const dt=Math.max(0,(now-this.previous)/1000);this.previous=Math.max(this.previous,now);return dt;}
  reset(now:number){this.previous=now;}
}
export interface AdvanceOptions {offline?:boolean;wallElapsedSeconds?:number;flushRemainder?:boolean}
export function advanceSimulation(input:World,elapsedSeconds:number,options:AdvanceOptions={}){
  input=restoreAnimalBounds(input);
  if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0||elapsedSeconds>MAX_ABSENCE)throw Error('Khoảng mô phỏng không hợp lệ (tối đa 366 ngày/lần).');
  let state={...input,clock:{...input.clock}};
  const total=state.clock.remainderSeconds+elapsedSeconds,fullSteps=Math.floor((total+1e-8)/BIO_STEP),remainder=Math.max(0,total-fullSteps*BIO_STEP),steps=fullSteps+(options.flushRemainder&&remainder>1e-8?1:0);
  const activity:Activity={lightSeconds:0,co2Seconds:0,filterSeconds:0,feedings:0,foodConsumed:0,emptyFeedings:0},events:SimulationEvent[]=[];
  if(steps){
    state={...state,objects:state.objects.map(o=>({...o,bio:o.bio?{...o.bio}:undefined})),animals:state.animals.map(f=>({...f,life:{...f.life}})),water:{...state.water},automation:{...state.automation,feeder:{...state.automation.feeder}}};
    const space=spaceFactors(state),protect=welfarePolicy(input,!!options.offline),start=input.clock.simulationUtc-input.clock.remainderSeconds*1000;
    for(let i=0;i<steps;i++){
      const from=start+i*BIO_STEP*1000,to=i<fullSteps?from+BIO_STEP*1000:Math.min(from+BIO_STEP*1000,input.clock.simulationUtc+elapsedSeconds*1000),cuts=boundaries(state,from,to);
      for(let j=1;j<cuts.length;j++){stepEcology(state,(cuts[j]-cuts[j-1])/1000,(cuts[j]+cuts[j-1])/2,space,activity);applyFeeder(state,cuts[j],activity,events);protect(state);}
    }
  }
  const plants=state.objects.filter(p=>p.bio);
  if(steps&&plants.length>=5&&plants.every(p=>p.growth>.7&&p.health>65)&&!state.achievements.includes('healthy')){state.achievements=[...state.achievements,'healthy'];state.coins=Math.min(1e9,state.coins+200);}
  state.seconds=input.seconds+elapsedSeconds;
  state.clock={...state.clock,remainderSeconds:options.flushRemainder?0:remainder,simulationUtc:input.clock.simulationUtc+elapsedSeconds*1000,lastSimulatedUtc:input.clock.lastSimulatedUtc+(options.wallElapsedSeconds??elapsedSeconds)*1000};
  return {state,processedSeconds:elapsedSeconds,steps,activity,events,report:progressReport(input,state,elapsedSeconds,activity,steps),offline:!!options.offline};
}
export function catchUp(input:World,now:number){
  input=restoreAnimalBounds(input);
  const elapsed=(now-input.clock.lastSimulatedUtc)/1000;
  if(input.clock.wallClockReview)return {state:input,processedSeconds:0,steps:0,offline:true,warning:'Đồng hồ thiết bị thay đổi trong phiên trước. Chưa tự cộng khoảng nghi ngờ; hãy kiểm tra và xác nhận mốc UTC trong menu.'};
  if(elapsed<0)return {state:input,processedSeconds:0,steps:0,offline:true,warning:'Đồng hồ đã lùi. Giữ mốc UTC cũ để tránh cộng thời gian hai lần.'};
  if(elapsed>MAX_ABSENCE)return {state:input,processedSeconds:0,steps:0,offline:true,warning:`Chênh lệch đồng hồ trên 366 ngày (${Math.floor(elapsed/REAL_DAY)} ngày). Chưa tự tính; hãy kiểm tra đồng hồ hoặc xử lý từng khoảng trong menu.`};
  if(input.mode==='creative')return {state:{...input,clock:{...input.clock,lastSimulatedUtc:now}},processedSeconds:0,steps:0,offline:true};
  return advanceSimulation(input,elapsed,{offline:true});
}
