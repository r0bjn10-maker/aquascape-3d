import { useMemo,useEffect } from 'react';
import { useGame,visibleWorld } from '../../state/store';
import { assets } from '../../data/catalog';
import { heightAt } from '../terrain/heightfield';
import { rockGeometry,woodGeometry } from '../assets/surfaces';
import type { PlacedObject } from '../types';
import { selectObject } from '../interactions/Builder';
import { AssetModel } from '../assets/AssetModel';
import { stoneMaterial,woodMaterial } from './material';
import { updatePlacementCursor } from '../interactions/cursor';
import { qualitySettings } from '../scene/settings';
function Piece({item}:{item:PlacedObject}){
  const terrain=useGame(s=>visibleWorld(s).terrain),selected=useGame(s=>s.selected===item.id),asset=assets[item.asset]??assets.river;
  const quality=useGame(s=>s.quality),adaptiveLow=useGame(s=>s.adaptiveLow),detail=qualitySettings(quality,adaptiveLow).detail;
  const geo=useMemo(()=>asset.category==='wood'?woodGeometry(asset.id,item.variant??0,detail,asset.size*1.5):rockGeometry(asset.id,item.variant??0,detail,asset.size),[asset,item.variant,detail]);
  const material=useMemo(()=>asset.category==='rocks'?stoneMaterial(asset.color,asset.id):woodMaterial(asset.color),[asset]);
  useEffect(()=>{material.emissive.set(selected?'#315c50':'#000000');material.emissiveIntensity=.35;},[selected,material]);
  useEffect(()=>()=>{geo.dispose();material.dispose();},[geo,material]);
  const fallback=<mesh geometry={geo} material={material} scale={[1,asset.height,1]} castShadow receiveShadow/>;
  return <group position={[item.x,heightAt(terrain,item.x,item.z)+item.elevation-.04,item.z]} rotation={[0,item.rotation,asset.category==='rocks'?-.08:0]} scale={item.scale} onPointerMove={e=>{if(useGame.getState().attachment)updatePlacementCursor(e.point);}} onClick={e=>selectObject(item.id,e)}><AssetModel asset={asset} fallback={fallback}/></group>;
}
export function Hardscape(){
  const objects=useGame(s=>visibleWorld(s).objects);
  return <>{objects.filter(o=>['rocks','wood'].includes(assets[o.asset]?.category??'rocks')).map(o=><Piece key={o.id} item={o}/>)}</>;
}
