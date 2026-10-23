import type { World } from '../game/types';
import { loadWorld,parseSave,SAVE_KEY,serializableWorld } from './save';
export interface CloudLink {userId:string;version:number}
export interface PendingWrite {id:string;userId:string;expectedVersion:number;world:World;sequence:number;userSequence:number;userDirty:boolean}
export interface LocalRecord {key:'active';sequence:number;world:World;dirty:boolean;userDirty:boolean;userSequence:number;link:CloudLink|null;pending:PendingWrite|null;syncEnabled:boolean}
export interface Backup {id:string;createdUtc:number;reason:string;world:World}
const request=<T>(r:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const valid=(r:LocalRecord|undefined)=>{if(!r)return null;try{return {...r,world:parseSave(JSON.stringify(r.world))};}catch{return null;}};
export class OfflineDatabase {
  private db!:IDBDatabase;private queue:Promise<unknown>=Promise.resolve();private sequence:number|undefined;
  constructor(readonly name='aquascape-offline-v1'){}
  async open(legacy?:Pick<Storage,'getItem'>){
    const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>{r.result.createObjectStore('state',{keyPath:'key'});r.result.createObjectStore('backups',{keyPath:'id'});};
    this.db=await request(r);this.db.onversionchange=()=>this.db.close();
    const tx=this.db.transaction('state','readonly'),primary=await request(tx.objectStore('state').get('active')) as LocalRecord|undefined;
    const good=valid(primary);if(good){this.sequence=good.sequence;return good;}
    const checkpoint=valid(await request(this.db.transaction('state','readonly').objectStore('state').get('checkpoint')) as LocalRecord|undefined);
    this.sequence=primary?.sequence??0;
    if(checkpoint)return this.mutate(()=>({...checkpoint,key:'active',sequence:this.sequence??0}));
    if(primary)throw Error('IndexedDB bị hỏng và không có checkpoint hợp lệ. Hãy phục hồi JSON; chưa ghi đè dữ liệu.');
    const old=legacy?loadWorld(legacy):null;
    return old?this.save(old,true):null;
  }
  async read(){await this.queue.catch(()=>{});return valid(await request(this.db.transaction('state','readonly').objectStore('state').get('active')) as LocalRecord|undefined);}
  mutate(fn:(record:LocalRecord|null)=>LocalRecord|null,backupReason?:string):Promise<LocalRecord|null>{
    const run=this.queue.catch(()=>{}).then(()=>new Promise<LocalRecord|null>((resolve,reject)=>{
      const tx=this.db.transaction(['state','backups'],'readwrite'),store=tx.objectStore('state');let output:LocalRecord|null=null;let failure:unknown;
      store.get('active').onsuccess=event=>{try{
        const raw=(event.target as IDBRequest<LocalRecord|undefined>).result;
        if((raw?.sequence??0)!==(this.sequence??0))throw Error('Save đã thay đổi ở phiên khác. Chưa ghi đè; hãy tải lại hồ.');
        const previous=valid(raw);output=fn(previous);
        if(output){output={...output,key:'active',sequence:(raw?.sequence??0)+1};
          if(previous)store.put({...previous,key:'checkpoint'});
          store.put(output);
          if(backupReason&&previous){const backups=tx.objectStore('backups');backups.put({id:crypto.randomUUID(),createdUtc:Date.now(),reason:backupReason,world:previous.world} satisfies Backup);backups.getAll().onsuccess=e=>{const all=(e.target as IDBRequest<Backup[]>).result.sort((a,b)=>b.createdUtc-a.createdUtc);for(const old of all.slice(10))backups.delete(old.id);};}
        }
      }catch(e){failure=e;tx.abort();}};
      tx.oncomplete=()=>{if(output)this.sequence=output.sequence;resolve(output);};tx.onabort=()=>reject(failure??tx.error??Error('Không thể ghi IndexedDB.'));tx.onerror=()=>{};
    }));this.queue=run;return run;
  }
  save(world:World,userEdit=false){return this.mutate(previous=>({key:'active',sequence:0,world:{...serializableWorld(world),clock:{...world.clock,revision:Math.max(previous?.world.clock.revision??0,world.clock.revision)+1,lastSavedUtc:Math.max(Date.now(),world.clock.lastSavedUtc)}},dirty:true,userDirty:!!previous?.userDirty||userEdit,userSequence:(previous?.userSequence??0)+(userEdit?1:0),link:previous?.link??null,pending:previous?.pending??null,syncEnabled:previous?.syncEnabled??true}));}
  async backups(){await this.queue.catch(()=>{});return (await request(this.db.transaction('backups','readonly').objectStore('backups').getAll()) as Backup[]).sort((a,b)=>b.createdUtc-a.createdUtc);}
  async deviceId(){const tx=this.db.transaction('state','readwrite'),store=tx.objectStore('state'),value=await request(store.get('device')) as {key:string;value:string}|undefined;const id=value?.value??crypto.randomUUID();if(!value)store.put({key:'device',value:id});return id;}
  async close(){await this.queue.catch(()=>{});this.db.close();}
}
export function mirrorLegacy(world:World){try{const raw=localStorage.getItem(SAVE_KEY);if(raw){try{parseSave(raw);localStorage.setItem(SAVE_KEY+'-checkpoint',raw);}catch{/* Keep the last valid mirror checkpoint. */}}localStorage.setItem(SAVE_KEY,JSON.stringify(world));}catch{/* IndexedDB is authoritative. The legacy mirror is optional. */}}
