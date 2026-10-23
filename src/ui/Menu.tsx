import { useRef,useState } from 'react';
import { Save,Download,Upload,Plus,X } from 'lucide-react';
import { useGame } from '../state/store';
import { downloadSave } from '../persistence/save';
import { appearanceOf,LIGHTING } from '../game/scene/settings';
import type { LightingPreset } from '../game/types';
export function Menu({close}:{close:()=>void}){
  const s=useGame(),file=useRef<HTMLInputElement>(null),[fresh,setFresh]=useState(false);
  return <div className="modal-scrim" onClick={close}><section className="menu panel" role="dialog" aria-modal="true" aria-label="Menu hồ" onClick={e=>e.stopPropagation()}><div className="panel-heading"><h2>Góc nhỏ của bạn</h2><button aria-label="Đóng menu" className="plain-icon" onClick={close}><X size={17}/></button></div><label className="name-label">Tên hồ<input value={s.world.name} maxLength={80} onChange={e=>s.edit(w=>{w.name=e.target.value;})}/></label>
    <button onClick={()=>{s.save();close();}}><Save size={17}/>Lưu hồ</button><button onClick={()=>downloadSave(s.world)}><Download size={17}/>Xuất save JSON</button><button onClick={()=>file.current?.click()}><Upload size={17}/>Nhập save JSON</button><input ref={file} hidden type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];if(f){if(f.size>2000000)s.set({notice:'Tệp quá lớn (tối đa 2 MB).'});else s.import(await f.text());close();}}}/>
    <label className="name-label">Ánh sáng hồ<select aria-label="Preset ánh sáng" value={appearanceOf(s.world).lighting} onChange={e=>s.edit(w=>{w.appearance={...appearanceOf(w),lighting:e.target.value as LightingPreset};})}>{Object.entries(LIGHTING).map(([id,preset])=><option key={id} value={id}>{preset.name}</option>)}</select></label>
    <label className="equipment-toggle">Hiện kính trước<input aria-label="Hiện kính trước" type="checkbox" checked={appearanceOf(s.world).frontGlass} onChange={e=>s.edit(w=>{w.appearance={...appearanceOf(w),frontGlass:e.target.checked};})}/></label>
    <label className="equipment-toggle">Hiện kính<input type="checkbox" checked={s.glass} onChange={e=>s.set({glass:e.target.checked})}/></label><label className="equipment-toggle">Chế độ sáng tạo<input type="checkbox" checked={s.world.mode==='creative'} onChange={e=>s.changeMode(e.target.checked)}/></label>
    {s.world.mode==='creative'&&<label className="equipment-toggle">Bảo vệ sinh vật<input type="checkbox" checked={s.world.automation.creativeProtection} onChange={e=>s.edit(w=>{w.automation.creativeProtection=e.target.checked;})}/></label>}
    {s.offlineWarning&&<div className="confirm"><p>{s.offlineWarning}</p><button onClick={()=>{s.processAbsence();close();}}>Tính thêm tối đa 366 ngày</button><button onClick={()=>{s.edit(w=>{w.clock.lastSimulatedUtc=Date.now();w.clock.wallClockReview=false;});s.set({offlineWarning:''});s.save();close();}}>Dùng giờ hiện tại, bỏ khoảng nghi ngờ</button></div>}
    <button onClick={()=>setFresh(true)}><Plus size={17}/>Tạo hồ khác</button>{fresh&&<div className="confirm"><p>Lưu hoặc xuất hồ hiện tại trước khi bắt đầu hồ khác.</p><button onClick={()=>{s.set({started:false,selected:null,panel:null});close();}}>Mở màn hình bắt đầu</button></div>}
    <p className="disclaimer">Lưu cục bộ trên trình duyệt này. Không có tài khoản hay đồng bộ cloud.</p></section></div>;
}
