import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseSave } from '../persistence/save';
import type { World } from '../game/types';
import type { CloudConfig } from './config';
import type { CloudTransport,PullResult,PushResult } from './sync';
const pick=<T extends object,K extends keyof T>(value:T,keys:readonly K[])=>Object.fromEntries(keys.map(key=>[key,value[key]])) as Pick<T,K>;
// A schema whitelist: no imported GLB/texture blobs or unknown JSON fields leave the browser.
export function cloudWorld(w:World):World {
  const out=pick(w,['version','name','mode','seconds','coins','seed','tank','terrain','substrate','objects','animals','water','equipment','automation','achievements','clock','appearance']);
  out.tank=pick(w.tank,['widthCm','depthCm','heightCm']);out.clock=pick(w.clock,['lastSimulatedUtc','lastSavedUtc','simulationUtc','revision','remainderSeconds','careMode','wallClockReview']);
  out.objects=w.objects.map(o=>({...pick(o,['id','asset','x','z','elevation','rotation','scale','age','growth','health','biomass','trim','attachedTo','variant']),...(o.bio?{bio:pick(o.bio,['stage','height','spread','density','lightCondition','nutrientCondition','co2Condition','temperatureCondition','lastTrimmedUtc','seed','branches','runners','alive'])}:{})}));
  out.animals=w.animals.map(f=>({...pick(f,['id','species','x','y','z','vx','vy','vz','hunger','energy','stress','health','phase']),life:pick(f.life,['ageSeconds','lengthCm','adultLengthCm','growth','comfort','behaviour','alive'])}));
  out.water=pick(w.water,['clarity','waste','maturity','nutrients','oxygen','co2','algae','temperature','light','photoperiod','warmth']);out.equipment=pick(w.equipment,['filter','heater','co2','aerator','feeder']);
  out.automation={...pick(w.automation,['filterEfficiency','heaterTarget','heaterEfficiency','creativeProtection']),light:pick(w.automation.light,['automatic','startMinute','durationMinutes']),co2:pick(w.automation.co2,['automatic','startMinute','durationMinutes','rate']),feeder:pick(w.automation.feeder,['times','amount','stock','capacity','lastFeedUtc'])};
  if(w.appearance)out.appearance=pick(w.appearance,['lighting','frontGlass']);return parseSave(JSON.stringify(out));
}
export function makeClient(config:CloudConfig){return createClient(config.url,config.key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'aquascape-auth-v1-'+new URL(config.url).hostname},global:{fetch:(input,init)=>fetch(input,{...init,signal:init?.signal??AbortSignal.timeout(15000)})}});}
export function transport(client:SupabaseClient):CloudTransport{return {
  pull:async()=>{const {data,error}=await client.rpc('aquascape_pull');if(error)throw Error(error.message);const r=data as PullResult;if(r.save)r.save.world=parseSave(JSON.stringify(r.save.world));return r;},
  push:async(p,deviceId)=>{const {data,error}=await client.rpc('aquascape_commit',{p_expected_version:p.expectedVersion,p_request_id:p.id,p_device_id:deviceId,p_world:cloudWorld(p.world)});if(error)throw Error(error.message);return data as PushResult;},
};}
