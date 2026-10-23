import { chromium,expect } from '@playwright/test';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const url=process.env.AQUASCAPE_QC_URL??'https://r0bjn10-maker.github.io/aquascape-3d/';
const output=resolve(process.env.AQUASCAPE_QC_OUTPUT??'qa/qc/post-public');
await mkdir(output,{recursive:true});
const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,...(proxy?{proxy:{server:proxy,bypass:'127.0.0.1,localhost'}}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const cases=[['phone',390,844],['small-phone',360,640],['landscape',844,390],['small-landscape',640,360],['desktop',1280,900]];
const results=[];
const hash=data=>createHash('sha256').update(data).digest('hex');
try{
  for(const [name,width,height] of cases){
    const context=await browser.newContext({viewport:{width,height},isMobile:width<1000,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block',ignoreHTTPSErrors:false});
    const requests=[],errors=[],checks=[];
    // Node trusts the platform CA via NODE_EXTRA_CA_CERTS; Chromium's NSS store
    // does not. All public responses still use verified TLS and the session proxy.
    await context.route(`${new URL(url).origin}/**`,async route=>{
      const response=await route.fetch();requests.push({url:response.url(),status:response.status()});
      await route.fulfill({response});
    });
    const page=await context.newPage(),result={name,width,height,checks,errors,requests};
    page.on('pageerror',error=>errors.push(error.message));
    try{
      const response=await page.goto(`${url}?quality=low`,{waitUntil:'domcontentloaded',timeout:60000});
      expect(response.status()).toBe(200);
      expect(hash(await response.body())).toBe(hash(await readFile('dist/index.html')));
      checks.push('deployed HTML matches local build');
      const welcome=page.getByRole('region',{name:'Bắt đầu'});
      await expect(welcome).toBeVisible();
      const box=await welcome.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(height);
      expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.getByRole('button',{name:'Khám phá hồ mẫu',exact:false}).tap({timeout:15000});
      await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});
      checks.push('welcome reachable and WebGL renders');
      const save=async()=>{await page.getByRole('button',{name:'Menu và cài đặt'}).tap();await page.getByRole('button',{name:'Lưu hồ',exact:true}).tap();await expect(page.getByRole('dialog',{name:'Menu hồ'})).toHaveCount(0);return page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')));};
      const before=await save();expect(before.objects.length).toBeGreaterThan(0);
      await page.getByRole('button',{name:'Chăm sóc',exact:true}).tap();
      await page.getByRole('button',{name:'Cho ăn',exact:false}).tap();
      await page.getByRole('button',{name:'Đóng cửa hàng'}).tap();
      const after=await save();expect(after.water.waste).toBeGreaterThan(before.water.waste);expect(after.animals[0].hunger).toBeLessThan(before.animals[0].hunger);
      checks.push('care actions update the saved aquarium');
      await page.getByRole('button',{name:'Menu và cài đặt'}).tap();
      const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất save JSON',exact:true}).tap();
      const download=await downloaded,exportPath=resolve(output,`${name}-export.json`);await download.saveAs(exportPath);
      const exported=JSON.parse(await readFile(exportPath,'utf8'));expect(exported.objects.map(object=>object.id)).toEqual(after.objects.map(object=>object.id));
      await page.locator('input[type=file]').setInputFiles(exportPath);
      await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Tiếp tục hồ đã lưu'}).tap({timeout:30000});
      const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquascape-world-v1')));
      expect(restored.objects.map(object=>object.id)).toEqual(after.objects.map(object=>object.id));
      await expect(page.getByTestId('performance')).not.toHaveText(/^0 fps/,{timeout:60000});
      checks.push('JSON export/import and reload preserve the layout');
      expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(errors).toEqual([]);expect(requests.filter(request=>request.status>=400)).toEqual([]);
      await page.screenshot({path:resolve(output,`${name}.png`),timeout:60000});result.passed=true;
    }catch(error){result.passed=false;result.failure=String(error).slice(0,2200);await page.screenshot({path:resolve(output,`${name}-failure.png`),timeout:30000}).catch(()=>{});}
    finally{await context.unrouteAll({behavior:'wait'});await context.close();}
    results.push(result);console.log(JSON.stringify({name,passed:result.passed,checks,failure:result.failure}));
  }
}finally{
  await browser.close();
  await writeFile(resolve(output,'results.json'),JSON.stringify({url,verifiedUtc:new Date().toISOString(),transport:'TLS-verified Playwright route.fetch; platform CA trusted by Node. Service workers blocked; no physical-device or live PWA claim.',results},null,2)+'\n');
}
if(results.length!==cases.length||results.some(result=>!result.passed))process.exitCode=1;
