import { modelPreview } from './model-previews.mjs';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile,writeFile,mkdir,access,unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const sourceFiles=['src/data/modelAssets.ts','src/data/m1-budgets.json','public/models/m1/manifest.json','scripts/model-previews.mjs','src/data/catalog.ts','src/data/forms.ts','src/data/biology.ts','src/game/types.ts','src/game/assets/previewFactory.ts','src/game/assets/surfaces.ts','src/game/assets/fishGeometry.ts','src/game/plants/layout.ts','src/game/plants/morphology.ts','src/game/terrain/heightfield.ts','scripts/generate-previews.mjs'];
const hash=createHash('sha256');for(const file of sourceFiles)hash.update(file).update(await readFile(file));const sourceHash=hash.digest('hex');
try{const previous=JSON.parse(await readFile('public/asset-registry.json','utf8'));if(!process.argv.includes('--force')&&previous.sourceHash===sourceHash){await Promise.all(previous.assets.flatMap(asset=>Array.from({length:asset.variants},(_,i)=>access(`public/previews/${asset.id}-${i}.webp`))));console.log(`Asset registry/previews current: ${previous.assets.length} assets.`);process.exit(0);}}catch{/* First build or changed source: regenerate. */}
const server=await createServer({configFile:false,cacheDir:join(tmpdir(),'aquascape-preview-vite-cache'),optimizeDeps:{noDiscovery:true,include:[]},server:{host:'127.0.0.1',port:5191,strictPort:true},appType:'custom'});let browser;
try{
  server.middlewares.use((req,res,next)=>{if(req.url==='/__model-preview'){res.setHeader('Content-Type','text/html');res.end('<canvas width="128" height="112"></canvas>');}else next();});await server.listen();
  const {catalog,previewTriangles}=await server.ssrLoadModule('/src/game/assets/previewFactory.ts');
  const executablePath=process.env.CHROMIUM_PATH??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':existsSync('/usr/bin/google-chrome')?'/usr/bin/google-chrome':undefined);
  browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage();await page.goto('http://127.0.0.1:5191/__model-preview');await mkdir('public/previews',{recursive:true});
  let previews=0;const exported=[];
  for(const asset of catalog){let triangles=0;
    for(let variant=0;variant<asset.variants;variant++){
      const faces=previewTriangles(asset,variant);if(!variant)triangles=faces.length;
      const data=asset.modelSpec?await modelPreview(page,asset,variant):await page.evaluate(({faces})=>{const canvas=document.querySelector('canvas'),c=canvas.getContext('2d');c.clearRect(0,0,128,112);const glow=c.createRadialGradient(64,59,3,64,59,66);glow.addColorStop(0,'#b6c99b20');glow.addColorStop(1,'#b6c99b00');c.fillStyle=glow;c.fillRect(0,0,128,112);c.fillStyle='#00000028';c.beginPath();c.ellipse(64,100,40,5,0,0,Math.PI*2);c.fill();for(const face of faces){c.fillStyle=face.color;c.beginPath();face.points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}return canvas.toDataURL('image/webp',.88).split(',')[1];},{faces});
      await writeFile(`public/previews/${asset.id}-${variant}.webp`,Buffer.from(data,'base64'));previews++;await unlink(`public/previews/${asset.id}-${variant}.png`).catch(error=>{if(error.code!=='ENOENT')throw error;});
    }
    exported.push({...asset,performance:{...asset.performance,...(!asset.modelSpec?{previewTriangles:triangles}:{}),trianglesAreBudget:!asset.modelSpec,previewSource:asset.modelSpec?'actual GLB WebGL render':'procedural fallback triangle projection'}});
  }
  await writeFile('public/asset-registry.json',JSON.stringify({version:1,sourceHash,license:'M1 authored GLB assets CC0-1.0; remaining assets original procedural fallback. See ASSET_LICENSES.md.',assets:exported},null,2)+'\n');console.log(`Generated ${previews} local model previews for ${catalog.length} registry assets.`);
}finally{await browser?.close();await server.close();}
