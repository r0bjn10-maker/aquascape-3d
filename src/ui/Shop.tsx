import { useState,useEffect } from 'react';
import { X,MousePointer2,Mountain,ArrowUp,ArrowDown,Waves,Search } from 'lucide-react';
import { useGame } from '../state/store';
import { catalog,assets } from '../data/catalog';
import { Preview } from './Preview';
import { Care } from './Care';
import type { Category } from '../game/types';
const normalize=(text:string)=>text.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/đ/g,'d');
export function Shop(){
  const s=useGame(),[layoutCategory,setLayout]=useState<Category>('rocks'),[query,setQuery]=useState(''),[group,setGroup]=useState('all');
  useEffect(()=>{setQuery('');setGroup('all');},[s.panel,layoutCategory]);
  if(!s.panel)return null;
  const category=s.panel==='layout'?layoutCategory:s.panel,placed=s.placing?assets[s.placing]:null;
  const titles={layout:['Bố cục hồ','Nền, đá & những nhánh lũa'],plants:['Vườn dưới nước','Từng chiếc lá, một thế giới'],fish:['Những cư dân nhỏ','Thêm sự sống cho hồ của bạn'],equipment:['Thiết bị','Giữ nhịp sống dưới mặt nước'],care:['Chăm sóc hồ','Lắng nghe hệ sinh thái']};
  const filtered=catalog.filter(a=>a.category===category&&normalize(`${a.id} ${a.name} ${a.latin??''} ${a.description}`).includes(normalize(query))&&(group==='all'||a.plant?.group===group||a.fish?.zone===group));
  return <aside className="shop panel" aria-label="Cửa hàng"><div className="panel-heading"><div><small>BỘ SƯU TẬP</small><h2>{titles[s.panel][0]}</h2></div><button aria-label="Đóng cửa hàng" className="plain-icon" onClick={()=>s.set({panel:null,tool:'select',placing:null})}><X size={16}/></button></div><p className="panel-subtitle">{titles[s.panel][1]}</p>
    {s.panel==='care'?<Care/>:<>
      {s.panel==='layout'&&<><div className="subtabs"><button className={layoutCategory==='rocks'?'active':''} onClick={()=>setLayout('rocks')}>Đá</button><button className={layoutCategory==='wood'?'active':''} onClick={()=>setLayout('wood')}>Lũa</button></div><div className="terrain-tools"><span><Mountain size={13}/>Chỉnh địa hình</span><div>{(['raise','lower','smooth'] as const).map((tool,i)=>{const Icon=[ArrowUp,ArrowDown,Waves][i];return <button key={tool} className={s.tool===tool?'active':''} onClick={()=>s.set({tool,placing:null,selected:null})} title={['Nâng nền','Hạ nền','Làm mịn'][i]}><Icon size={15}/>{['Nâng','Hạ','Mịn'][i]}</button>;})}</div><label>Cỡ cọ <input aria-label="Cỡ cọ" type="range" min=".15" max="1" step=".05" value={s.brushRadius} onChange={e=>s.set({brushRadius:+e.target.value})}/></label><p>Chạm nền để chỉnh. Mỗi lần chạm là một nét cọ.</p><div className="subtabs"><button className={s.world.substrate==='sand'?'active':''} onClick={()=>s.edit(w=>{w.substrate='sand';})}>Cát sáng</button><button className={s.world.substrate==='soil'?'active':''} onClick={()=>s.edit(w=>{w.substrate='soil';})}>Aquasoil</button></div></div></>}
      <div className="library-filters"><label className="library-search"><Search size={13}/><input aria-label="Tìm tài nguyên" type="search" placeholder="Tìm theo tên hoặc loài…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        {category==='plants'&&<select aria-label="Nhóm cây" value={group} onChange={e=>setGroup(e.target.value)}><option value="all">Tất cả vị trí</option><option value="foreground">Tiền cảnh</option><option value="midground">Trung cảnh</option><option value="background">Hậu cảnh</option><option value="moss">Rêu</option></select>}
        {category==='fish'&&<select aria-label="Tầng bơi" value={group} onChange={e=>setGroup(e.target.value)}><option value="all">Tất cả tầng bơi</option><option value="upper">Tầng trên</option><option value="middle">Tầng giữa</option><option value="bottom">Sát nền</option></select>}
        {(category==='rocks'||category==='wood')&&<select aria-label="Biến thể hình dáng" value={s.placingVariant} onChange={e=>s.set({placingVariant:Number(e.target.value)})}>{[0,1,2].map(i=><option key={i} value={i}>Biến thể {i+1} / 3</option>)}</select>}
        <small role="status" aria-label="Số tài nguyên">{filtered.length} tài nguyên</small>
      </div>
      <div className="catalog">{filtered.map(a=><button key={a.id} className={'asset-card '+(s.placing===a.id?'chosen':'')} onClick={()=>s.purchase(a.id)} title={`${a.description}\n${a.latin??''}`} data-testid={'buy-'+a.id}><Preview asset={a} variant={s.placingVariant}/><span className="asset-name">{a.name}</span><span className="asset-size">{a.fish?`${a.fish.adultCm} cm · ${a.fish.school?'Theo đàn':a.fish.zone==='bottom'?'Sát nền':'Bơi riêng'}`:a.plant?`Cao tối đa ${+(a.height*10).toFixed(1)} cm`:`${+(a.bounds[0]*10).toFixed(1)} × ${+(a.height*10).toFixed(1)} cm`}</span><span className="asset-status">{a.status==='authored-glb'?'GLB · M1':a.status==='final'?'Hoàn thiện':a.status==='placeholder'?'Model tạm':'Model tự tạo'}</span><span className="asset-meta">{a.zone??(a.category==='fish'?'Nước ngọt':a.category==='equipment'?'Thiết bị':'Hardscape')}<b>{s.world.mode==='creative'?'∞':a.price+' xu'}</b></span></button>)}</div>
      {!filtered.length&&<p className="empty-library">Không có tài nguyên phù hợp. Thử tên khác hoặc bỏ bộ lọc.</p>}
      {placed&&<div className="placing-guide"><p>Khung mẫu trong hồ cho biết kích thước trước khi đặt. Chạm nền để đặt.</p><label>Kích thước khi đặt <b>×{s.placingScale.toFixed(2)}</b><input aria-label="Kích thước khi đặt" type="range" min=".35" max="1.6" step=".05" value={s.placingScale} onChange={e=>s.set({placingScale:Number(e.target.value)})}/></label>{placed.attachment&&<label><input type="checkbox" checked={s.attachment} onChange={e=>s.set({attachment:e.target.checked})}/> Gắn cây lên đá / lũa</label>}<button onClick={()=>s.set({tool:'select',placing:null})}><MousePointer2 size={14}/>Kết thúc đặt</button></div>}
    </>}
  </aside>;
}
