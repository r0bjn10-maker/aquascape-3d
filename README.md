# AQUASCAPE 3D — Living Ecosystem 2.4 — M1 Asset Upgrade

**Chơi trực tiếp:** https://r0bjn10-maker.github.io/aquascape-3d/ — chọn “Khám phá hồ mẫu” để bắt đầu. Bản web đã được xuất bản và kiểm tra thao tác cảm ứng, lưu và tải lại hồ trên viewport điện thoại 390×844.

Bản nâng cấp đồ họa của game hồ thủy sinh hiện có: 5 preset ánh sáng, kính trước bật/tắt riêng, mặt nước gợn, nền có color/normal/roughness maps, 4 chế độ camera, thư viện tìm kiếm và ghost theo kích thước. Có 10 loài cá + tép Cherry, 15 cây, 6 đá × 3 biến thể và 5 lũa × 3 biến thể. **M1 tích hợp GLB/PBR cho Seiryu, Dragon, Spider Wood, Monte Carlo, Rotala, Anubias, Neon, Betta và Cherry Shrimp.** Còn 33 mục dùng procedural fallback. Asset là game art tự tạo, không phải scan/photorealistic; xem [báo cáo model và ảnh render](M1_ASSET_REPORT.md), [manifest](public/models/m1/manifest.json) và [giấy phép CC0](ASSET_LICENSES.md).

Bản mở rộng trực tiếp của game hồ thủy sinh hiện có. Builder, terrain, camera, cá bơi, cây instanced, cửa hàng và save JSON vẫn được giữ. **Living 1:1 + Balanced là mặc định.** Có thể chơi cục bộ không tài khoản; Supabase là tùy chọn cho đồng bộ qua Internet. Không có quảng cáo hay ứng dụng chạy ngầm.

## M1 — mô hình và kiểm tra

Không thêm gameplay/cloud trong phase này. Renderer giữ fallback khi tải GLB/texture thất bại. Neon/Betta/Shrimp dùng clip morph GLB theo từng cá thể; hardscape có 3 biến thể và 2 LOD; cây dùng 3 leaf modules/loài. Có thể zoom gần hơn để kiểm tra model.

```sh
npm run assets:models # cần Blender 4.3+, Python numpy/Pillow; chỉ khi sửa artwork
npm run assets:validate
npm run assets        # preview WebGL từ GLB thật
npm run test:e2e -- e2e/models.spec.ts
```

## Cloud Save & Sync (giữ nguyên từ 2.3)

Bản 2.3 chuyển bộ lưu offline sang IndexedDB, nhập save cũ và thêm Supabase Auth + CAS sync. Mở Menu → Cloud Save để cấu hình/đăng nhập. **Cần chủ project tạo Supabase và chạy SQL trước khi có đồng bộ thật.** [Hướng dẫn cấu hình, bảo mật và xung đột](CLOUD_SAVE_GUIDE.md). Chơi offline vẫn hoạt động nếu chưa cấu hình.

## Chạy game

Cần Node 22.12+ hoặc 24 và trình duyệt hỗ trợ WebGL. Với mã nguồn:

```sh
cd aquascape-3d # thư mục chứa package.json sau khi clone/giải nén
npm ci
npm run dev
```

Với bản web ZIP đã build: giải nén, mở terminal tại thư mục chứa `index.html`, chạy `python -m http.server 8000` (macOS/Linux có thể dùng `python3`), rồi vào máy cục bộ cổng 8000 bằng Chrome/Edge/Safari tương thích. Không nhấp đúp `index.html` qua `file://`; khóa ghi cần secure context như HTTPS hoặc localhost.

## Living, Creative và xem trước

- **Living:** 1 giờ thực = 1 giờ game. Không có nút tăng tốc hay pause sinh học. Zen chỉ ẩn UI/đổi camera, không dừng cuộc sống của hồ trong Living.
- Khi đóng/ẩn trang, game lưu UTC và trạng thái. Khi mở lại, tính bù thời gian đã vắng mặt, lưu thành công rồi mới áp dụng vào hồ. Không phát lại từng khung hình/quỹ đạo cá.
- **Balanced:** hồ chăm tốt vẫn khỏe; hồ bỏ bê đói, stress, cây yếu, nước bẩn. Hậu quả offline có giới hạn suy giảm để giữ khả năng phục hồi. Khi đang chơi trực tiếp, sinh vật vẫn có thể chết vì điều kiện quá xấu.
- **Relaxed:** hậu quả nhẹ hơn. **Challenge:** người chơi chủ động bật, không có bảo vệ offline như Balanced, có thể chết cây/cá.
- **Creative:** xu vô hạn, pause/x1/x5/x20; có tùy chọn bảo vệ sinh vật. Không tự cộng thời gian vắng mặt vào Creative.
- **Time-Lapse:** chọn 12 giờ/1/3/7/30/90 ngày, bấm “Xem trước”. Cảnh 3D và bảng kết quả dùng bản sao. Nút “Quay về hồ đang sống” trả về hồ chính; kết quả dự đoán không được ghi vào save chính.
- Báo cáo “Chào mừng trở lại” so sánh dữ liệu thật: sinh khối, ước tính độ phủ, tuổi/kích thước sinh vật, nước, rêu, hoạt động máy cho ăn. Có xem cảnh trước khi vắng mặt và tối đa 3 gợi ý chăm sóc.

## Chơi và chăm sóc

Chọn hồ mẫu, hồ mới với 1.500 xu hoặc Creative. Bố cục → chọn cọ/chạm nền hoặc đặt đá/lũa. Chọn cây/sinh vật/thiết bị từ kho. Dùng con trỏ để chọn vật thể, kéo nút xanh hoặc chỉnh X/Z/cao/xoay/kích thước. Nhân bản, xóa, undo/redo 40 bước vẫn hoạt động. Ctrl/Cmd+S lưu; Ctrl/Cmd+Z undo; Shift+Ctrl/Cmd+Z redo; Esc hủy chọn; Delete xóa.

Cây có tuổi, sức khỏe, sinh khối và morphology theo loài. Monte Carlo/rêu mở rộng mật độ và vùng phủ; Rotala có thân/nhánh và phân nhánh sau tỉa; Vallisneria có cụm con/runner; Anubias/Java Fern phát triển chậm và tăng thân rễ/lá. Số lá, chiều cao, spread và màu sắc đổi thực trong renderer. Instance mới chuyển tiếp mềm. Ba cây M1 dùng GLB leaf modules có petiole/UV/PBR, instancing và tăng số lá theo morphology; cây khác giữ fallback.

Cá/tép mới là cá thể non, lớn dần theo thức ăn/nước/sức khỏe; không vượt kích thước trưởng thành. Toàn thân/đuôi/vây/mắt cùng đổi tỷ lệ. Tuổi, health, hunger, energy, stress, comfort và behaviour được lưu. Tép có tốc độ trưởng thành khác cá và tìm thức ăn gần nền/hardscape. Không có sinh sản.

Trong “Chăm sóc” có cho ăn, thay một phần nước, lau rêu, chọn care mode, lịch/hiệu suất thiết bị và các chỉ số sinh thái. **Chỉ số 0–100 là chỉ số game, không phải ppm/mg/L hoặc hướng dẫn chăm hồ thật.**

## Tự động hóa

Lịch được lưu theo **giờ UTC** để đổi múi giờ máy không làm lệch lịch. 01:00 UTC = 08:00 tại Việt Nam/Bangkok. Hỗ trợ qua nửa đêm, thời lượng 0–24 giờ, đèn/CO₂ tự động hoặc manual. Lọc/sưởi có hiệu suất, sưởi có nhiệt độ mục tiêu.

Máy cho ăn có lịch, phần/lần và kho hữu hạn. Hồ mẫu có sẵn lọc, sủi khí và máy cho ăn với 240 phần; hồ mới phải lắp. Mặc định 2 lần/ngày, 1 phần/lần. Kho hết không tiếp tục tạo thức ăn; có nút nạp có giá xu, giới hạn dung lượng.

## Save, nâng cấp và an toàn

Save schema 2 dùng cùng khóa cũ `aquascape-world-v1`. Khi nâng từ 0.1, giữ bố cục, tiền, growth và thiết bị; vì save cũ không có UTC nên chỉ bắt đầu real-time tại lúc chuyển đổi, không cộng hồi tố những ngày không có dữ liệu. Không diễn giải “ngày tăng tốc” cũ thành nhiều ngày thực.

Autosave sau chỉnh sửa khoảng 0,7 giây, mỗi 10 giây và khi ẩn/rời trang. Primary/checkpoint/metadata được ghi atomic trong IndexedDB; cloud có version CAS riêng. localStorage giữ mirror tương thích, không còn là bộ lưu chính. Một tab giữ Web Lock quyền ghi; tab thứ hai chỉ xem/xuất. Đóng tab chủ rồi tải lại tab kia để tiếp quản. Trình duyệt không hỗ trợ Web Locks hoặc chặn storage sẽ không được ghi tự động; dùng JSON export để giữ dữ liệu.

Không double-count khi reload. Đồng hồ lùi giữ mốc UTC cũ. Nhảy đồng hồ bất thường trong phiên được đánh dấu; chênh lệch offline trên 366 ngày không tự xử lý. Menu giải thích và cho chọn xử lý từng khoảng tối đa 366 ngày hoặc dùng giờ hiện tại và bỏ khoảng nghi ngờ. Không âm thầm bỏ phần thời gian thừa. Đây không phải đồng hồ chống gian lận có server xác thực.

Khi chơi cục bộ, dữ liệu riêng theo origin trình duyệt (giao thức/host/cổng). Khi đã cấu hình và đăng nhập Supabase, hồ được đồng bộ theo tài khoản; chờ “Đã đồng bộ” trước khi chuyển máy. Nên xuất JSON trước khi đổi máy, cổng hoặc xóa dữ liệu web.

## Kiểm tra, build và deploy

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npm run test:e2e
```

Browser tests dùng `/usr/bin/chromium`; máy khác đặt `CHROMIUM_PATH`. Cloud có thể dùng `PW_TEST_SCREENSHOT_NO_FONTS_READY=1` khi chụp ảnh. Production/PWA test chạy riêng:

```sh
npm run preview -- --port 4173 --base=/aquascape-3d/
# Terminal khác:
AQUASCAPE_PRODUCTION=1 PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- e2e/production.spec.ts
```

Ảnh WebP và registry đã có trong source. Build dùng lại nếu hash nguồn không đổi; khi sửa generator/model, `npm run assets` cần Chromium (đặt `CHROMIUM_PATH` nếu cần). Xem ASSET_GUIDE.md.

PWA cache tài nguyên build sau lần tải đủ. Để nhận bản nâng cấp đã cài, đóng các tab game rồi mở lại để worker mới kích hoạt; xuất save dự phòng trước khi xóa cache. `base: './'` hỗ trợ GitHub Pages subpath. Repository công khai `r0bjn10-maker/aquascape-3d` dùng nhánh `main` chứa source Aquascape độc lập, nhánh `gh-pages` chứa nội dung `dist/` để xuất bản ở thư mục `/`. Sau khi sửa source, chạy đủ checks, build rồi cập nhật nhánh `gh-pages` bằng nội dung dist; GitHub Pages triển khai nhánh này. Đẩy source lên `main` đơn lẻ không thay bản đang chơi. Không yêu cầu backend hoặc workflow riêng.

[Tài liệu thiết kế](GAME_DESIGN.md) · [Kiến trúc](ARCHITECTURE.md) · [Asset](ASSET_GUIDE.md) · [QA](QA_REPORT.md) · [Cloud setup](CLOUD_SAVE_GUIDE.md) · [Changelog](CHANGELOG.md)

Bản 2.4: 129 unit/integration tests, 24 luồng browser dev và 1 production/PWA workflow đã đạt qua suite và chạy lại có mục tiêu; 42 GLB có 0 lỗi/0 cảnh báo Khronos. Kết quả/hash trong [QA_REPORT.md](QA_REPORT.md) và `qa/m1/release.json`. Báo cáo cloud 2.3 lưu tại QA_REPORT_V23_HISTORY.md và `qa/cloud/release.json`. Auth/HTTP cloud dùng mock với SDK thật; RLS/SQL chạy PostgreSQL nhúng. Cần cấu hình Supabase thật theo CLOUD_SAVE_GUIDE.md để bật đồng bộ qua Internet. Kết quả đồ họa 2.2 trước đây lưu trong QA_REPORT_V22_HISTORY.md.
