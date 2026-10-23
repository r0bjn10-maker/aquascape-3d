import { useEffect } from 'react';
import { useGame } from '../../state/store';
import { loadWorld } from '../../persistence/save';
import { openSession,closeSession,commitSession } from '../../persistence/journal';
import { advanceSimulation,catchUp,MonotonicClock } from './realTime';
export function Runtime(){
  useEffect(()=>{
    let disposed=false,hasData=false,ready=false,lastWall=Date.now();
    const clock=new MonotonicClock(performance.now());
    const boot=async()=>{
      const owned=await openSession();if(disposed)return;
      if(!owned){useGame.getState().set({session:'readonly',notice:'Hồ đang được mở ở tab khác hoặc trình duyệt không hỗ trợ khóa ghi. Tab này chỉ xem; vẫn có thể xuất JSON.'});return;}
      const previous=loadWorld();hasData=!!previous;
      try{
        const result=previous?catchUp(previous,Date.now()):null;
        if(result){const world=commitSession(result.state);useGame.getState().set({world,saved:true,comparisonBefore:previous,returnReport:'report' in result?result.report:null,reportOpen:'report' in result&&result.processedSeconds>=60,offlineWarning:'warning' in result?String(result.warning??''):''});}
        useGame.getState().set({session:'active'});ready=true;clock.reset(performance.now());
      }catch(e){useGame.getState().set({session:'readonly',notice:`Chưa áp dụng tiến triển: ${e instanceof Error?e.message:'lỗi lưu'}. Hồ cũ vẫn được giữ.`});}
    };
    void boot();
    const tick=()=>{
      const elapsed=clock.elapsed(performance.now()),s=useGame.getState(),wall=Date.now(),drift=Math.abs(wall-lastWall-elapsed*1000);lastWall=wall;
      if(!ready||document.hidden||s.session!=='active')return;
      hasData=hasData||s.started;if(!hasData)return;
      const speed=s.world.mode==='aquarium'?1:s.zen?0:s.speed;
      const result=advanceSimulation(s.world,elapsed*speed,{wallElapsedSeconds:elapsed});if(drift>300000){result.state.clock.wallClockReview=true;s.set({offlineWarning:'Đồng hồ thiết bị vừa thay đổi. Phiên này vẫn dùng thời gian monotonic; kiểm tra mốc giờ trong menu.'});}s.set({world:result.state,saved:false});
    };
    const persist=()=>{if(!ready||!hasData)return;try{const s=useGame.getState();s.set({world:commitSession(s.world),saved:true});}catch(e){useGame.getState().set({notice:e instanceof Error?e.message:'Không thể lưu; hãy xuất JSON.'});}};
    const visibility=()=>{
      if(document.hidden){tick();persist();}
      else if(ready&&hasData){try{const s=useGame.getState(),result=catchUp(s.world,Date.now());s.set({world:commitSession(result.state),...('report' in result&&result.processedSeconds>=60?{comparisonBefore:s.world,returnReport:result.report,reportOpen:true}:{}),offlineWarning:'warning' in result?String(result.warning??''):''});}catch(e){useGame.getState().set({notice:String(e)});}}
      clock.reset(performance.now());lastWall=Date.now();
    };
    const leave=()=>{tick();persist();closeSession();ready=false;};
    const restore=(event:PageTransitionEvent)=>{if(event.persisted)void boot();};
    let debounce:ReturnType<typeof setTimeout>|undefined;
    const unsubscribe=useGame.subscribe((s,old)=>{hasData=hasData||s.started;if(s.world.seconds===0&&s.world.clock.lastSimulatedUtc!==old.world.clock.lastSimulatedUtc){clock.reset(performance.now());lastWall=Date.now();}if(s.session==='active'&&hasData&&(s.world.objects!==old.world.objects||s.world.water!==old.world.water||s.world.automation!==old.world.automation||s.world.mode!==old.world.mode||s.world.clock.careMode!==old.world.clock.careMode||s.started!==old.started)){clearTimeout(debounce);debounce=setTimeout(persist,700);}});
    const timer=setInterval(tick,1000),saveTimer=setInterval(persist,10000);
    window.addEventListener('pagehide',leave);window.addEventListener('pageshow',restore);document.addEventListener('visibilitychange',visibility);
    return ()=>{disposed=true;unsubscribe();clearTimeout(debounce);clearInterval(timer);clearInterval(saveTimer);window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',restore);document.removeEventListener('visibilitychange',visibility);};
  },[]);return null;
}
