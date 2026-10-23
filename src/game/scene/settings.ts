import type { LightingPreset,Quality,World } from '../types';
export const LIGHTING:Record<LightingPreset,{name:string;background:string;sky:string;ground:string;key:string;rim:string;ambient:number;intensity:number;exposure:number}>={
  daylight:{name:'Natural Daylight',background:'#192b2c',sky:'#e6f3f2',ground:'#637565',key:'#f1f5e4',rim:'#b1d9e2',ambient:1.15,intensity:3.2,exposure:1.12},
  warm:{name:'Warm Aquarium',background:'#292820',sky:'#e9ddbd',ground:'#776747',key:'#ffe0a3',rim:'#d2e3c5',ambient:1.1,intensity:3.05,exposure:1.08},
  cool:{name:'Cool Aquarium',background:'#1a2935',sky:'#d1e8f2',ground:'#536a68',key:'#d4edff',rim:'#86c8e2',ambient:1.1,intensity:3.3,exposure:1.05},
  evening:{name:'Evening',background:'#202328',sky:'#c3c0b4',ground:'#55574a',key:'#edb16c',rim:'#839fc3',ambient:.82,intensity:1.65,exposure:1.03},
  night:{name:'Night',background:'#101b28',sky:'#7b9db9',ground:'#263d48',key:'#82b5d8',rim:'#6685b9',ambient:.55,intensity:.75,exposure:.92},
};
export const DEFAULT_APPEARANCE={lighting:'daylight' as const,frontGlass:true};
export const appearanceOf=(world:Pick<World,'appearance'>)=>world.appearance??DEFAULT_APPEARANCE;
export function qualitySettings(quality:Quality,adaptiveLow=false){
  const weak=typeof navigator!=='undefined'&&((navigator.hardwareConcurrency??8)<5||((navigator as Navigator&{deviceMemory?:number}).deviceMemory??8)<4);
  const level=quality==='auto'?(weak||adaptiveLow?'low':'medium'):quality;
  return {level,shadows:level!=='low',shadowSize:level==='high'?2048:1024,dpr:level==='low'?.85:level==='high'?1.75:1.2,detail:level==='high'?2:level==='medium'?1:0,caustics:level!=='low',leafLimit:level==='low'?48:80};
}
