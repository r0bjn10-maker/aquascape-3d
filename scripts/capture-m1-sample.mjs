import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/?quality=low');await page.getByRole('button',{name:'Khám phá hồ mẫu',exact:false}).click();await page.waitForTimeout(5000);
 for(const [view,name] of [['front','Mặt trước'],['perspective','Phối cảnh'],['top','Từ trên']]){await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(2200);await page.screenshot({path:`qa/m1/sample-after-${view}.png`,timeout:60000});}
 const samples=[];for(let i=0;i<4;i++){await page.waitForTimeout(1300);samples.push(await page.getByTestId('performance').textContent());}
 await writeFile('qa/m1/sample-after.json',JSON.stringify({scene:'unchanged createWorld sample',quality:'low',viewport:[1440,1000],samples,errors,hardware:'Chromium SwiftShader; software only, not desktop/mobile GPU FPS'},null,2));if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}
