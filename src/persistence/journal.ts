import type { World } from '../game/types';
import { loadWorld,parseSave,SAVE_KEY,serializableWorld } from './save';
export class SaveJournal {
  revision:number;
  constructor(private storage:Pick<Storage,'getItem'|'setItem'>){this.revision=loadWorld(storage)?.clock.revision??0;}
  commit(world:World,now=Date.now()):World {
    let previous:World|null=null;
    const raw=this.storage.getItem(SAVE_KEY);
    if(raw){try{previous=parseSave(raw,now);}catch{previous=loadWorld(this.storage);}}
    if((previous?.clock.revision??0)!==this.revision)throw Error('Save đã thay đổi ở phiên khác. Chưa ghi đè; hãy tải lại hồ.');
    const updated={...serializableWorld(world),clock:{...world.clock,revision:this.revision+1,lastSavedUtc:Math.max(now,world.clock.lastSavedUtc)}};
    // setItem is atomic. A failed checkpoint/primary write leaves the old primary recoverable.
    if(previous)this.storage.setItem(SAVE_KEY+'-checkpoint',JSON.stringify(previous));
    this.storage.setItem(SAVE_KEY,JSON.stringify(updated));this.revision=updated.clock.revision;return updated;
  }
}
let journal:SaveJournal|null=null,release:(()=>void)|undefined,opening:Promise<boolean>|undefined,owned=false;
export function openSession():Promise<boolean>{
  if(opening)return opening;
  opening=new Promise(resolve=>{
    if(!navigator.locks){resolve(false);return;}
    void navigator.locks.request('aquascape-exclusive-writer',{ifAvailable:true},async lock=>{
      if(!lock){resolve(false);return;}
      journal=new SaveJournal(localStorage);owned=true;resolve(true);
      await new Promise<void>(done=>{release=done;});owned=false;
    }).catch(()=>{owned=false;resolve(false);});
  });return opening;
}
export function closeSession(){owned=false;release?.();opening=undefined;journal=null;}
export function ownsSession(){return owned;}
export function commitSession(world:World){if(!owned||!journal)throw Error('Tab này không giữ quyền ghi hồ. Đóng tab kia và tải lại.');return journal.commit(world);}
