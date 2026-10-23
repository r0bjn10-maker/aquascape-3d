import { test,expect } from '@playwright/test';
test.use({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,deviceScaleFactor:1});
test('tablet touch can place a plant from the top camera',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?quality=low');await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});
  await page.getByRole('button',{name:'Tạo hồ mới',exact:false}).tap();await page.getByRole('button',{name:'Từ trên',exact:true}).tap();await page.waitForTimeout(1400);
  await page.getByRole('button',{name:'Cây',exact:true}).tap();await page.getByTestId('buy-monte').tap();
  const b=(await page.locator('canvas').boundingBox())!;await page.touchscreen.tap(b.x+b.width*.55,b.y+b.height*.58);
  await page.getByRole('button',{name:'Menu và cài đặt'}).tap();await page.getByRole('button',{name:'Lưu hồ',exact:true}).tap();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!).objects.length)).toBe(1);
  await page.screenshot({path:'qa/tablet-touch.png',timeout:60000});expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
