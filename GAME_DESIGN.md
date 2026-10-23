# AQUASCAPE 3D — Living Ecosystem 2.1

Một hồ thủy sinh nước ngọt 60 × 30 × 36 cm (64,8 L danh định), có thể thiết kế và tiếp tục phát triển theo thời gian thực. Không backend, tài khoản, quảng cáo, trả tiền hay yêu cầu mở game hằng ngày. Bản mở rộng giữ renderer/builder hiện có.

## Các chế độ

**Living** là mặc định: 1 giờ thực = 1 giờ game. Khi đóng trang, UTC được lưu; khi trở lại, bộ mô phỏng tính bù rồi lưu kết quả trước khi cập nhật cảnh. Không cần chạy ngầm. Sinh học được tích lũy theo bước 60 giây, phần lẻ được lưu; chuyển động hình ảnh độc lập tốc độ sinh học. **Creative** có pause/x1/x5/x20, xu vô hạn và tùy chọn tắt hậu quả sức khỏe; không tự tiến triển offline. **Zen** là góc nhìn: Living vẫn tiếp tục, Creative có thể tạm dừng. **Time-Lapse** tính trên bản sao, chỉ xem, không áp dụng vào save chính.

## Chăm sóc

- **Balanced (mặc định):** điều kiện tốt cho tăng trưởng; thiếu chăm sóc có đói/stress, nước xấu, cây yếu và biomass giảm. Trong mỗi khoảng catch-up, cây giảm tối đa 35 health và cá/tép 30; có floor 20/30, nhưng không hồi sinh cá thể vốn đã yếu hơn hoặc đã chết. Hậu quả trực tiếp khi đang chơi vẫn có thể gây chết.
- **Relaxed:** giảm tốc hậu quả, rêu chậm hơn, bảo vệ offline mạnh hơn.
- **Challenge:** người chơi chủ động chọn; không có floor bảo vệ offline, có thể chết cây/cá.

Ngưỡng nằm trong `data/welfare.ts`; không giữ mọi thông số ở mức hoàn hảo. Cùng một khoảng đã xử lý không được tính lại khi đổi chế độ. Chu kỳ game mặc định không tự phát tiền vô hạn.

## Cây và sinh vật

Sáu cây có tuổi, growth có giới hạn, health/biomass, seed, light/nutrient/CO₂/temperature condition, stage/height/spread/density và thời điểm tỉa. Monte Carlo phủ rộng; moss tăng cụm; Rotala có thân/nhánh, phân nhánh sau tỉa; Vallisneria có runner/cụm con; Anubias/Fern tăng lá và thân rễ chậm. Bốn giai đoạn hình thái phân biệt, geometry/instance count và tỷ lệ thay đổi thực, chuyển tiếp mềm. Không sinh vô hạn object mới.

Neon/Ember/Cherry shrimp có tuổi, kích thước trưởng thành theo loài, current length, growth, health/hunger/energy/stress/comfort/behaviour/alive. Model đổi kích thước cùng đuôi/mắt/vây. Cá có separation/alignment/cohesion/wander/avoidance, hành vi nghỉ/tìm thức ăn/stress. Tép đi gần nền/hardscape. Restore chỉ cần vị trí hợp lệ, không phát lại quỹ đạo offline. Không có sinh sản/bệnh học hay mô hình tuổi già phức tạp.

## Nhân quả và tự động hóa

Các chỉ số 0–100 là **chỉ số game**, không phải phép đo hóa học nước thật. Nhiệt độ là °C, lịch là UTC, chiều dài sinh vật là cm, tuổi sinh học là giây.

Cá ăn tạo chất thải/dinh dưỡng; bioload phụ thuộc kích thước; lọc theo hiệu suất và maturity xử lý waste. Cây dùng dinh dưỡng, sáng/CO₂/nhiệt độ phù hợp cho growth có giới hạn. Dư sáng/dinh dưỡng tăng tảo; tép chỉ gặm một phần. Oxy thấp/CO₂ cao/nhiệt độ sai tăng stress. Nước thay/lau rêu chỉ cải thiện một phần. Sưởi tiến dần tới nhiệt độ mục tiêu có giới hạn.

Đèn/CO₂ có lịch UTC, qua nửa đêm và 0–24 giờ. Feeder chạy đúng mốc, dùng kho hữu hạn, không tạo thức ăn khi hết. Hồ mẫu có 240 phần, hai lần một ngày; có mua/nạp giới hạn dung lượng. Các sự kiện được tính đúng cả offline.

## Giới hạn thể hiện

Asset hiện là procedural fallback, không tuyên bố final realistic art. Va chạm/attachment theo bounds xấp xỉ, không mesh collision đầy đủ. Runner/nhánh là phần của cụm cha, chưa phải cây con độc lập có ID/edit riêng. Model tép vẫn là proxy, cần final art/rigging. Xem QA_REPORT.md để biết phần đã kiểm thử và phần cần thiết bị thật.
