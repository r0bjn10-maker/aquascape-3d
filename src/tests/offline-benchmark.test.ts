import { it,expect } from 'vitest';
import { writeFileSync,mkdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { createWorld } from '../data/initial';
import { advanceSimulation,REAL_DAY,createClock } from '../game/simulation/realTime';
it('benchmarks complete populated 1/7/30/90-day catch-up without rendering or dropping time',()=>{
  const w=createWorld();w.clock=createClock(Date.parse('2026-10-01T00:00:00Z'));
  const samples=[1,7,30,90].map(days=>{const start=performance.now(),r=advanceSimulation(w,days*REAL_DAY,{offline:true}),elapsedMs=performance.now()-start;expect(r.processedSeconds).toBe(days*REAL_DAY);expect(r.steps).toBe(days*1440);expect(r.state.animals.every(f=>f.life.alive)).toBe(true);return {days,elapsedMs,steps:r.steps,processedSeconds:r.processedSeconds,objects:r.state.objects.length,animals:r.state.animals.length,feedings:r.activity.feedings,retainedEvents:r.events.length};});
  mkdirSync('qa',{recursive:true});writeFileSync('qa/offline-benchmark-v21.json',JSON.stringify({node:process.version,cpu:cpus()[0]?.model,stepSeconds:60,samples,note:'CPU simulation only; no renderer and no claim about phone/desktop GPU FPS.'},null,2));
},30000);
