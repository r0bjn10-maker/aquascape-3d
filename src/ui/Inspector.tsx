import { Copy,Trash2,Scissors,X,Move } from 'lucide-react';
import { useGame } from '../state/store';
import { resolveAsset } from '../data/catalog';
import { Preview } from './Preview';
export function Inspector(){
  const s=useGame(),o=s.world.objects.find(o=>o.id===s.selected);if(!o)return null;const a=resolveAsset(o.asset);
  return <aside className="inspector panel" aria-label="Thuộc tính vật thể"><div className="panel-heading"><small>ĐANG CHỌN</small><button className="plain-icon" aria-label="Bỏ chọn" onClick={()=>s.set({selected:null})}><X size={15}/></button></div><Preview asset={a} variant={o.variant??0}/><h2>{a.name}</h2><p className="latin">{a.latin??'Natural hardscape'}</p><p className="description">{a.description}</p><div className="inspector-hint"><Move size={12}/>Kéo nút xanh trong hồ để di chuyển</div>
    {([['x','Ngang X',-2.8,2.8,.02],['z','Độ sâu Z',-1.3,1.3,.02],['elevation','Độ cao',0,1.8,.02],['rotation','Xoay',-3.14,3.14,.05],['scale','Kích thước',.35,1.6,.05]] as const).map(([key,label,min,max,step])=><label className="range-label" key={key}>{label}<span>{o[key].toFixed(2)}</span><input aria-label={label} type="range" min={min} max={max} step={step} value={o[key]} onChange={e=>s.transform(o.id,{[key]:+e.target.value})}/></label>)}
    {a.category==='plants'&&<div className="plant-state"><span>Giai đoạn {Math.min(4,1+Math.floor(o.growth*4))} / 4</span><span>Sức sống {Math.round(o.health)}%</span><div className="progress"><i style={{width:o.growth*100+'%'}}/></div><button onClick={s.trim}><Scissors size={14}/>Cắt tỉa</button></div>}
    <div className="inspector-actions"><button onClick={s.duplicate}><Copy size={14}/>Nhân bản</button><button onClick={s.remove}><Trash2 size={14}/>Xóa</button></div>
  </aside>;
}
