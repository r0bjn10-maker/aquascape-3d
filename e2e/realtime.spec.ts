import { writeFile } from 'node:fs/promises';
import { test,expect } from '@playwright/test';
const key='aquascape-world-v1';
const read=(page:import('@playwright/test').Page)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);
test('offline month grows real biology, reports once, and preview never commits its prediction',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?quality=low');await page.getByRole('button',{name:'Khám phá hồ mẫu',exact:false}).click();await page.keyboard.press('Control+s');const original=await read(page);await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});const triangles=async()=>Number((await page.getByTestId('performance').innerText()).match(/([\d,]+) tris/)![1].replaceAll(',',''));const beforeTriangles=await triangles();
  await page.addInitScript(k=>{if(sessionStorage.getItem('offline-fixture'))return;const raw=localStorage.getItem(k);if(raw){const w=JSON.parse(raw),ms=30*86400000;w.clock.lastSimulatedUtc-=ms;w.clock.simulationUtc-=ms;localStorage.setItem(k,JSON.stringify(w));sessionStorage.setItem('offline-fixture','yes');}},key);
  await page.reload();await expect(page.getByRole('dialog',{name:'Chào mừng trở lại'})).toBeVisible();const grown=await read(page);
  expect(grown.animals[0].life.ageSeconds).toBeGreaterThan(29.9*86400);expect(grown.animals[0].life.lengthCm).toBeGreaterThan(original.animals[0].life.lengthCm);expect(grown.objects.find((o:{asset:string})=>o.asset==='rotala').growth).toBeGreaterThan(original.objects.find((o:{asset:string})=>o.asset==='rotala').growth);
  await page.screenshot({path:'qa/v21-welcome-back.png',timeout:60000});await page.getByRole('button',{name:'Tiếp tục ngắm hồ',exact:true}).click();await expect.poll(triangles,{timeout:30000}).toBeGreaterThan(beforeTriangles);await writeFile('qa/v21-visual-growth.json',JSON.stringify({beforeTriangles,afterTriangles:await triangles(),beforeLengthCm:original.animals[0].life.lengthCm,afterLengthCm:grown.animals[0].life.lengthCm},null,2));
  await page.reload();await page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();await expect(page.getByRole('dialog',{name:'Chào mừng trở lại'})).toHaveCount(0);const again=await read(page);expect(again.animals[0].life.ageSeconds-grown.animals[0].life.ageSeconds).toBeLessThan(120);
  await page.keyboard.press('Control+s');const beforePreview=await read(page);await page.getByRole('button',{name:'Xem trước',exact:true}).click();await expect(page.getByRole('complementary',{name:'Dự đoán trên bản sao'})).toBeVisible();await page.keyboard.press('Control+s');const afterPreview=await read(page);await page.waitForTimeout(1100);await page.keyboard.press('Control+s');const stablePreview=await read(page);expect(stablePreview.animals.map((f:{x:number;y:number;z:number})=>[f.x,f.y,f.z])).toEqual(afterPreview.animals.map((f:{x:number;y:number;z:number})=>[f.x,f.y,f.z]));
  expect(afterPreview.animals[0].life.ageSeconds-beforePreview.animals[0].life.ageSeconds).toBeLessThan(120);expect(afterPreview.coins).toBe(beforePreview.coins);expect(afterPreview.objects.map((o:{id:string})=>o.id)).toEqual(beforePreview.objects.map((o:{id:string})=>o.id));
  await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});await page.waitForTimeout(1800);await page.screenshot({path:'qa/v21-time-lapse.png',timeout:60000});await page.getByRole('button',{name:'Quay về hồ đang sống'}).click();
  await page.getByRole('button',{name:'Chăm sóc',exact:true}).click();await expect(page.getByLabel('Chế độ chăm sóc')).toHaveValue('balanced');await page.getByLabel('Chế độ chăm sóc').selectOption('relaxed');await page.keyboard.press('Control+s');expect((await read(page)).clock.careMode).toBe('relaxed');expect(errors).toEqual([]);
});
test('one exclusive writer across tabs, with takeover after the owner closes',async({page,context})=>{
  await page.goto('/?quality=low');await page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();await page.keyboard.press('Control+s');
  const second=await context.newPage();await second.goto('/?quality=low');await expect(second.locator('.session-banner')).toBeVisible();
  await second.getByRole('button',{name:'Menu và cài đặt'}).click();await second.getByLabel('Tên hồ').fill('TAB KHÔNG ĐƯỢC GHI');await second.keyboard.press('Control+s');expect((await read(second)).name).not.toBe('TAB KHÔNG ĐƯỢC GHI');
  await page.close();await second.reload();await expect(second.locator('.session-cover')).toHaveCount(0);await expect(second.locator('.session-banner')).toHaveCount(0);
  await second.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();await second.getByRole('button',{name:'Menu và cài đặt'}).click();await second.getByLabel('Tên hồ').fill('Chủ mới');await second.getByRole('button',{name:'Lưu hồ',exact:true}).click();expect((await read(second)).name).toBe('Chủ mới');
});
test('schema-1 migration has no retroactive days and corrupt-primary recovery uses a checkpoint',async({page})=>{
  await page.goto('/?quality=low');await page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();await page.keyboard.press('Control+s');
  await page.addInitScript(k=>{if(sessionStorage.getItem('migration-fixture'))return;const w=JSON.parse(localStorage.getItem(k)!);w.version=1;delete w.clock;delete w.automation;localStorage.setItem(k,JSON.stringify(w));sessionStorage.setItem('migration-fixture','yes');},key);
  await page.reload();await expect(page.getByRole('button',{name:'Tiếp tục hồ đã lưu'})).toBeVisible();const migrated=await read(page);expect(migrated.version).toBe(2);expect(migrated.clock.careMode).toBe('balanced');expect(Date.now()-migrated.clock.lastSimulatedUtc).toBeLessThan(60000);
  await page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();await page.keyboard.press('Control+s');
  await page.addInitScript(k=>{if(sessionStorage.getItem('corrupt-fixture'))return;localStorage.setItem(k,'{broken');sessionStorage.setItem('corrupt-fixture','yes');},key);
  await page.reload();await expect(page.getByRole('button',{name:'Tiếp tục hồ đã lưu'})).toBeVisible();const recovered=await read(page);expect(recovered.name).toBe(migrated.name);expect(recovered.terrain).toEqual(migrated.terrain);
});
test('an active wall-clock jump is flagged while Living remains monotonic 1:1',async({page})=>{
  await page.goto('/?quality=low');await page.getByRole('button',{name:'Tạo hồ mới',exact:false}).click();await page.keyboard.press('Control+s');const before=await read(page);
  await page.evaluate(()=>{const original=Date.now;Date.now=()=>original()+90*86400000;});
  await page.waitForTimeout(1800);await page.keyboard.press('Control+s');const after=await read(page);expect(after.clock.wallClockReview).toBe(true);expect(after.seconds-before.seconds).toBeLessThan(20);expect(after.clock.lastSimulatedUtc-before.clock.lastSimulatedUtc).toBeLessThan(20000);await expect(page.locator('.clock-warning')).toBeVisible();
});
