import type { World,ProgressReport } from '../game/types';
import { catchUp } from '../game/simulation/realTime';
import { parseSave } from '../persistence/save';
import type { OfflineDatabase,LocalRecord,PendingWrite } from '../persistence/database';
export type SyncStatus='local'|'synced'|'syncing'|'offline'|'conflict'|'failed';
export interface RemoteSave {version:number;world:World}
export interface PullResult {save:RemoteSave|null;serverUtc:number}
export interface PushResult {status:'applied'|'already_applied'|'conflict';version:number;serverUtc:number}
export interface CloudTransport {pull:()=>Promise<PullResult>;push:(pending:PendingWrite,deviceId:string)=>Promise<PushResult>}
export interface SyncPorts {flush:()=>Promise<void>;replace:(world:World,before:World|null,report?:ProgressReport)=>void;suspend:()=>()=>void;current:()=>boolean;status:(status:SyncStatus,message?:string)=>void}
export class SyncEngine {
  private running:Promise<void>|null=null;
  constructor(readonly db:OfflineDatabase,readonly remote:CloudTransport,readonly userId:string,readonly deviceId:string,readonly ports:SyncPorts){}
  private exclusive(action:()=>Promise<void>){const previous=this.running??Promise.resolve();const next=previous.catch(()=>{}).then(action);const current=next.finally(()=>{if(this.running===current)this.running=null;});this.running=current;return current;}
  sync(){return this.running??this.exclusive(()=>this.run());}
  private active(){if(!this.ports.current())throw Error('Phiên đăng nhập đã thay đổi; giữ bản offline và chờ đăng nhập lại.');}
  private conflict(message='Hồ đã được sửa trên thiết bị khác. Bản cục bộ được giữ; hãy chọn hồ cloud hoặc tiếp tục cục bộ.'){this.ports.status('conflict',message);}
  private async acknowledge(p:PendingWrite,result:PushResult){
    this.active();if(result.status==='conflict'){
      const local=await this.db.read();
      if(!p.userDirty&&!local?.userDirty){await this.db.mutate(r=>r?.pending?.id===p.id?{...r,pending:null}:r);return 'rebase' as const;}
      this.conflict();return false;
    }
    if(result.version!==p.expectedVersion+1)throw Error('Cloud trả về phiên bản ghi không hợp lệ.');
    await this.db.mutate(r=>{if(!r?.pending||r.pending.id!==p.id||r.pending.userId!==this.userId)throw Error('Bản chờ đồng bộ đã thay đổi.');return {...r,link:{userId:this.userId,version:result.version},pending:null,dirty:r.world.clock.revision!==p.world.clock.revision,userDirty:r.userSequence!==p.userSequence};});return true;
  }
  private async install(remote:RemoteSave,serverUtc:number,record:LocalRecord|null){
    this.active();const resume=this.ports.suspend();
    try{
      const previous=record?.world??null,base=parseSave(JSON.stringify(remote.world)),result=catchUp(base,serverUtc);
      const applied=await this.db.mutate(r=>{if((r?.sequence??0)!==(record?.sequence??0))throw Error('Hồ vừa thay đổi trong lúc tải cloud. Hãy thử đồng bộ lại.');return {key:'active',sequence:0,world:{...result.state,clock:{...result.state.clock,revision:Math.max(r?.world.clock.revision??0,result.state.clock.revision)+1}},link:{userId:this.userId,version:remote.version},dirty:result.processedSeconds>0,userDirty:false,userSequence:r?.userSequence??0,pending:null,syncEnabled:true};},'Trước khi tải hồ cloud');
      if(!applied)throw Error('Không lưu được hồ cloud vào IndexedDB.');this.active();this.ports.replace(applied.world,previous,'report' in result&&result.processedSeconds>=60?result.report:undefined);
    }finally{resume();}
  }
  private async run(attempt=0){
    try{
      this.active();this.ports.status('syncing');await this.ports.flush();let record=await this.db.read();
      if(record&&!record.syncEnabled){this.ports.status('local','Hồ này đang được giữ riêng trên thiết bị.');return;}
      if(record?.link&&record.link.userId!==this.userId||record?.pending&&record.pending.userId!==this.userId){this.conflict('Hồ cục bộ thuộc lần đồng bộ với tài khoản khác. Không tự gửi sang tài khoản mới.');return;}
      // Retry the EXACT durable request first. A lost response is not a new write.
      if(record?.pending){const ack=await this.acknowledge(record.pending,await this.remote.push(record.pending,this.deviceId));if(!ack)return;}
      const pulled=await this.remote.pull();this.active();
      if(!Number.isFinite(pulled.serverUtc)||pulled.serverUtc<0)throw Error('Mốc giờ cloud không hợp lệ.');
      if(pulled.save&&(!Number.isSafeInteger(pulled.save.version)||pulled.save.version<1))throw Error('Phiên bản cloud không hợp lệ.');
      await this.ports.flush();record=await this.db.read();
      if(pulled.save){
        if(record&&!record.link){this.conflict('Tài khoản đã có hồ cloud và thiết bị này có hồ cục bộ riêng. Hãy chọn bản muốn tiếp tục; không tự ghi đè.');return;}
        if(record?.link&&pulled.save.version<record.link.version)throw Error('Phiên bản cloud thấp hơn phiên bản đã xác nhận. Chưa ghi đè.');
        if(!record||pulled.save.version!==(record.link?.version??0)){
          if(record?.userDirty){this.conflict();return;}
          // Discard an unedited time-only branch; recompute from canonical high-water mark.
          await this.install(pulled.save,pulled.serverUtc,record);record=await this.db.read();
        }
      }else if(record?.link&&record.link.version>0)throw Error('Không tìm thấy hồ cloud đã liên kết. Chưa tạo lại hoặc ghi đè.');
      if(!record){this.ports.status('local','Hãy mở hoặc tạo hồ để bắt đầu.');return;}
      if(record.dirty||!record.link){
        const queued=await this.db.mutate(r=>{if(!r)throw Error('Hồ offline không còn tồn tại.');return {...r,pending:{id:crypto.randomUUID(),userId:this.userId,expectedVersion:r.link?.version??0,world:structuredClone(r.world),sequence:r.sequence,userSequence:r.userSequence,userDirty:r.userDirty}};});
        const pending=queued!.pending!;this.active();const ack=await this.acknowledge(pending,await this.remote.push(pending,this.deviceId));if(!ack)return;if(ack==='rebase'){if(attempt<2)await this.run(attempt+1);else this.ports.status('syncing','Thiết bị khác đang cập nhật; sẽ thử lại.');return;}
      }
      await this.ports.flush();const latest=await this.db.read();this.ports.status(latest?.userDirty?'syncing':'synced',latest?.userDirty?'Đã gửi bản trước; các thay đổi mới đang chờ đồng bộ.':'');
    }catch(e){if(this.ports.current())this.ports.status(typeof navigator!=='undefined'&&navigator.onLine===false?'offline':'failed',e instanceof Error?e.message:'Đồng bộ thất bại. Bản offline vẫn được giữ.');}
  }
  useCloud(){return this.exclusive(async()=>{
    this.active();this.ports.status('syncing');
    try{const pulled=await this.remote.pull();this.active();await this.ports.flush();if(!pulled.save)throw Error('Tài khoản chưa có hồ cloud.');await this.install(pulled.save,pulled.serverUtc,await this.db.read());await this.run();}
    catch(e){this.ports.status('failed',e instanceof Error?e.message:'Không tải được hồ cloud.');}
  });}
  keepLocal(){return this.exclusive(async()=>{await this.ports.flush();await this.db.mutate(r=>r?{...r,link:null,pending:null,syncEnabled:false,dirty:true,userDirty:true}:r,'Giữ nhánh xung đột cục bộ');this.ports.status('local','Đã giữ hồ riêng. Hồ cloud không bị thay đổi.');});}
}
