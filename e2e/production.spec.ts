import { test,expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
test.use({baseURL:'http://127.0.0.1:4173/aquascape-3d/'});
test('production repository subpath, PWA offline reload and measured rendering',async({page,context})=>{
  test.skip(!process.env.AQUASCAPE_PRODUCTION,'Run explicitly against the built preview server.');
  const errors:string[]=[],bad:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  await page.goto('./?quality=low');await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.getByRole('button',{name:'Khám phá hồ mẫu',exact:false}).click();await page.keyboard.press('Control+s');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!));
  await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('button',{name:'Tiếp tục hồ đã lưu'})).toBeVisible();await page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).click();await page.keyboard.press('Control+s');
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!));expect(after.terrain).toEqual(before.terrain);expect(after.objects.map((o:{id:string})=>o.id)).toEqual(before.objects.map((o:{id:string})=>o.id));
  await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});
  const samples=[];for(let i=0;i<4;i++){await page.waitForTimeout(2100);samples.push(await page.getByTestId('performance').innerText());}
  const platform=await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl2')!,ext=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'};});
  await writeFile('qa/performance.json',JSON.stringify({quality:'low',platform,samples,note:'Cloud software rendering only; no physical-device FPS claim.'},null,2));
  await page.screenshot({path:'qa/production-aquarium.png',timeout:60000});expect(errors).toEqual([]);expect(bad).toEqual([]);
});
