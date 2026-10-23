import { useEffect } from 'react';
import { useGame } from '../../state/store';
import { openSession,closeSession,commitSession,offlineDatabase } from '../../persistence/journal';
import { mirrorLegacy } from '../../persistence/database';
import { persistCurrentWorld,resetPersistenceEpoch } from '../../state/persist';
import { initializeCloud,syncNow,useCloud } from '../../cloud/controller';
import { advanceSimulation,catchUp,MonotonicClock } from './realTime';
export function Runtime(){
  useEffect(()=>{
    let disposed=false,hasData=false,ready=false,lastWall=Date.now();
    const clock=new MonotonicClock(performance.now());
    const reset=()=>{clock.reset(performance.now());lastWall=Date.now();};
    const resumeBiology=async()=>{
      if(!hasData)return;const s=useGame.getState(),previous=s.world,result=catchUp(previous,Date.now());
      const world=await commitSession(result.state);if(disposed)return;
      s.set({world,saved:true,...('report' in result&&result.processedSeconds>=60?{comparisonBefore:previous,returnReport:result.report,reportOpen:true}:{}),offlineWarning:'warning' in result?String(result.warning??''):''});
    };
    const boot=async()=>{
      const owned=await openSession();if(disposed)return;
      if(!owned){await initializeCloud();if(disposed)return;useGame.getState().set({session:'readonly',notice:'Không giữ được quyền ghi hoặc không mở được IndexedDB. Tab này chỉ xem; vẫn có thể xuất JSON.'});return;}
      try{
        const previous=await offlineDatabase!.read();hasData=!!previous;
        if(previous){mirrorLegacy(previous.world);useGame.getState().set({world:previous.world,saved:true,hasSavedWorld:true});}resetPersistenceEpoch();
        await initializeCloud();if(disposed)return;await syncNow();if(disposed)return;
        hasData=hasData||useGame.getState().hasSavedWorld;await resumeBiology();if(disposed)return;
        useGame.getState().set({session:'active'});ready=true;reset();
      }catch(e){useGame.getState().set({session:'readonly',notice:`Chưa áp dụng tiến triển: ${e instanceof Error?e.message:'lỗi lưu'}. Hồ cũ vẫn được giữ.`});}
    };
    void boot();
    const tick=(force=false)=>{
      const elapsed=clock.elapsed(performance.now()),s=useGame.getState(),wall=Date.now(),drift=Math.abs(wall-lastWall-elapsed*1000);lastWall=wall;
      if(!ready||document.hidden&&!force||s.syncApplying||s.session!=='active')return;
      hasData=hasData||s.started;if(!hasData)return;
      const speed=s.world.mode==='aquarium'?1:s.zen?0:s.speed;
      const result=advanceSimulation(s.world,elapsed*speed,{wallElapsedSeconds:elapsed});if(drift>300000){result.state.clock.wallClockReview=true;s.set({offlineWarning:'Đồng hồ thiết bị vừa thay đổi. Phiên này vẫn dùng thời gian monotonic; kiểm tra mốc giờ trong menu.'});}s.set({world:result.state,saved:false});
    };
    const persist=async()=>{if(!ready||!hasData)return;try{await persistCurrentWorld();}catch(e){useGame.getState().set({notice:e instanceof Error?e.message:'Không thể lưu; hãy xuất JSON.'});}};
    const visibility=()=>{
      if(document.hidden){tick(true);void persist().then(syncNow);}
      else if(ready){ready=false;void (async()=>{try{await syncNow();hasData=hasData||useGame.getState().hasSavedWorld;await resumeBiology();}catch(e){useGame.getState().set({notice:String(e)});}finally{if(!disposed){ready=true;reset();}}})();}
      reset();
    };
    const leave=()=>{tick(true);const saved=persist();ready=false;void saved.finally(closeSession);};
    const restore=(event:PageTransitionEvent)=>{if(event.persisted)void boot();};
    let debounce:ReturnType<typeof setTimeout>|undefined,cloudDebounce:ReturnType<typeof setTimeout>|undefined;
    const unsubscribe=useGame.subscribe((s,old)=>{
      hasData=hasData||s.started;if(s.syncApplying!==old.syncApplying||s.world.seconds===0&&s.world.clock.lastSimulatedUtc!==old.world.clock.lastSimulatedUtc)reset();
      if(s.session==='active'&&hasData&&(s.editEpoch!==old.editEpoch||s.world.objects!==old.world.objects||s.world.water!==old.world.water||s.world.automation!==old.world.automation||s.started!==old.started)){
        clearTimeout(debounce);debounce=setTimeout(()=>void persist(),700);
        if(s.editEpoch!==old.editEpoch){if(useCloud.getState().status==='synced')useCloud.setState({status:'syncing',message:'Thay đổi cục bộ đang chờ đồng bộ.'});clearTimeout(cloudDebounce);cloudDebounce=setTimeout(()=>void syncNow(),1800);}
      }
    });
    const online=()=>void syncNow(),offline=()=>{if(useCloud.getState().user)useCloud.setState({status:'offline',message:'Đang chơi offline. Bản lưu được giữ trên thiết bị.'});};
    const timer=setInterval(tick,1000),saveTimer=setInterval(()=>void persist(),10000),cloudTimer=setInterval(()=>{if(!document.hidden)void syncNow();},30000);
    window.addEventListener('online',online);window.addEventListener('offline',offline);window.addEventListener('focus',online);window.addEventListener('pagehide',leave);window.addEventListener('pageshow',restore);document.addEventListener('visibilitychange',visibility);
    return ()=>{disposed=true;unsubscribe();clearTimeout(debounce);clearTimeout(cloudDebounce);clearInterval(timer);clearInterval(saveTimer);clearInterval(cloudTimer);window.removeEventListener('online',online);window.removeEventListener('offline',offline);window.removeEventListener('focus',online);window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',restore);document.removeEventListener('visibilitychange',visibility);};
  },[]);return null;
}
