export interface CloudConfig {url:string;key:string}
export const CLOUD_CONFIG_KEY='aquascape-cloud-config-v1';
export function validateConfig(config:CloudConfig):CloudConfig {
  const url=new URL(config.url.trim());if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Project URL chỉ gồm giao thức và tên miền.');
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Supabase cần HTTPS (localhost được phép khi phát triển).');
  const key=config.key.trim();let anon=false;
  if(key.startsWith('sb_publishable_'))anon=key.length>20;
  else{try{const part=key.split('.')[1].replaceAll('-','+').replaceAll('_','/');anon=JSON.parse(atob(part)).role==='anon';}catch{/* Reject malformed or private keys. */}}
  if(!anon||key.startsWith('sb_secret_'))throw Error('Chỉ dùng publishable key hoặc anon key. Không nhập service-role/secret key.');
  return {url:url.origin,key};
}
export function readConfig():CloudConfig|null {
  try{const env=(import.meta as ImportMeta&{env:Record<string,string|undefined>}).env as Record<string,string|undefined>,url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;if(url&&key)return validateConfig({url,key});const local=localStorage.getItem(CLOUD_CONFIG_KEY);return local?validateConfig(JSON.parse(local)):null;}catch{return null;}
}
