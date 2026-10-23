import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createWorld,object,animal} from '../src/data/initial';
import {constrainObject} from '../src/game/interactions/placement';
import {plantBiology} from '../src/data/biology';
import {updateMorphology} from '../src/game/simulation/plantGrowth';
const dir='qa/m1';
function fixture(){
 const w=createWorld('fresh');w.mode='creative';w.name='M1 — Asset QC';w.water.light=75;w.automation.light.automatic=false;
 w.objects=[object('seiryu',-1.45,-.25,.95,-.30),object('dragon',1.55,-.55,.85,.35),object('spider',.15,-.55,.75,.45)];
 w.objects[0].variant=1;w.objects[1].variant=2;w.objects[2].variant=0;
 for(const [i,id] of ['monte','rotala','anubias'].entries())for(let j=0;j<3;j++){
  const p=object(id,-1.8+i*1.65+j*.26,.50+j*.13,id==='rotala'?.9:1.1,j*.7);p.growth=.9;p.bio=plantBiology(p);updateMorphology(p,w);w.objects.push(constrainObject(p,w.terrain));
 }
 w.animals=Array.from({length:9},(_,i)=>{const id=i<5?'neon':i===5?'betta':'shrimp',f=animal(id,i,w.terrain);f.life.lengthCm=f.life.adultLengthCm;return f;});
 return w;
}
async function open(page:Page){await page.goto('/?quality=low');await page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();await page.evaluate(()=>{(window as any).__m1Import=(path:string)=>{const entry=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname===path);return import(entry?.name??path);};});}
async function install(page:Page,w=fixture()){
 await page.getByRole('button',{name:'Menu và cài đặt'}).click();await page.locator('input[type=file]').setInputFiles({name:'m1-qc.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
 await expect(page.getByRole('dialog',{name:'Menu hồ'})).not.toBeVisible();await page.waitForTimeout(2400);
}
async function metrics(page:Page){return page.evaluate(async()=>({... (await (window as any).__m1Import('/src/game/scene/AquariumScene.tsx')).metrics}));}
async function closeView(page:Page,target:number[],offset:number[]){
 await page.evaluate(async({target,offset})=>{
  const {useGame}=await (window as any).__m1Import('/src/state/store.ts');useGame.getState().set({camera:'orbit',panel:null,selected:null,placing:null,tool:'select'});
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
  const state=[..._roots.values()][0].store.getState();state.controls.minDistance=.20;state.controls.target.set(...target);state.camera.position.set(...target.map((x:number,i:number)=>x+offset[i]));state.controls.update();
 },{target,offset});await expect(page.getByRole('button',{name:'Tự do',exact:true})).toHaveClass(/active/);await page.waitForTimeout(600);
}
async function diagnostics(page:Page){return page.evaluate(async()=>{const {modelDiagnostics}=await (window as any).__m1Import('/src/game/assets/modelResources.ts');return {loaded:[...modelDiagnostics.loaded],failed:[...modelDiagnostics.failed]};});}
test.beforeEach(async()=>{await mkdir(dir,{recursive:true});});
test('M1 actual GLB renders: nine families, close-ups, morph animation, growth, lighting and GPU cleanup',async({page})=>{
 test.setTimeout(600000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/i.test(m.text()))errors.push(m.text());});
 await open(page);await install(page);
 await expect.poll(async()=>new Set((await diagnostics(page)).loaded.map(p=>p.split('/').pop()!.split(/-\d-/)[0])).size,{timeout:60000}).toBe(9);
 const samples=[];
 for(const view of ['front','perspective','top']){
  await page.evaluate(async view=>{const {useGame}=await (window as any).__m1Import('/src/state/store.ts');useGame.getState().set({camera:view,cameraRevision:useGame.getState().cameraRevision+1});},view);
  await page.waitForTimeout(1800);await page.screenshot({path:`${dir}/after-${view}.png`,timeout:60000});samples.push({view,...await metrics(page)});
 }
 await page.getByLabel('Chất lượng đồ họa').selectOption('medium');await page.waitForTimeout(2400);
 for(const [id,target,offset] of [
  ['rock',[-1.45,.70,-.25],[1.0,.8,2.1]],['dragon',[1.55,.65,-.55],[.85,.55,1.3]],['wood',[.15,.65,-.55],[1.1,.8,1.6]],
  ['monte',[-1.5,.28,.65],[.1,.55,.75]],['rotala',[.05,.70,.65],[.25,.3,1.3]],['plant',[1.7,.35,.65],[.3,.6,1.05]]
 ] as [string,number[],number[]][]){await closeView(page,target,offset);await page.screenshot({path:`${dir}/close-${id}.png`,timeout:60000});}
 // Actual loaded GPU morph weights must change between frames, not just mesh transforms.
 const morph=()=>page.evaluate(async()=>{
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const scene=[..._roots.values()][0].store.getState().scene,values:number[][]=[];
  scene.traverse((o:any)=>{if(o.isInstancedMesh&&o.morphTexture)values.push(Array.from(o.morphTexture.image.data).slice(0,12) as number[]);});return values;
 });
 const a=await morph();expect(a.length).toBe(3);await expect.poll(morph,{timeout:20000,intervals:[500,1000,2000]}).not.toEqual(a);
 for(const id of ['neon','betta','shrimp']){
  const position=await page.evaluate(async id=>{const {useGame}=await (window as any).__m1Import('/src/state/store.ts');const {withVisualPose}=await import('/src/game/fish/poses.ts');const f=withVisualPose(useGame.getState().world.animals.find((f:any)=>f.species===id)!);return [f.x,f.y,f.z];},id);
  await closeView(page,position,[.08,.09,id==='betta'?.8:.60]);await page.screenshot({path:`${dir}/close-${id==='neon'?'fish':id}.png`,timeout:60000});
 }
 // Same scene and angle under every preset. No postprocessing hides its surfaces.
 await closeView(page,[0,.9,0],[3.4,2.5,6]);
 for(const lighting of ['daylight','warm','cool','evening','night']){
  await page.evaluate(async lighting=>{const {useGame}=await (window as any).__m1Import('/src/state/store.ts');useGame.getState().edit((w:any)=>{w.appearance={lighting,frontGlass:false};});},lighting);
  await page.waitForTimeout(700);await page.screenshot({path:`${dir}/lighting-${lighting}.png`,timeout:60000});
 }
 // Growth changes instance count, node/runner distribution, height and spread.
 const growth=[];
 for(const value of [.08,.92]){
  await page.evaluate(async growth=>{const {useGame}=await (window as any).__m1Import('/src/state/store.ts');const {updateMorphology}=await import('/src/game/simulation/plantGrowth.ts');useGame.getState().edit((w:any)=>{w.appearance={lighting:'daylight',frontGlass:false};for(const o of w.objects)if(o.bio){o.growth=growth;updateMorphology(o,w);}});},value);
  await page.waitForTimeout(1800);await closeView(page,[0,.65,.55],[2,1.6,3.6]);await page.screenshot({path:`${dir}/growth-${value<.5?'young':'mature'}.png`,timeout:60000});growth.push(await metrics(page));
 }
 expect(growth[1].triangles).toBeGreaterThan(growth[0].triangles);
 const quality=[];
 for(const q of ['low','high','low']){
  await page.getByLabel('Chất lượng đồ họa').selectOption(q);await page.waitForTimeout(2700);quality.push({quality:q,...await metrics(page)});
 }
 expect(quality[1].triangles).toBeGreaterThan(quality[0].triangles);expect(quality[2].geometries).toBeLessThanOrEqual(quality[0].geometries+2);
 const before=await diagnostics(page);expect(before.failed).toEqual([]);
 // Remove and reload all assets repeatedly: bounded GPU resources, not increasing.
 const cleanup=[];
 for(let cycle=0;cycle<2;cycle++){await install(page,createWorld('fresh'));await page.waitForTimeout(1800);cleanup.push({scene:'empty',cycle,...await metrics(page)});await install(page);await page.waitForTimeout(1800);cleanup.push({scene:'loaded',cycle,...await metrics(page)});}
 expect(cleanup[2].geometries).toBeLessThanOrEqual(cleanup[0].geometries+2);expect(cleanup[2].textures).toBeLessThanOrEqual(cleanup[0].textures+2);
 expect(errors).toEqual([]);
 await writeFile(`${dir}/render-qc.json`,JSON.stringify({samples,quality,growth,cleanup,diagnostics:before,morphAnimationChanged:true,errors,hardware:'Chromium software WebGL/SwiftShader; not physical-device FPS'},null,2));
});
test('M1 hardscape variants transform, select, undo/redo, delete and persist; old save still loads',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await install(page);
 await page.evaluate(async()=>{const {useGame}=await (window as any).__m1Import('/src/state/store.ts');const s=useGame.getState();const id=s.world.objects.find((o:any)=>o.asset==='seiryu')!.id;s.set({selected:id});});
 await expect(page.getByRole('complementary',{name:'Thuộc tính vật thể'})).toBeVisible();
 for(const [name,value] of [['Xoay','1.1'],['Kích thước','0.8'],['Ngang X','-1.2']] as const)await page.getByLabel(name,{exact:true}).evaluate((el:any,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 await page.getByRole('button',{name:'Nhân bản',exact:true}).click();await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();await page.getByRole('button',{name:'Làm lại',exact:true}).click();await page.evaluate(async()=>{const {useGame}=await (window as any).__m1Import('/src/state/store.ts');const s=useGame.getState();s.set({selected:s.world.objects[s.world.objects.length-1].id});});await page.getByRole('button',{name:'Xóa',exact:true}).click();
 await page.keyboard.press('Control+s');await expect(page.locator('.save-status')).toHaveText('Đã lưu');
 const snapshot=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!));expect(snapshot.objects).toHaveLength(12);expect(snapshot.objects[0].variant).toBe(1);expect(snapshot.objects[0].rotation).toBeCloseTo(1.11);
 await page.reload();await page.evaluate(()=>{(window as any).__m1Import=(path:string)=>{const entry=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname===path);return import(entry?.name??path);};});await page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();await page.waitForTimeout(2500);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!).objects)).toEqual(snapshot.objects);
 const old=JSON.parse(await readFile('qa/qc/built-release/phone-export.json','utf8'));await install(page,old);await page.keyboard.press('Control+s');await expect(page.locator('.save-status')).toHaveText('Đã lưu');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!).objects.map((o:any)=>[o.id,o.asset]))).toEqual(old.objects.map((o:any)=>[o.id,o.asset]));expect(errors).toEqual([]);
});
test('M1 fallback keeps tank usable when a GLB or texture cannot load',async({page})=>{
 await page.route('**/models/m1/seiryu-*-low.glb',r=>r.abort('failed'));await page.route('**/models/m1/anubias-leaf-base.webp',r=>r.abort('failed'));
 await open(page);await install(page);
 await expect.poll(async()=>(await diagnostics(page)).failed.length,{timeout:60000}).toBeGreaterThan(0);await expect(page.locator('canvas')).toBeVisible();
 await page.keyboard.press('Control+s');await expect(page.locator('.save-status')).toHaveText('Đã lưu');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!).objects.length)).toBe(12);
 await page.screenshot({path:`${dir}/asset-load-fallback.png`,timeout:60000});
});
