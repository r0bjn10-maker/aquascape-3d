import { useGame } from './store';
import { commitSession,ownsSession } from '../persistence/journal';
let queue:Promise<unknown>=Promise.resolve(),persistedEpoch=0;
export const hasUnpersistedEdits=()=>useGame.getState().editEpoch!==persistedEpoch;
export function resetPersistenceEpoch(){persistedEpoch=useGame.getState().editEpoch;}
export function persistCurrentWorld(force=false):Promise<void>{
  const run=queue.catch(()=>{}).then(async()=>{
    const s=useGame.getState();if(!ownsSession()||s.syncApplying||(!s.started&&!s.hasSavedWorld))return;
    if(!force&&s.saved&&s.editEpoch===persistedEpoch)return;
    const before=s.world,epoch=s.editEpoch,world=await commitSession(before,epoch!==persistedEpoch);persistedEpoch=epoch;
    const now=useGame.getState();if(now.world===before)now.set({world,saved:true,hasSavedWorld:true});
    else now.set({world:{...now.world,clock:{...now.world.clock,revision:world.clock.revision}},saved:false});
  });queue=run;return run;
}
