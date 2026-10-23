import * as THREE from 'three';
import { mergeGeometries,mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function normalizeBounds(g:THREE.BufferGeometry,radius:number){
  const p=g.attributes.position;g.computeBoundingBox();const min=g.boundingBox!.min.y,height=Math.max(.001,g.boundingBox!.max.y-min);
  let r=.001;for(let i=0;i<p.count;i++)r=Math.max(r,Math.hypot(p.getX(i),p.getZ(i)));
  for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*radius/r,(p.getY(i)-min)/height,p.getZ(i)*radius/r);
  g.computeVertexNormals();g.computeBoundingBox();return g;
}
export function rockGeometry(id:string) {
  const geo=new THREE.IcosahedronGeometry(1,id==='river'?4:3),pos=geo.attributes.position;
  const colors=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const n=1+.1*Math.sin(x*19+z*11)*Math.cos(y*15)+.08*Math.sin(y*25+x*7);
    pos.setXYZ(i,x*n*.6,(y*n+1.17)*.5,z*n*.5);
    const shade=.65+.25*(y+1)/2+.14*Math.sin(y*18+x*9+z*7)**8;
    colors.push(shade,shade,shade);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.deleteAttribute('normal');geo.deleteAttribute('uv');const merged=mergeVertices(geo,.0001);geo.dispose();return normalizeBounds(merged,.55);
}
export function woodGeometry(id:string) {
  const geos:THREE.BufferGeometry[]=[];
  const branches=id==='spider'?8:id==='root'?7:5;
  for(let i=0;i<branches;i++){
    const a=i*2.399,root=id==='root',long=id==='branch';
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,.04,0),new THREE.Vector3(Math.cos(a)*.25,.22,Math.sin(a)*.2),
      new THREE.Vector3(Math.cos(a)*.6,root?.22:.5+i*.06,Math.sin(a)*.35),
      new THREE.Vector3(Math.cos(a)*(long?1.25:.8),root?.1:.55+i*.13,Math.sin(a)*.65),
    ]);
    const g=new THREE.TubeGeometry(curve,18,.065-(i%3)*.014,7,false),p=g.attributes.position;
    for(let j=0;j<p.count;j++){
      const k=1-.7*Math.floor(j/8)/18;
      const center=curve.getPointAt(Math.min(1,Math.floor(j/8)/18));
      p.setXYZ(j,center.x+(p.getX(j)-center.x)*k,center.y+(p.getY(j)-center.y)*k,center.z+(p.getZ(j)-center.z)*k);
    }
    g.computeVertexNormals();geos.push(g);
  }
  const merged=mergeGeometries(geos);geos.forEach(g=>g.dispose());return normalizeBounds(merged,1.15);
}
export function leafGeometry(id:string){
  const positions=[],uv=[],indices=[],rows=10;
  const narrow=id==='vallis',small=id==='monte'||id==='moss';
  for(let j=0;j<=rows;j++)for(let k=0;k<3;k++){
    const t=j/rows,s=k-1,w=Math.sin(Math.PI*t)**(narrow?.45:.8)*(narrow?.045:small?.13:.19);
    positions.push(s*w,t,Math.sin(t*Math.PI)*.13+s*s*.03*Math.sin(t*Math.PI));uv.push(k/2,t);
  }
  for(let j=0;j<rows;j++)for(let k=0;k<2;k++){
    const a=j*3+k;indices.push(a,a+1,a+3,a+1,a+4,a+3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function fishGeometry(){
  const points=[];
  for(let i=0;i<=20;i++){
    const t=i/20;points.push(new THREE.Vector2(Math.sin(Math.PI*t)**.7*(.037+.012*t),t*.27-.135));
  }
  const g=new THREE.LatheGeometry(points,12);g.rotateZ(-Math.PI/2);return g;
}
export function finGeometry(){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([-.12,0,0,-.24,.075,0,-.21,0,0,-.24,-.075,0],3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return g;
}
export function gravelTexture(){
  const size=128,data=new Uint8Array(size*size*4);
  let seed=74;
  for(let i=0;i<size*size;i++){
    seed=(seed*1664525+1013904223)>>>0;const n=seed/4294967296;
    const c=205+n*50;data[i*4]=c;data[i*4+1]=c;data[i*4+2]=c;data[i*4+3]=255;
  }
  const tex=new THREE.DataTexture(data,size,size);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(16,8);tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
