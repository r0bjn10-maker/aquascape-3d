import { test,expect } from '@playwright/test';
import { writeFile,mkdir } from 'node:fs/promises';
import { createWorld,object,animal } from '../src/data/initial';
import { catalog } from '../src/data/catalog';
import { PLANT_FORMS,FISH_FORMS } from '../src/data/forms';
import { plantBiology } from '../src/data/biology';
import { updateMorphology } from '../src/game/simulation/plantGrowth';
import { constrainObject } from '../src/game/interactions/placement';

test.beforeEach(async()=>{await mkdir('qa/phase1',{recursive:true});});
test('all registry previews are local decodable WebP files with explicit fallback status',async({request})=>{
  const response=await request.get('/asset-registry.json');expect(response.ok()).toBe(true);
  const registry=await response.json();expect(registry.assets).toHaveLength(42);
  for(const asset of registry.assets){expect(asset.status).toBe('procedural-fallback');for(let variant=0;variant<asset.variants;variant++){
    const preview=await request.get('/'+asset.preview.replace('-0.webp',`-${variant}.webp`));expect(preview.status()).toBe(200);expect((await preview.body()).subarray(0,4).toString()).toBe('RIFF');
  }}
});
test('expanded library search, real variants, scale preview, moss attachment and all animal purchases',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?quality=low');await page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();
  await page.getByRole('button',{name:'Menu và cài đặt'}).click();await page.getByLabel('Chế độ sáng tạo').check();await page.getByRole('button',{name:'Đóng menu'}).click();
  await page.getByRole('button',{name:'Từ trên',exact:true}).click();await page.waitForTimeout(1300);
  await page.getByRole('button',{name:'Bố cục',exact:true}).click();await page.getByLabel('Tìm tài nguyên').fill('slate');await expect(page.locator('.asset-card')).toHaveCount(1);
  await page.getByLabel('Biến thể hình dáng').selectOption('2');await page.getByTestId('buy-slate').click();
  await page.getByLabel('Kích thước khi đặt').focus();await page.getByLabel('Kích thước khi đặt').press('Home');for(let i=0;i<9;i++)await page.getByLabel('Kích thước khi đặt').press('ArrowRight');
  const canvas=(await page.locator('canvas').boundingBox())!,x=canvas.x+canvas.width*.56,y=canvas.y+canvas.height*.48;
  await page.mouse.move(x,y);await page.mouse.click(x,y);await page.keyboard.press('Control+s');
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!));
  const stone=(await read()).objects[0];expect(stone.asset).toBe('slate');expect(stone.variant).toBe(2);expect(stone.scale).toBeCloseTo(.8);
  await page.getByRole('button',{name:'Cây',exact:true}).click();await page.getByLabel('Nhóm cây').selectOption('foreground');await expect(page.locator('.asset-card')).toHaveCount(4);
  await page.getByLabel('Nhóm cây').selectOption('all');await page.getByLabel('Tìm tài nguyên').fill('Christmas');await page.getByTestId('buy-christmas').click();await page.getByLabel('Gắn cây lên đá / lũa').check();
  await page.mouse.click(x,y);await page.keyboard.press('Control+s');let world=await read();expect(world.objects[1].asset).toBe('christmas');expect(world.objects[1].attachedTo).toBe(stone.id);expect(world.objects[1].bio.stage).toBe(1);
  await page.getByRole('button',{name:'Sinh vật',exact:true}).click();await page.getByLabel('Tầng bơi').selectOption('bottom');await expect(page.locator('.asset-card')).toHaveCount(3);await page.getByLabel('Tầng bơi').selectOption('all');
  for(const id of Object.keys(FISH_FORMS))await page.getByTestId('buy-'+id).click();
  await page.keyboard.press('Control+s');world=await read();expect(world.animals).toHaveLength(11);expect(new Set(world.animals.map((f:{species:string})=>f.species)).size).toBe(11);
  await page.getByRole('button',{name:'Đóng cửa hàng'}).click();await page.getByRole('button',{name:'Tự do',exact:true}).click();await expect(page.getByRole('button',{name:'Tự do',exact:true})).toHaveClass(/active/);
  await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});await page.screenshot({path:'qa/phase1/expanded-interaction.png',timeout:60000});await page.reload();await page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();expect((await read()).objects).toEqual(world.objects);expect((await read()).clock.careMode).toBe('balanced');expect(errors).toEqual([]);
});
test('lighting and front glass persist, every quality level renders without shader errors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|program/i.test(m.text()))errors.push(m.text());});
  await page.goto('/?quality=low');await page.getByRole('button',{name:'Khám phá hồ mẫu',exact:false}).click();
  for(const lighting of ['daylight','warm','cool','evening','night']){
    await page.getByRole('button',{name:'Menu và cài đặt'}).click();await page.getByLabel('Preset ánh sáng').selectOption(lighting);await page.getByLabel('Hiện kính trước',{exact:true}).uncheck();await page.getByRole('button',{name:'Lưu hồ',exact:true}).click();await page.waitForTimeout(1200);
    await page.screenshot({path:`qa/phase1/lighting-${lighting}.png`,timeout:60000});
  }
  await page.reload();await page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();await page.getByRole('button',{name:'Menu và cài đặt'}).click();await expect(page.getByLabel('Preset ánh sáng')).toHaveValue('night');await expect(page.getByLabel('Hiện kính trước',{exact:true})).not.toBeChecked();
  await page.getByLabel('Preset ánh sáng').selectOption('daylight');await page.getByRole('button',{name:'Đóng menu'}).click();
  for(const quality of ['medium','high','low']){await page.getByLabel('Chất lượng đồ họa').selectOption(quality);await page.waitForTimeout(1800);await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});}
  expect(errors).toEqual([]);
});
test('dense plant/fish scene renders and repeated import/reset releases GPU resources',async({page})=>{
  test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?quality=low');await page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();
  const perf=page.getByTestId('performance');await expect(perf).not.toHaveText(/^0 fps/,{timeout:60000});await page.waitForTimeout(1500);
  const snapshot=()=>perf.evaluate(el=>({metrics:el.textContent??'',geometries:Number(el.getAttribute('data-geometries')),textures:Number(el.getAttribute('data-textures'))}));
  const baseline=Number(await perf.getAttribute('data-geometries')),samples=[];
  for(let cycle=0;cycle<2;cycle++){
    const world=createWorld('fresh');world.mode='creative';world.appearance={lighting:'warm',frontGlass:true};
    for(let copy=0;copy<3;copy++)for(const [i,id] of Object.keys(PLANT_FORMS).entries()){const p=object(id,-2.4+(i%5)*1.15+copy*.07,-1.02+Math.floor(i/5)*.82+copy*.08,.85);p.growth=.85;p.bio=plantBiology(p);updateMorphology(p,world);world.objects.push(constrainObject(p,world.terrain));}
    for(const [i,a] of catalog.filter(a=>a.category==='rocks'||a.id==='arch').entries())world.objects.push(constrainObject(object(a.id,-1.8+i*.6,-.65,.5),world.terrain));
    world.animals=Array.from({length:66},(_,i)=>{const f=animal(Object.keys(FISH_FORMS)[i%11],i,world.terrain);f.life.lengthCm=f.life.adultLengthCm*.75;return f;});
    await writeFile('qa/phase1/stress-world.json',JSON.stringify(world));await page.getByRole('button',{name:'Menu và cài đặt'}).click();await page.locator('input[type=file]').setInputFiles({name:'graphics-stress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(world))});
    await expect.poll(async()=>(await snapshot()).geometries,{timeout:60000}).toBeGreaterThan(baseline+20);await expect(perf).toContainText('111,864 tris',{timeout:60000});await page.waitForTimeout(2100);samples.push({cycle,scene:'dense',...await snapshot()});
    if(cycle===0)await page.screenshot({path:'qa/phase1/dense-scene.png',timeout:60000});
    await page.getByRole('button',{name:'Menu và cài đặt'}).click();await page.getByRole('button',{name:'Tạo hồ khác'}).click();await page.getByRole('button',{name:'Mở màn hình bắt đầu'}).click();await page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();await page.waitForTimeout(2600);
    await writeFile('qa/phase1/resource-cleanup.json',JSON.stringify({baseline,samples},null,2));await expect.poll(async()=>Number(await perf.getAttribute('data-geometries')),{timeout:15000}).toBeLessThanOrEqual(baseline+5);await expect(perf).toContainText('5,772 tris',{timeout:15000});samples.push({cycle,scene:'cleared',...await snapshot()});
  }
  await writeFile('qa/phase1/resource-cleanup.json',JSON.stringify({baseline,samples,note:'Cloud software WebGL only; no physical-device FPS claim.'},null,2));expect(errors).toEqual([]);
});
