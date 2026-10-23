import { test,expect } from '@playwright/test';
const key='aquascape-world-v1';
test('care, Creative-only acceleration, pause, Zen and invalid import retain the aquarium',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);
 const save=async()=>{const revision=(await read())?.clock.revision??-1;await page.keyboard.press('Control+s');await expect.poll(async()=>(await read())?.clock.revision??-1).toBeGreaterThan(revision);};
 await page.goto('/?quality=low');await page.getByRole('button',{name:'Khám phá hồ mẫu',exact:false}).click();await save();
 const initial=await read();
 await expect(page.getByRole('button',{name:'×20',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Chăm sóc',exact:true}).click();await page.getByRole('button',{name:'Cho ăn',exact:false}).click();await save();const fed=await read();expect(fed.animals[0].hunger).toBeLessThan(initial.animals[0].hunger);expect(fed.water.waste).toBeGreaterThan(initial.water.waste);
 await page.getByRole('button',{name:'Thay 30% nước',exact:false}).click();await save();expect((await read()).water.waste).toBeLessThan(fed.water.waste);
 await page.getByRole('button',{name:'Menu và cài đặt'}).click();await page.getByLabel('Chế độ sáng tạo').check();await page.getByRole('button',{name:'Đóng menu'}).click();
 await save();const baseline=await read();await page.getByRole('button',{name:'×20',exact:true}).click();await page.waitForTimeout(3600);await save();const fast=await read();expect(fast.seconds-baseline.seconds).toBeGreaterThan(30);expect(fast.mode).toBe('creative');
 await page.getByRole('button',{name:'Tạm dừng',exact:true}).click();await save();const paused=await read();await page.waitForTimeout(1300);await save();expect((await read()).seconds).toBe(paused.seconds);
 await page.screenshot({path:'qa/v21-care.png',timeout:60000});await page.getByRole('button',{name:'Chế độ Zen',exact:true}).click();await page.getByRole('button',{name:'Camera chậm',exact:true}).click();await expect(page.getByRole('button',{name:'Camera cố định',exact:true})).toBeVisible();await page.getByRole('button',{name:'Thoát Zen',exact:true}).click();
 await page.getByRole('button',{name:'Menu và cài đặt'}).click();await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await expect(page.getByRole('status').filter({hasText:/JSON|Unexpected|property/i})).toBeVisible();await save();expect((await read()).objects.length).toBe(initial.objects.length);expect(errors).toEqual([]);
});
test('missing GLB falls back to procedural geometry without losing the aquarium',async({page})=>{
  await page.route('**/src/data/catalog.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nassets.seiryu.modelSpec=undefined;assets.seiryu.model="models/intentional-missing.glb";'});});
  const failed=page.waitForResponse(r=>r.url().includes('intentional-missing.glb'));
  await page.goto('/?quality=low');await failed;await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});
  await expect(page.getByText('Không thể khởi tạo WebGL.',{exact:false})).toHaveCount(0);await expect(page.getByRole('button',{name:'Khám phá hồ mẫu',exact:false})).toBeVisible();
});
