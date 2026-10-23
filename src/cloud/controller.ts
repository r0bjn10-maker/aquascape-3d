import { create } from 'zustand';
import type { SupabaseClient,Session } from '@supabase/supabase-js';
import { SyncEngine } from './sync';
import type { SyncStatus } from './sync';
import { CLOUD_CONFIG_KEY,readConfig,validateConfig } from './config';
import type { CloudConfig } from './config';
import { makeClient,transport } from './supabase';
import { offlineDatabase,ownsSession } from '../persistence/journal';
import { mirrorLegacy } from '../persistence/database';
import { useGame } from '../state/store';
import { persistCurrentWorld,resetPersistenceEpoch,hasUnpersistedEdits } from '../state/persist';
import { parseSave } from '../persistence/save';
import { catchUp } from '../game/simulation/realTime';
interface CloudState {configured:boolean;user:{id:string;email:string}|null;status:SyncStatus;message:string;authBusy:boolean}
export const useCloud=create<CloudState>(()=>({configured:!!readConfig(),user:null,status:'local',message:'Chơi cục bộ không cần tài khoản.',authBusy:false}));
let client:SupabaseClient|null=null,engine:SyncEngine|null=null,epoch=0,init:Promise<void>|null=null,subscription:(()=>void)|null=null;
const status=(value:SyncStatus,message='')=>useCloud.setState({status:value,message});
function replaceWorld(world:ReturnType<typeof parseSave>,before:ReturnType<typeof parseSave>|null,report?:import('../game/types').ProgressReport){
  mirrorLegacy(world);useGame.getState().set({world,saved:true,hasSavedWorld:true,preview:null,undo:[],redo:[],selected:null,placing:null,tool:'select',comparisonBefore:before,returnReport:report??null,reportOpen:!!report,offlineWarning:''});resetPersistenceEpoch();
}
async function identity(session:Session|null,currentClient:SupabaseClient){
  if(client!==currentClient)return;
  const user=session?.user?{id:session.user.id,email:session.user.email??''}:null;
  if(user?.id===useCloud.getState().user?.id&&engine)return;
  const generation=++epoch;engine=null;useCloud.setState({user});
  if(!user){status('local','Chơi cục bộ. Đăng nhập để đồng bộ hồ.');return;}
  if(!offlineDatabase||!ownsSession()){status('local','Chỉ tab giữ quyền ghi mới đồng bộ.');return;}
  const db=offlineDatabase,deviceId=await db.deviceId();if(generation!==epoch)return;
  engine=new SyncEngine(db,transport(currentClient),user.id,deviceId,{
    flush:persistCurrentWorld,current:()=>generation===epoch&&ownsSession()&&client===currentClient,
    replace:replaceWorld,status,
    suspend:()=>{if(hasUnpersistedEdits())throw Error('Có chỉnh sửa mới chưa lưu trong lúc nhận cloud. Hồ được giữ; hãy thử đồng bộ lại.');useGame.getState().set({syncApplying:true});return()=>useGame.getState().set({syncApplying:false});},
  });
}
export async function initializeCloud(){
  if(init)return init;
  init=(async()=>{
    const config=readConfig();useCloud.setState({configured:!!config});if(!config)return;
    const current=makeClient(config);client=current;
    const {data}=current.auth.onAuthStateChange((_event,session)=>{queueMicrotask(()=>{void identity(session,current).then(()=>{if(useGame.getState().session==='active')void syncNow();}).catch(e=>status('failed',String(e)));});});subscription=()=>data.subscription.unsubscribe();
    const result=await current.auth.getSession();if(result.error){status('failed','Không khôi phục được phiên đăng nhập. Hãy đăng nhập lại; hồ offline vẫn giữ nguyên.');return;}
    await identity(result.data.session,current);
    // Supabase PKCE consumes the one-use code. Do not retain auth codes in copied URLs.
    const url=new URL(location.href);if(result.data.session&&url.searchParams.has('code')){url.searchParams.delete('code');history.replaceState(null,'',url);}
  })();return init;
}
export async function configureCloud(config:CloudConfig){
  const value=validateConfig(config);localStorage.setItem(CLOUD_CONFIG_KEY,JSON.stringify(value));
  subscription?.();client?.auth.stopAutoRefresh();epoch++;client=null;engine=null;init=null;useCloud.setState({user:null});await initializeCloud();
}
export async function sendMagicLink(email:string){
  if(!client)throw Error('Hãy cấu hình project Supabase trước.');if(!email.trim())throw Error('Hãy nhập email.');
  useCloud.setState({authBusy:true});
  try{const redirect=new URL(((import.meta as ImportMeta&{env:{BASE_URL:string}}).env.BASE_URL),location.origin+location.pathname);redirect.search='';redirect.hash='';const {error}=await client.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:redirect.href,shouldCreateUser:true}});if(error)throw Error(error.message);useCloud.setState({message:'Đã gửi liên kết. Mở email trên đúng trình duyệt/thiết bị vừa yêu cầu đăng nhập.'});}finally{useCloud.setState({authBusy:false});}
}
export async function verifyEmailCode(email:string,token:string){
  if(!client)throw Error('Hãy cấu hình project Supabase trước.');
  const {error}=await client.auth.verifyOtp({email:email.trim(),token:token.trim(),type:'email'});if(error)throw Error(error.message);
}
export async function signOut(){if(!client)return;await persistCurrentWorld();const {error}=await client.auth.signOut({scope:'local'});if(error)throw Error('Đăng xuất chưa hoàn tất. Kiểm tra mạng và thử lại.');epoch++;engine=null;useCloud.setState({user:null});status('local','Đã đăng xuất trên thiết bị này; hồ offline được giữ.');}
export async function syncNow(){
  if(!engine||!ownsSession()||useGame.getState().syncApplying)return;
  if(!navigator.onLine){status('offline','Đang giữ hồ offline; sẽ thử lại khi có mạng.');return;}
  status('syncing');await engine.sync();
}
export async function useCloudCopy(){if(engine)await engine.useCloud();}
export async function keepLocalCopy(){if(engine)await engine.keepLocal();}
export async function enableSync(){status('syncing');if(offlineDatabase)await offlineDatabase.mutate(r=>r?{...r,syncEnabled:true}:r);await syncNow();}
export async function cloudBackups(){
  if(!client||!useCloud.getState().user)return [];
  const {data,error}=await client.from('aquascape_backups').select('version,world,created_at').order('version',{ascending:false}).limit(20);if(error)throw Error(error.message);
  return (data??[]).map(row=>({version:Number(row.version),createdUtc:Date.parse(row.created_at),world:parseSave(JSON.stringify(row.world))}));
}
export async function restoreLocalBackup(id:string){
  const db=offlineDatabase;if(!db||!ownsSession())throw Error('Tab này không giữ quyền ghi.');await persistCurrentWorld();
  const backup=(await db.backups()).find(b=>b.id===id);if(!backup)throw Error('Bản sao lưu không còn tồn tại.');
  useGame.getState().set({syncApplying:true});
  try{const result=catchUp(parseSave(JSON.stringify(backup.world)),Date.now());const record=await db.mutate(r=>({key:'active',sequence:0,world:result.state,link:null,pending:null,syncEnabled:false,dirty:true,userDirty:true,userSequence:(r?.userSequence??0)+1}),'Trước khi phục hồi bản sao lưu');if(record)replaceWorld(record.world,backup.world);status('local','Đã phục hồi thành hồ cục bộ riêng; hồ cloud không đổi.');}finally{useGame.getState().set({syncApplying:false});}
}
