import { ArrowUpRight,Leaf,Plus,Infinity as InfinityIcon } from 'lucide-react';
import { useGame } from '../state/store';
export function Welcome(){
  const s=useGame();if(s.started)return null;
  return <section className="welcome panel" aria-label="Bắt đầu"><small>CHẬM LẠI MỘT CHÚT</small><h2>Hồ thủy sinh<br/>của riêng bạn.</h2><p>Living 1:1 · Balanced mặc định.<br/>Trở lại để ngắm hồ lớn lên theo thời gian thực.</p>
    {s.saved&&<button className="continue" onClick={()=>s.set({started:true})}>Tiếp tục hồ đã lưu<ArrowUpRight size={17}/></button>}
    <button onClick={()=>s.newGame('sample')}><Leaf size={19}/><span>Khám phá hồ mẫu<small>Hệ sinh thái ổn định, sẵn sàng chăm sóc</small></span><ArrowUpRight size={15}/></button>
    <button onClick={()=>s.newGame('fresh')}><Plus size={19}/><span>Tạo hồ mới<small>Khởi đầu từ nền cát và 1.500 xu</small></span><ArrowUpRight size={15}/></button>
    <button onClick={()=>s.newGame('creative')}><InfinityIcon size={19}/><span>Tự do sáng tạo<small>Không giới hạn xu, chăm sóc nhẹ nhàng</small></span><ArrowUpRight size={15}/></button>
    <div className="welcome-note">60 × 30 × 36 cm · Thiên nhiên trong tầm tay</div>
  </section>;
}
