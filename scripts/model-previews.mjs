// Uses the actual exported GLB and its PBR textures, never the fallback geometry.
export async function modelPreview(page,asset,variant){
 return page.evaluate(async({asset,variant})=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const {leafPose}=await import('/src/game/plants/layout.ts');
  const {plantBiology}=await import('/src/data/biology.ts');
  const {updateMorphology}=await import('/src/game/simulation/plantGrowth.ts');
  const {morphology}=await import('/src/game/plants/morphology.ts');
  const {makeTerrain}=await import('/src/game/terrain/heightfield.ts');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(256,224);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#e6f3f2','#637565',2.0));const sun=new THREE.DirectionalLight('#f1f5e4',3);sun.position.set(1,4,3);scene.add(sun);const rim=new THREE.DirectionalLight('#b1d9e2',1.4);rim.position.set(-3,2,-2);scene.add(rim);
  const gltf=await new GLTFLoader().loadAsync('/'+asset.model.replace('-0-high',`-${variant}-high`));
  let model=gltf.scene;
  if(asset.modelSpec.kind==='leaf-module'){
   let source;model.traverse(o=>{if(o.isMesh)source=o;});const group=new THREE.Group(),terrain=makeTerrain(true),item={id:'preview',asset:asset.id,x:0,z:0,scale:1,elevation:0,rotation:0,age:0,growth:.85,health:95,biomass:1,trim:0};item.bio=plantBiology(item);updateMorphology(item,{terrain});const n=morphology(item).count,dummy=new THREE.Object3D();
   for(let i=0;i<n;i++){leafPose(item,asset,terrain,i,n,dummy);const leaf=new THREE.Mesh(source.geometry,source.material);leaf.position.copy(dummy.position);leaf.quaternion.copy(dummy.quaternion);leaf.scale.copy(dummy.scale);group.add(leaf);}
   model=group;
  }
  scene.add(model);const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z)*.7;
  const camera=new THREE.OrthographicCamera(-extent,extent,extent*.875,-extent*.875,.01,100);
  camera.position.copy(center).add(new THREE.Vector3(asset.category==='fish'?.15:2.0,asset.category==='fish'?.20:1.3,3).normalize().multiplyScalar(extent*6));camera.lookAt(center);camera.updateMatrixWorld();renderer.render(scene,camera);
  const data=renderer.domElement.toDataURL('image/webp',.93).split(',')[1];
  const resources=new Set();gltf.scene.traverse(o=>{if(o.isMesh){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}}});for(const r of resources)r.dispose();renderer.dispose();renderer.forceContextLoss();return data;
 },{asset,variant});
}
