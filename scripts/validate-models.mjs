import validator from 'gltf-validator';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
const manifest=JSON.parse(await readFile('public/models/m1/manifest.json','utf8')),results=[];
for(const a of manifest.assets){const path=join('public',a.file),result=await validator.validateBytes(new Uint8Array(await readFile(path)),{uri:path,externalResourceFunction:async uri=>new Uint8Array(await readFile(join(dirname(path),decodeURIComponent(uri))))});results.push({file:a.file,errors:result.issues.numErrors,warnings:result.issues.numWarnings,messages:result.issues.messages});}
await writeFile('qa/m1/gltf-validation.json',JSON.stringify({validator:'Khronos glTF Validator',results},null,2));
console.log('GLB validation:',results.length,'models;',results.reduce((s,x)=>s+x.errors,0),'errors;',results.reduce((s,x)=>s+x.warnings,0),'warnings');
if(results.some(x=>x.errors))process.exitCode=1;
