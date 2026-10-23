import * as THREE from 'three';
import { mergeGeometries,mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLANT_FORMS } from '../../data/forms';
const noise=(x:number,y:number,z=0)=>Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453%1;
export function normalizeBounds(g:THREE.BufferGeometry,radius:number){
  g.computeBoundingBox();const p=g.attributes.position,min=g.boundingBox!.min.y,h=Math.max(.001,g.boundingBox!.max.y-min);
  let r=.001;for(let i=0;i<p.count;i++)r=Math.max(r,Math.hypot(p.getX(i),p.getZ(i)));
  for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*radius/r,(p.getY(i)-min)/h,p.getZ(i)*radius/r);
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function rockGeometry(id:string,variant=0,detail=1,radius=.55){
  const river=id==='river',slate=id==='slate',v=variant+1;
  const geo=new THREE.IcosahedronGeometry(1,detail===0?2:3),p=geo.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const broad=Math.sin(x*(5+v)+z*4+v)*Math.cos(y*5+v*.7);
    const grain=Math.sin(x*29+v)*Math.cos(y*31+z*17);
    const amplitude=river?.025:id==='dragon'?.16:id==='lava'?.13:slate?.065:.075;
    const dents=id==='dragon'?-Math.pow(Math.max(0,Math.sin(x*13+v)*Math.sin(z*12+y*15)),4)*.23:0;
    const n=1+amplitude*broad+(river?.008:.035)*grain+dents;
    let yy=(y*n+1.2)*.5;
    if(slate)yy=(Math.round(yy*8)/8*.75+yy*.25)+.035*Math.sin(x*14+z*7);
    if(id==='seiryu')yy+=.10*Math.abs(x+z*.7)*Math.sin(x*7+v);
    const stoneX=id==='seiryu'?Math.sign(x)*Math.pow(Math.abs(x),.72):x;
    if(id==='seiryu')yy=Math.min(yy,.96+x*.16+z*.09);
    p.setXYZ(i,stoneX*n*(.72+v*.08),yy+(variant===1?x*.15:variant===2?-z*.11:0),z*n*(variant===1?.55:variant===2?.85:.65));
    const c=.78+(y+1)*.065+.045*grain;colors.push(c,c,c);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.deleteAttribute('normal');geo.deleteAttribute('uv');
  const joined=mergeVertices(geo,.0001);geo.dispose();return normalizeBounds(joined,radius);
}
export function woodGeometry(id:string,variant=0,detail=1,radius=1.15){
  const geos:THREE.BufferGeometry[]=[],v=variant*.7,segments=detail===0?12:20;
  const add=(points:THREE.Vector3[],width:number)=>{
    const curve=new THREE.CatmullRomCurve3(points),g=new THREE.TubeGeometry(curve,segments,width,detail===2?9:6,false),p=g.attributes.position,radial=detail===2?10:7;
    for(let j=0;j<p.count;j++){
      const t=Math.floor(j/radial)/segments,c=curve.getPointAt(Math.min(1,t)),taper=1-.86*t;
      const ripple=1+.08*Math.sin(t*74+j*2.1);
      p.setXYZ(j,c.x+(p.getX(j)-c.x)*taper*ripple,c.y+(p.getY(j)-c.y)*taper*ripple,c.z+(p.getZ(j)-c.z)*taper*ripple);
    }
    g.computeVertexNormals();geos.push(g);
  };
  const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  if(id==='arch'){
    add([V(-1.1,0,-.1),V(-.8,.75,.12+v*.1),V(.02,1.3,.1),V(.8,.9,-.2),V(1.05,.08,.05)],.14);
    for(let i=0;i<5+variant;i++)add([V((i-2)*.4,.5+Math.sin(i)*.3,0),V((i-2)*.5,.4,Math.cos(i+v)*.4),V((i-2)*.6,.05,Math.cos(i+v)*.75)],.05);
  }else if(id==='twisted'){
    add([V(0,0,0),V(.25,.4,-.1),V(-.18,.85,.12),V(.28,1.4,.05),V(.5,1.7,-.1)],.18);
    for(let i=0;i<6+variant;i++){const a=i*2.399+v;add([V(Math.sin(i)*.1,.25+i*.19,0),V(Math.cos(a)*.5,.5+i*.21,Math.sin(a)*.35),V(Math.cos(a)*.9,.65+i*.24,Math.sin(a)*.7)],.055);}
  }else if(id==='root'){
    add([V(0,0,0),V(.08,.45,.03),V(-.12,.8,.1),V(.12,1.05,-.05)],.26);
    for(let i=0;i<8+variant;i++){const a=i*2.399+v;add([V(0,.45,0),V(Math.cos(a)*.3,.24,Math.sin(a)*.3),V(Math.cos(a)*.7,.10,Math.sin(a)*.65),V(Math.cos(a)*(1+i%2*.2),0,Math.sin(a))],.085);}
  }else if(id==='branch'){
    add([V(-1.15,.05,.1),V(-.4,.22,-.1),V(.5,.35,.12),V(1.25,.58,-.08)],.14);
    for(let i=0;i<6+variant;i++){const a=i*2.1+v;add([V(-.75+i*.3,.2+i*.06,0),V(-.6+i*.31,.35+(i%2)*.25,Math.sin(a)*.3),V(-.3+i*.34,.5+(i%3)*.21,Math.sin(a)*.6)],.055);}
  }else{
    for(let i=0;i<9-variant;i++){const a=i*2.399+v;add([V(0,.04,0),V(Math.cos(a)*.23,.23,Math.sin(a)*.2),V(Math.cos(a)*.6,.45+i*.07,Math.sin(a)*.38),V(Math.cos(a)*(1+(i%3)*.08),.4+i*.13,Math.sin(a)*.8)],.075-(i%3)*.014);}
  }
  const merged=mergeGeometries(geos);geos.forEach(g=>g.dispose());return normalizeBounds(merged,radius);
}
export function leafGeometry(id:string,detail=1){
  const f=PLANT_FORMS[id]??PLANT_FORMS.monte,positions:number[]=[],uv:number[]=[],indices:number[]=[];
  if(f.habit==='moss'){
    const quad=(x1:number,y1:number,x2:number,y2:number,width:number)=>{const n=positions.length/3;positions.push(x1-width,y1,0,x1+width,y1,0,x2,y2,Math.sin(y2*3)*.025);uv.push(0,y1,1,y1,.5,y2);indices.push(n,n+1,n+2);};
    quad(0,0,0,1,.009);
    for(let i=1;i<8;i++){const y=i/8,w=f.leaf==='christmas-moss'?f.width*(1-y)*.8:f.width*(.3+.3*Math.sin(i*2)**2);for(const sign of [-1,1]){quad(0,y,sign*w,y+.14,.012);if(f.leaf==='christmas-moss')quad(sign*w*.45,y+.07,sign*w*.9,y+.13,.007);}}
  }else{
    const rows=detail===0?6:10;
    for(let j=0;j<=rows;j++)for(let k=0;k<3;k++){
      const t=j/rows,s=k-1,strap=f.leaf==='strap'||f.leaf==='needle';
      const shape=strap?Math.pow(Math.sin(Math.PI*t),.3):f.leaf==='round'?Math.pow(Math.sin(Math.PI*t),.65):f.leaf==='oval'?Math.pow(Math.sin(Math.PI*t),.9):Math.pow(Math.sin(Math.PI*t),1.25);
      const edge=f.leaf==='crypt'?1+.13*Math.sin(t*44):f.leaf==='fern'?1+.14*Math.sin(t*33)*(t>.5?1:.35):1;
      positions.push(s*f.width*shape*edge,t,Math.sin(t*Math.PI)*f.bend+s*s*.045*Math.sin(t*Math.PI)+(f.leaf==='crypt'?.02*Math.sin(t*40):0));uv.push(k/2,t);
    }
    for(let j=0;j<rows;j++)for(let k=0;k<2;k++){const a=j*3+k;indices.push(a,a+1,a+3,a+1,a+4,a+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g;
}
export function substrateTextures(kind:'sand'|'soil'){
  const size=128,height=new Float32Array(size*size),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),cells=kind==='soil'?10:18;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const gx=x/size*cells,gy=y/size*cells;let nearest=9,seed=0;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const cx=Math.floor(gx)+a,cy=Math.floor(gy)+b,px=cx+.5+noise(cx,cy)*.28,py=cy+.5+noise(cy,cx,2)*.28,d=Math.hypot(gx-px,gy-py);if(d<nearest){nearest=d;seed=noise(cx,cy,3);}}
    const i=y*size+x,h=Math.max(0,1-nearest*(kind==='soil'?1.8:1.5)),tone=(kind==='soil'?.62:.8)+h*.16+seed*.06;
    height[i]=h;color.set([tone*255,tone*251,tone*240,255],i*4);const r=205+noise(x,y)*25;rough.set([r,r,r,255],i*4);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,slope=kind==='soil'?1.2:.65,dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*slope,dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*slope,n=new THREE.Vector3(-dx,-dy,1).normalize();normal.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],i*4);}
  const texture=(data:Uint8Array,srgb=false)=>{const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='soil'?14:20,kind==='soil'?7:10);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t;};
  return {map:texture(color,true),normalMap:texture(normal),roughnessMap:texture(rough)};
}
