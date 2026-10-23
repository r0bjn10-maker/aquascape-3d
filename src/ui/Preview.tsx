import { useState,useEffect } from 'react';
import type { AssetDef } from '../game/types';
function FallbackPreview({asset:a}:{asset:AssetDef}){
  return <svg className="asset-preview" viewBox="0 0 100 76" aria-hidden="true">
    <defs><radialGradient id={'glow-'+a.id}><stop stopColor={a.color} stopOpacity=".15"/><stop offset="1" stopColor={a.color} stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="50" cy="42" rx="47" ry="35" fill={`url(#glow-${a.id})`}/><ellipse cx="50" cy="64" rx="26" ry="4" fill="#000" opacity=".18"/>
    {a.category==='plants'?Array.from({length:a.id==='rotala'?8:6},(_,i)=><g key={i} transform={`rotate(${(i-2.5)*16} 50 64)`}><path d={`M50 64 Q${32+i*3} ${29+i%3*4} ${42+i*2} ${13+i%3*9}`} stroke={a.color} fill="none" strokeWidth={a.id==='vallis'?3:1}/><path d={a.id==='vallis'?`M50 64 Q30 18 48 10 Q38 28 50 64`:`M49 53 Q${23+i} ${24+i*2} 45 ${15+i%3*8} Q${69-i} ${23+i*2} 49 53`} fill={a.color} opacity={.65+i*.06}/></g>):a.category==='rocks'?<g><path d="m24 59 4-25 16-17 23 7 13 23-5 16-28 3Z" fill={a.color}/><path d="m44 17 7 25 29 5-13-23Z" fill="#fff" opacity=".15"/><path d="m51 42-23-8-4 25 23 7Z" fill="#000" opacity=".2"/><path d="m32 44 19-2 10 16m-10-16 4-12" fill="none" stroke="#fff" opacity=".17" strokeWidth="2"/></g>:a.category==='wood'?<g stroke={a.color} strokeLinecap="round" fill="none"><path d="M24 64Q62 41 71 15M43 50Q28 36 34 19M53 40Q69 43 83 32" strokeWidth="7"/><path d="M39 55 18 46M64 28 83 15" strokeWidth="4"/></g>:a.category==='fish'?a.id==='shrimp'?<g stroke={a.color} fill="none" strokeWidth="3"><path d="M20 49Q49 19 71 47L84 49M33 43l-6 16m17-21-2 22m12-20 5 18M69 43 81 27"/><path d="M72 38 91 20" strokeWidth="1"/></g>:<g><path d="m22 36 13 7-11 12 1-19m10 7q24-31 48 1-24 28-48-1" fill={a.color}/><path d="m39 43 31-4" stroke={a.id==='neon'?'#99eff1':'#f9c788'} strokeWidth="3"/><circle cx="74" cy="41" r="2" fill="#132522"/></g>:<g stroke={a.color} fill="none" strokeWidth="4"><rect x="34" y="27" width="34" height="34" rx="5"/><path d="M42 27V16h27v16M34 42H23v14"/><path d="M44 39h14m-14 9h14" strokeWidth="2"/></g>}
  </svg>;
}

export function Preview({asset,variant=0}:{asset:AssetDef;variant?:number}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[asset.id,variant]);
  if(failed)return <FallbackPreview asset={asset}/>;
  const source=asset.preview.replace('-0.webp',`-${variant%asset.variants}.webp`);
  return <img className="asset-preview" src={import.meta.env.BASE_URL+source} alt="" aria-hidden="true" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>;
}
