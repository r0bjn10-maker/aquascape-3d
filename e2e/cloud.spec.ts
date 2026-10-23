import { test,expect } from '@playwright/test';
import type { Browser,BrowserContext,Page } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
import type { World } from '../src/game/types';
const project='https://aquascape-test.supabase.co',user='10000000-0000-4000-8000-000000000001';
const expires=Math.floor(Date.now()/1000)+3600;
const jwt=(sub=user)=>[btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),btoa(JSON.stringify({sub,aud:'authenticated',role:'authenticated',exp:expires})),btoa('mock-signature-only')].map(part=>part.replaceAll('=','').replaceAll('+','-').replaceAll('/','_')).join('.');
const session=()=>({access_token:jwt(),refresh_token:'test-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:user,aud:'authenticated',role:'authenticated',email:'player@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-10-23T00:00:00Z'}});
const authKey='aquascape-auth-v1-aquascape-test.supabase.co';
class MockSupabase {
  save:{version:number;world:World}|null=null;receipts=new Map<string,{version:number;content:string}>();attempts=new Map<string,number>();loseAck=false;otps:Record<string,unknown>[]=[];exchanges=0;backups:{version:number;world:World;created_at:string}[]=[];
  async attach(context:BrowserContext){await context.route(project+'/**',async route=>{
    const request=route.request(),url=new URL(request.url());const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'};if(request.method()==='OPTIONS'){await route.fulfill({status:200,headers,body:'{}'});return;}
    const reply=async(body:unknown,status=200)=>route.fulfill({status,headers,body:JSON.stringify(body)});
    if(url.pathname==='/auth/v1/otp'){this.otps.push(request.postDataJSON());await reply({});return;}
    if(url.pathname==='/auth/v1/verify'){await reply(session());return;}
    if(url.pathname==='/auth/v1/token'){this.exchanges++;await reply(session());return;}
    if(url.pathname==='/auth/v1/user'){await reply(session().user);return;}
    if(url.pathname==='/auth/v1/logout'){await reply({});return;}
    if(request.headers().authorization!=='Bearer '+jwt()){await reply({message:'Unauthenticated'},401);return;}
    if(url.pathname==='/rest/v1/rpc/aquascape_pull'){await reply({save:this.save,serverUtc:Date.now()});return;}
    if(url.pathname==='/rest/v1/rpc/aquascape_commit'){
      const p=request.postDataJSON(),id=p.p_request_id as string;this.attempts.set(id,(this.attempts.get(id)??0)+1);const receipt=this.receipts.get(id);
      if(receipt){expect(receipt.content).toBe(JSON.stringify(p.p_world));await reply({status:'already_applied',version:receipt.version,serverUtc:Date.now()});return;}
      if((this.save?.version??0)!==p.p_expected_version){await reply({status:'conflict',version:this.save?.version??0,serverUtc:Date.now()});return;}
      if(this.save)this.backups.push({...structuredClone(this.save),created_at:new Date().toISOString()});
      this.save={version:p.p_expected_version+1,world:p.p_world};this.receipts.set(id,{version:this.save.version,content:JSON.stringify(p.p_world)});
      if(this.loseAck){this.loseAck=false;await route.abort('connectionreset');return;}
      await reply({status:'applied',version:this.save.version,serverUtc:Date.now()});return;
    }
    if(url.pathname==='/rest/v1/aquascape_backups'){await reply(this.backups.toReversed().slice(0,20));return;}
    await reply({message:'Unknown mock endpoint'},404);
  });}
}
async function device(browser:Browser,server:MockSupabase,name:string,loggedIn=true,expired=false){
  const sizes=name==='iPhone'?[390,844]:name==='iPad'?[1024,768]:[1280,900];const context=await browser.newContext({viewport:{width:sizes[0],height:sizes[1]},hasTouch:name!=='Windows',isMobile:name==='iPhone',serviceWorkers:'block'});
  await context.addInitScript(({config,auth,authKey})=>{localStorage.setItem('aquascape-cloud-config-v1',JSON.stringify(config));if(auth&&!sessionStorage.getItem('auth-seeded')){localStorage.setItem(authKey,JSON.stringify(auth));sessionStorage.setItem('auth-seeded','1');}},{config:{url:project,key:'sb_publishable_local_test_only_000000'},auth:loggedIn?{...session(),...(expired?{expires_at:Math.floor(Date.now()/1000)-10}:{})}:null,authKey});
  await server.attach(context);const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?quality=low');await expect(page.locator('.session-cover')).toHaveCount(0,{timeout:60000});return {context,page,errors};
}
async function record(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('aquascape-offline-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise<import('../src/persistence/database').LocalRecord>((resolve,reject)=>{const r=db.transaction('state','readonly').objectStore('state').get('active');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}});}
async function menu(page:Page){if(!await page.getByRole('dialog',{name:'Menu hồ'}).isVisible())await page.getByRole('button',{name:'Menu và cài đặt'}).click();}
async function sync(page:Page){await menu(page);await page.getByRole('button',{name:'Đồng bộ hồ này',exact:true}).click();await expect(page.getByTestId('sync-status')).toHaveText('Đã đồng bộ',{timeout:45000});}
async function rename(page:Page,name:string){await menu(page);await page.getByLabel('Tên hồ').fill(name);await page.getByRole('button',{name:'Lưu hồ',exact:true}).click();await expect.poll(async()=>(await record(page)).world.name).toBe(name);}
test('same aquarium moves across Windows, iPhone and iPad profiles without duplicate offline growth',async({browser})=>{
  test.setTimeout(180000);await mkdir('qa/cloud',{recursive:true});const server=new MockSupabase(),a=await device(browser,server,'Windows');
  await a.page.getByRole('button',{name:'Khám phá hồ mẫu',exact:false}).click();await rename(a.page,'Hồ chung 3 thiết bị');await sync(a.page);const canonical=structuredClone(server.save!.world);await a.context.close();
  const layout=(w:World)=>w.objects.map(o=>({id:o.id,asset:o.asset,x:o.x,z:o.z,elevation:o.elevation,rotation:o.rotation,scale:o.scale,variant:o.variant,attachedTo:o.attachedTo}));
  const check=(saved:Awaited<ReturnType<typeof record>>)=>{expect(layout(saved.world)).toEqual(layout(canonical));expect(saved.world.animals.map(f=>[f.id,f.species])).toEqual(canonical.animals.map(f=>[f.id,f.species]));expect(saved.world.automation).toEqual(canonical.automation);expect(saved.world.terrain).toEqual(canonical.terrain);expect(saved.world.coins).toBe(canonical.coins);expect(saved.world.clock.careMode).toBe('balanced');expect(saved.world.animals[0].life.ageSeconds-canonical.animals[0].life.ageSeconds).toBeLessThan((Date.now()-canonical.clock.lastSimulatedUtc)/1000+60);};
  const b=await device(browser,server,'iPhone');await b.page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();check(await record(b.page));await rename(b.page,'Chăm hồ từ iPhone');await sync(b.page);await b.context.close();
  const c=await device(browser,server,'iPad');await c.page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();check(await record(c.page));expect((await record(c.page)).world.name).toBe('Chăm hồ từ iPhone');
  await c.page.screenshot({path:'qa/cloud/ipad-shared.png',timeout:60000});
  await writeFile('qa/cloud/three-devices.json',JSON.stringify({transport:'Mock Supabase HTTP + actual SDK/Auth/IndexedDB; sequential Chromium profiles, not physical devices',version:server.save!.version,profiles:['Windows','iPhone','iPad'],savedName:server.save!.world.name,errors:[...a.errors,...b.errors,...c.errors]},null,2));expect([...a.errors,...b.errors,...c.errors]).toEqual([]);await c.context.close();
});
test('offline edits on two devices conflict safely; choosing cloud backs up the local branch',async({browser})=>{
  test.setTimeout(150000);const server=new MockSupabase(),a=await device(browser,server,'Windows');await a.page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();await sync(a.page);const b=await device(browser,server,'iPhone');await b.page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();
  await b.context.setOffline(true);await sync(a.page);await a.context.setOffline(true);await rename(a.page,'Windows offline');await rename(b.page,'iPhone offline');
  await a.context.setOffline(false);await sync(a.page);await b.context.setOffline(false);await menu(b.page);await b.page.getByRole('button',{name:'Thử đồng bộ lại'}).click();await expect(b.page.getByTestId('sync-status')).toHaveText('Xung đột');expect(server.save!.world.name).toBe('Windows offline');expect((await record(b.page)).world.name).toBe('iPhone offline');
  await b.page.screenshot({path:'qa/cloud/conflict-phone.png',timeout:60000});await b.page.getByRole('button',{name:'Dùng hồ cloud, sao lưu hồ này'}).click();await expect(b.page.getByTestId('sync-status')).toHaveText('Đã đồng bộ');expect((await record(b.page)).world.name).toBe('Windows offline');await b.page.getByText('Backup và phục hồi',{exact:true}).click();await expect(b.page.getByRole('button',{name:'Phục hồi cục bộ'}).first()).toBeVisible();expect([...a.errors,...b.errors]).toEqual([]);await a.context.close();await b.context.close();
});
test('lost response retries the durable request after reload and preserves the committed cloud state',async({browser})=>{
  const server=new MockSupabase(),d=await device(browser,server,'Windows');await d.page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();await sync(d.page);server.loseAck=true;await rename(d.page,'Lost ACK survived');await menu(d.page);await expect(d.page.getByTestId('sync-status')).toHaveText('Đồng bộ thất bại');const pending=(await record(d.page)).pending!;expect(pending).toBeTruthy();expect(server.save!.world.name).toBe('Lost ACK survived');await d.page.reload();await expect(d.page.locator('.session-cover')).toHaveCount(0);await d.page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();await sync(d.page);expect(server.attempts.get(pending.id)).toBeGreaterThanOrEqual(2);expect((await record(d.page)).pending).toBeNull();expect((await record(d.page)).world.name).toBe('Lost ACK survived');expect(d.errors).toEqual([]);await d.context.close();
});
test('email magic link uses PKCE, persists login on reload and supports local sign out/relogin',async({browser})=>{
  const server=new MockSupabase(),d=await device(browser,server,'iPhone',false);await d.page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();await menu(d.page);await d.page.getByLabel('Email đăng nhập cloud').fill('player@example.test');await d.page.getByRole('button',{name:'Gửi magic link'}).click();await expect.poll(()=>server.otps.length).toBe(1);expect(server.otps[0].code_challenge).toBeTruthy();expect(server.otps[0].code_challenge_method).toBe('s256');await expect(d.page.getByText('Đã gửi liên kết.',{exact:false})).toBeVisible();
  const callback=await d.context.newPage();await callback.goto('/?quality=low&code=mock-one-use-code');await expect(callback.locator('.session-banner')).toBeVisible();await expect(d.page.getByRole('button',{name:'Đăng xuất trên thiết bị này'})).toBeVisible();expect(server.exchanges).toBeGreaterThan(0);await callback.close();await sync(d.page);await d.page.reload();await expect(d.page.locator('.session-cover')).toHaveCount(0);await menu(d.page);await expect(d.page.getByRole('button',{name:'Đăng xuất trên thiết bị này'})).toBeVisible();await d.page.getByRole('button',{name:'Đăng xuất trên thiết bị này'}).click();await expect(d.page.getByLabel('Email đăng nhập cloud')).toBeVisible();expect((await record(d.page)).world.clock.careMode).toBe('balanced');await d.page.getByLabel('Email đăng nhập cloud').fill('player@example.test');await d.page.getByRole('button',{name:'Gửi magic link'}).click();await expect.poll(()=>server.otps.length).toBe(2);await expect(d.page.getByText('Đã gửi liên kết.',{exact:false})).toBeVisible();await d.page.getByText('Đăng nhập bằng mã email',{exact:true}).click();await d.page.getByLabel('Mã đăng nhập email').fill('123456');await d.page.getByRole('button',{name:'Xác nhận mã email'}).click();await expect(d.page.getByRole('button',{name:'Đăng xuất trên thiết bị này'})).toBeVisible();expect(d.errors).toEqual([]);await d.context.close();
});

test('expired persisted Auth session refreshes before synchronization',async({browser})=>{const server=new MockSupabase(),d=await device(browser,server,'Windows',true,true);await menu(d.page);await expect(d.page.getByRole('button',{name:'Đăng xuất trên thiết bị này'})).toBeVisible();expect(server.exchanges).toBeGreaterThan(0);await d.page.getByRole('button',{name:'Đóng menu'}).click();await d.page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();await sync(d.page);expect((await record(d.page)).link?.userId).toBe(user);expect(d.errors).toEqual([]);await d.context.close();});
