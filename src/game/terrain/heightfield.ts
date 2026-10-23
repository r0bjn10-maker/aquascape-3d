export const COLS=65, ROWS=33, WIDTH=6, DEPTH=3, HEIGHT=3.6;
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function makeTerrain(flat=false) {
  return Array.from({length:COLS*ROWS},(_,i)=>{
    const x=(i%COLS)/(COLS-1)*6-3,z=Math.floor(i/COLS)/(ROWS-1)*3-1.5;
    return flat?.16:clamp(.2+.22*(1.5-z)/3+.23*Math.exp(-((x+1.4)**2+(z+.4)**2)*1.3)+.15*Math.exp(-((x-1.6)**2+(z+.8)**2)*2),.1,1.2);
  });
}
export function heightAt(terrain:number[],x:number,z:number) {
  const u=clamp((x+3)/6*(COLS-1),0,COLS-1),v=clamp((z+1.5)/3*(ROWS-1),0,ROWS-1);
  const a=Math.floor(u),b=Math.floor(v),c=Math.min(a+1,COLS-1),d=Math.min(b+1,ROWS-1),tx=u-a,tz=v-b;
  return (terrain[b*COLS+a]*(1-tx)+terrain[b*COLS+c]*tx)*(1-tz)+(terrain[d*COLS+a]*(1-tx)+terrain[d*COLS+c]*tx)*tz;
}
export function brush(terrain:number[],x:number,z:number,radius:number,tool:'raise'|'lower'|'smooth',strength=.045) {
  return terrain.map((h,i)=>{
    const px=(i%COLS)/(COLS-1)*6-3,pz=Math.floor(i/COLS)/(ROWS-1)*3-1.5,d=Math.hypot(px-x,pz-z);
    if(d>radius)return h;
    const weight=(1-d/radius)**2;
    if(tool!=='smooth')return clamp(h+strength*weight*(tool==='raise'?1:-1),.1,1.2);
    const col=i%COLS,row=Math.floor(i/COLS),near=[terrain[row*COLS+Math.max(0,col-1)],terrain[row*COLS+Math.min(COLS-1,col+1)],terrain[Math.max(0,row-1)*COLS+col],terrain[Math.min(ROWS-1,row+1)*COLS+col]];
    return clamp(h+(near.reduce((a,b)=>a+b,0)/4-h)*weight*.65,.1,1.2);
  });
}
export function perimeter(terrain:number[]){
  const indices:number[]=[];
  for(let x=0;x<COLS;x++)indices.push(x);
  for(let z=1;z<ROWS;z++)indices.push(z*COLS+COLS-1);
  for(let x=COLS-2;x>=0;x--)indices.push((ROWS-1)*COLS+x);
  for(let z=ROWS-2;z>0;z--)indices.push(z*COLS);
  return indices.map(i=>[(i%COLS)/(COLS-1)*6-3,terrain[i],Math.floor(i/COLS)/(ROWS-1)*3-1.5] as [number,number,number]);
}
