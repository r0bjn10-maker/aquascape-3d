import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FISH_FORMS } from '../../data/forms';
const finish=(g:THREE.BufferGeometry,color:THREE.ColorRepresentation)=>{
  const result=g.index?g.toNonIndexed():g;
  if(result!==g)g.dispose();
  if(!result.getAttribute('normal'))result.computeVertexNormals();
  if(!result.getAttribute('uv'))result.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(result.attributes.position.count*2),2));
  if(!result.getAttribute('color')){const c=new THREE.Color(color),values=[];for(let i=0;i<result.attributes.position.count;i++)values.push(c.r,c.g,c.b);result.setAttribute('color',new THREE.Float32BufferAttribute(values,3));}
  return result;
};
const sphere=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string)=>{const g=new THREE.SphereGeometry(1,10,7);g.scale(sx,sy,sz);g.translate(x,y,z);return finish(g,color);};
function fin(points:number[][],color:string){
  const p=points.flat(),indices=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return finish(g,color);
}
function tube(points:THREE.Vector3[],radius:number,color:string){return finish(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),10,radius,4,false),color);}
export function createFishGeometry(id:string,detail=1){
  const f=FISH_FORMS[id]??FISH_FORMS.neon,parts:THREE.BufferGeometry[]=[],bodyPositions:number[]=[],bodyColors:number[]=[],indices:number[]=[],uv:number[]=[];
  const rings=detail===0?14:22,sides=detail===0?10:16;
  if(id==='shrimp'){
    for(let i=0;i<7;i++){const t=i/6;parts.push(sphere(.25-t*.5,.035+Math.sin(t*Math.PI)*.065,0,.07,.065*(1-t*.45),.065*(1-t*.35),i%2?f.color:f.accent));}
    for(let i=0;i<5;i++)for(const side of [-1,1])parts.push(tube([new THREE.Vector3(.15-i*.08,.02,side*.035),new THREE.Vector3(.12-i*.08,-.06,side*.09),new THREE.Vector3(.08-i*.08,-.075,side*.13)],.006,f.accent));
    for(const side of [-1,1]){parts.push(sphere(.29,.09,side*.04,.014,.014,.014,'#12191b'));parts.push(tube([new THREE.Vector3(.3,.08,side*.025),new THREE.Vector3(.48,.14,side*.13),new THREE.Vector3(.62,.12,side*.19)],.0035,f.accent));}
  }else{
    for(let i=0;i<=rings;i++){
      const u=i/rings,x=-.28+u*.73,profile=Math.pow(Math.sin(Math.PI*u),.45+f.snout*.35),back=Math.min(1,u*6+.1),head=u>.8?1-(u-.8)*1.5:1;
      for(let j=0;j<=sides;j++){
        const a=j/sides*Math.PI*2,ny=Math.cos(a),nz=Math.sin(a),h=f.body[0]*profile*back*head,w=f.body[1]*profile;
        let y=ny*h;if(id==='cory'&&y<0)y*=.55;
        bodyPositions.push(x,y,nz*w);uv.push(u,j/sides);
        const c=new THREE.Color(f.color).multiplyScalar(.82+(ny+1)*.13),accent=new THREE.Color(f.accent),flank=Math.abs(nz)>.62;
        if(flank){
          if((id==='neon'||id==='cardinal')&&Math.abs(ny)<.21)c.copy(accent);
          else if(id==='neon'&&ny<-.20&&u<.58)c.set('#c94f41');
          else if(id==='cardinal'&&ny<-.20)c.set('#d84d42');
          else if(id==='rummy'&&u>.73)c.copy(accent);
          else if(id==='harlequin'&&u>.2&&u<.65&&Math.abs(ny)<(.65-u)*2.8)c.copy(accent);
          else if((id==='chili'||id==='oto')&&Math.abs(ny)<.27)c.copy(accent);
          else if(id==='cory'&&Math.sin(u*48)*Math.sin(a*5)>.28)c.copy(accent);
          else if(id==='guppy'&&u<.55&&Math.sin(u*54+a*3)>.65)c.copy(accent);
        }
        bodyColors.push(c.r,c.g,c.b);
        if(i<rings&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
      }
    }
    const body=new THREE.BufferGeometry();body.setAttribute('position',new THREE.Float32BufferAttribute(bodyPositions,3));body.setAttribute('color',new THREE.Float32BufferAttribute(bodyColors,3));body.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));body.setIndex(indices);body.computeVertexNormals();parts.push(finish(body,f.color));
    // Independent head details, dorsal/anal/pectoral fins and species-specific mouth/barbels.
    for(const side of [-1,1]){parts.push(sphere(.31,.028,side*f.body[1]*.78,.026,.026,.015,'#d5bb73'));parts.push(sphere(.32,.03,side*(f.body[1]*.78+.01),.019,.019,.009,'#111b1e'));parts.push(fin([[.08,-.025,side*.03],[-.10,-.075,side*(f.body[1]+.07)],[.16,-.045,side*(f.body[1]+.025)]],f.accent));}
    parts.push(fin([[-.15,f.body[0]*.6,0],[-.13,f.body[0]+f.dorsal,0],[.11,f.body[0]*1.1,0],[.18,f.body[0]*.55,0]],f.accent));
    parts.push(fin([[-.18,-f.body[0]*.5,0],[-.20,-f.body[0]-f.ventral,0],[.08,-f.body[0]*.9,0],[.12,-f.body[0]*.5,0]],f.accent));
    if(id==='betta')for(const side of [-1,1])parts.push(fin([[.12,-.08,side*.02],[.09,-.36,side*.045],[.17,-.17,side*.03]],'#c45e67'));
    if(id==='cory')for(const side of [-1,1])parts.push(tube([new THREE.Vector3(.40,-.045,side*.025),new THREE.Vector3(.48,-.08,side*.07),new THREE.Vector3(.5,-.105,side*.095)],.006,'#b9a77f'));
    if(id==='oto'){const mouth=new THREE.TorusGeometry(.028,.008,5,12);mouth.rotateY(Math.PI/2);mouth.rotateZ(-.5);mouth.translate(.42,-.045,0);parts.push(finish(mouth,'#8c8d72'));}
  }
  const tailHeight=id==='shrimp'?.10:f.tail==='veil'?.33:f.tail==='fan'?.28:f.tail==='paddle'?.13:.16;
  const tailPoints=[[0,0,0]];
  for(let i=0;i<=14;i++){const t=i/14,s=t*2-1,x=f.tail==='fork'?-.28-.12*Math.abs(s):f.tail==='veil'?-.37+.025*Math.sin(t*29):f.tail==='fan'?-.33+.035*Math.cos(t*12):-.29+.08*s*s;tailPoints.push([x,s*tailHeight,.012*Math.sin(t*8)]);}
  const tail=fin(tailPoints,id==='rummy'?'#e1e1d0':f.accent),c=tail.attributes.color,p=tail.attributes.position;
  for(let i=0;i<p.count;i++){const col=new THREE.Color(id==='rummy'&&Math.floor((p.getX(i)+.4)*35)%2?'#303a38':f.accent);if(id==='guppy'&&Math.sin(p.getX(i)*74+p.getY(i)*33)>.3)col.set('#526b77');col.multiplyScalar(.78+.22*Math.abs(Math.sin(p.getY(i)*72)));c.setXYZ(i,col.r,col.g,col.b);}
  const body=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  body.computeBoundingBox();tail.computeBoundingBox();
  const tailRoot=-.28,normalization=1/(Math.max(body.boundingBox!.max.x,tail.boundingBox!.max.x+tailRoot)-Math.min(body.boundingBox!.min.x,tail.boundingBox!.min.x+tailRoot));
  body.scale(normalization,normalization,normalization);tail.scale(normalization,normalization,normalization);
  body.computeBoundingBox();tail.computeBoundingBox();return {body,tail,tailRoot:tailRoot*normalization,triangles:(body.attributes.position.count+tail.attributes.position.count)/3};
}
