import { test,expect } from '@playwright/test';

for(const viewport of [{width:844,height:390},{width:640,height:360},{width:1280,height:600},{width:390,height:844}]){
  test(`welcome, care and saving remain reachable at ${viewport.width}x${viewport.height}`,async({browser})=>{
    const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await page.goto('http://127.0.0.1:5173/?quality=low');
      const welcome=page.getByRole('region',{name:'Bắt đầu'});
      await expect(welcome).toBeVisible();
      const bounds=await welcome.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
      for(const name of ['Khám phá hồ mẫu','Tạo hồ mới','Tự do sáng tạo']){
        const button=page.getByRole('button',{name,exact:false});
        await button.scrollIntoViewIfNeeded();
        expect(await button.evaluate(element=>{
          const r=element.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
          return !!hit&&element.contains(hit)&&r.top>=0&&r.bottom<=innerHeight;
        })).toBe(true);
      }
      await page.getByRole('button',{name:'Khám phá hồ mẫu',exact:false}).tap();
      await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});
      await page.getByRole('button',{name:'Menu và cài đặt'}).tap();
      await page.getByRole('button',{name:'Lưu hồ',exact:true}).tap();
      const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!));
      await page.getByRole('button',{name:'Chăm sóc',exact:true}).tap();
      const care=page.getByRole('complementary',{name:'Cửa hàng'}),panel=await care.boundingBox();
      expect(panel!.height).toBeGreaterThan(80);
      expect(panel!.y).toBeGreaterThanOrEqual(0);
      expect(panel!.y+panel!.height).toBeLessThanOrEqual(viewport.height);
      await page.getByRole('button',{name:'Cho ăn',exact:false}).tap();
      await page.getByRole('button',{name:'Đóng cửa hàng'}).tap();
      await page.getByRole('button',{name:'Menu và cài đặt'}).tap();
      await page.getByRole('button',{name:'Lưu hồ',exact:true}).tap();
      const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')!));
      expect(after.water.waste).toBeGreaterThan(before.water.waste);
      expect(after.animals[0].hunger).toBeLessThan(before.animals[0].hunger);
      await page.reload();
      await page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).tap();
      await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});
      expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
      await page.screenshot({path:`qa/qc/fixed-${viewport.width}x${viewport.height}.png`,timeout:60000});
      expect(errors).toEqual([]);
    }finally{await context.close();}
  });
}
