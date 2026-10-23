# QA report — Aquascape 3D 0.1.0

Bản nền tảng chơi được; không phải chứng nhận hoàn thành toàn bộ đặc tả V1.0. Kiểm tra trên máy cloud Linux, Node 24.19.0, Chromium hệ thống với WebGL/SwiftShader. Ngày kiểm tra theo múi giờ người dùng: 23/10/2026 (Asia/Bangkok).

## Kết quả tự động

| Nhóm | Kết quả / bằng chứng |
|---|---|
| TypeScript | `npm run typecheck` đạt |
| ESLint | `npm run lint` đạt |
| Production build | `npm run build` đạt; bundle có service worker, không có runtime CDN |
| Unit tests | 26 bài đạt trong `src/tests/core.test.ts` |
| Builder browser | Đạt: tạo hồ trống, cọ nền, raycast đặt đá/cây, chọn, kéo handle thật, nhân bản, undo/redo, lưu/tải lại, các camera, viewport điện thoại |
| Care browser | Đạt: feeding, water change, x20, growth state + hình học thật, Zen pause, import lỗi giữ hồ |
| Missing GLB | Đạt: cố ý chèn đường GLB không tồn tại, fallback procedural giữ hồ hoạt động |
| Tablet touch | Đạt: browser có touch/isMobile, chạm đặt cây từ góc trên, lưu và không tràn ngang |
| Production/PWA | Đạt: production dưới `/aquascape-3d/`, service worker điều khiển trang, ngắt mạng rồi reload/tiếp tục hồ |

Không đồng nhất bài kiểm tra lịch sử với lượt hiện tại. Bài đo growth ban đầu đọc số tam giác cũ ngay sau import và thất bại (68.780 so với 59.820). Đã đổi runner sang đợi số đo phản ánh hình học mới trước khi so sánh và chạy lại đạt. Không bỏ assertion. Số tam giác thực tăng từ **51.380 lên 59.820** khi cây vượt giai đoạn hình thái; xem `qa/growth-render.json`.

**Tổng kết kiểm tra cuối:** 26 unit tests đạt; 4 browser workflows phát triển đạt (builder, care/growth, missing GLB, tablet touch), cộng 1 production/PWA browser test đạt. Test production được chạy riêng; `npm run test:e2e` mặc định sẽ skip nó nếu chưa đặt biến production. Không có test required còn thất bại. Không kiểm thử phần cứng thật hoặc deploy public.

### Tái lập kiểm tra production

```sh
npm run build
npm run preview -- --port 4173 --base=/aquascape-3d/
# Terminal khác, giữ preview server đang chạy:
AQUASCAPE_PRODUCTION=1 PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- e2e/production.spec.ts
```

## Phạm vi unit tests

- Grid 65 × 33, bilinear sampling, cọ raise/lower/smooth, giới hạn 1–12 cm.
- Footprint của mọi đá/lũa/cây, giới hạn scale, khoảng không trên nền; oversized wood không vượt kính theo bounds khai báo.
- Cây gắn di chuyển theo parent qua inspector/handle reducer.
- Cây phản ứng với đèn, CO₂, dinh dưỡng; growth bị chặn ở 1, health ở phạm vi hỗ trợ.
- Lọc trưởng thành giảm thải, dư sáng/dinh dưỡng tăng tảo, tép có tác động hữu hạn, CO₂ quá dư/oxy kém làm tăng stress.
- Clock x1/x5/x20; cùng game time cho cùng kết quả; 30fps/120fps cho cùng tiến trình.
- 6.000 bước di chuyển cá: trong giới hạn hồ và trên nền dốc; lực tránh đá; tép đi sát nền.
- Save/load tương đương transform/terrain/simulation, từ chối JSON lỗi/phiên bản lạ/thiếu dữ liệu/giá trị sai/vật thể vượt bounds; import lỗi giữ nguyên state.
- Không cộng thời gian offline; storage thiếu, hỏng hoặc bị chặn đều có fallback.
- Mua/đặt/chuyển/nhân bản/xóa, undo/redo và 25 thao tác liên tiếp; cắt tỉa và mọc lại; registry fallback.

## Ảnh thực của renderer

`qa/initial-aquarium.png`, `front-camera.png`, `three-quarter-camera.png`, `top-camera.png`, `selected-hardscape.png`, `planting-interface.png`, `simulation-hud.png`, `mobile-viewport.png`, `tablet-touch.png`. Các ảnh là Low preset trên software WebGL. Góc trên tự ẩn thanh đèn để không che mặt nền. Viewport điện thoại được fit camera lại thay vì cắt mất hai bên hồ.

## Tiến độ theo phase

- **Phase 1 / implemented and tested core:** WebGL scene, hồ mẫu, kính/nước gần đúng, terrain, lighting, camera, asset registry/procedural và GLB fallback, cây chuyển động, cá bơi, preset đồ họa. Chất lượng mỹ thuật realistic cuối cùng chưa hoàn thành.
- **Phase 2 / implemented and tested core:** catalog/economy, raycast placement, inspector, ground drag handle, footprint bounds, attachment xấp xỉ, terrain brushes, 40 undo steps, local persistence/JSON, desktop/touch browser flows.
- **Phase 3 / implemented core:** fixed clock, visual growth/trim, causal simplified ecosystem, feeding/maintenance/equipment, Creative, Zen, synthesized water audio. Kiểm tra không có offline penalties. Xem phần kết quả mới nhất ở trên cho bằng chứng browser.
- **Phase 4 / partial:** tài liệu, responsive UI, PWA, relative build paths và workflow deploy thủ công đã có. Còn final art, QA thiết bị thật, hoàn thiện collision, audio/music và release polish.

## Giới hạn còn lại

1. Tài nguyên procedural không phải photorealistic final art. Lá, cá và đặc biệt tép cần mesh/animation chuyên nghiệp; chưa có cá GLB/skinned pipeline. Tép chưa có chân/antenna/gặm rêu rõ nét. Cá có tail oscillation, chưa có body deformation/fin banking đầy đủ.
2. Avoidance và placement dùng bán kính/bounds khai báo, không phải collision với từng tam giác. Có thể còn clipping nhẹ giữa cây, lũa và sinh vật. Attachment dùng vị trí/độ cao xấp xỉ, chưa có surface anchors chính xác. Brush hiện là từng chạm, chưa kéo vẽ một stroke liên tục.
3. Cây đổi mật độ lá/kích thước theo bốn giai đoạn; chưa mô phỏng thân đốt/phân nhánh thật hoặc thảm lan thành instance cây mới. Algae hiện là chỉ số và lớp màu đơn giản; water clarity chưa có volumetric scattering đầy đủ.
4. Glass/water dùng alpha và shader gợn nhẹ. Không có ray tracing, phản xạ/refraction vật lý đầy đủ, HDRI, postprocessing/bloom hay caustics chuyên nghiệp.
5. Quality Low/Medium/High điều chỉnh DPR, antialias và shadow map. Auto hạ DPR sau 5 mẫu FPS thấp; không có hệ LOD/postprocess nhiều tầng hay tự nâng lại chất lượng.
6. Không kiểm thử trên Windows/iPad/iPhone/Safari vật lý. Touch emulation và responsive screenshots không thay thế kiểm thử thiết bị thật. SVG PWA icon chưa có bộ PNG/apple-touch-icon hoàn chỉnh.
7. Có thông báo/context restored handler cho WebGL context loss, nhưng chưa fault-inject kiểm chứng recovery. Âm thanh nước tổng hợp có thật; chưa có nhạc nền và kiểm thử thính giác.
8. Schema v1 được kiểm tra nghiêm ngặt; chưa có save schema cũ để migrate. Lịch sử undo chụp cả thời gian/sinh học, chưa tách lịch sử chỉ cho bố cục. Settings UI như góc camera/preset không nằm trong save.
9. Mô hình hóa quần thể không có bệnh, sinh sản hoặc chết; sức sống tối thiểu 10. Không phải mô phỏng khoa học hay hướng dẫn chăm hồ thật.
10. Workflow Pages chỉ chạy qua `workflow_dispatch`. Chưa publish, chưa push và chưa có URL public. Triển khai sẽ dùng Pages root của repository; cần cân nhắc game cũ nếu đang dùng Pages.

## Hiệu năng và blocker

Draw calls, triangle count, texture count, FPS và frame time được đọc từ renderer và hiển thị trong UI. `qa/performance.json` ghi 4 mẫu production ở subpath: **51 draw calls, 68.780 tam giác, 1 texture, 2–3 FPS, 348,9–462,3 ms/frame**. Renderer xác nhận là ANGLE/SwiftShader, viewport 1280 × 900, Low preset. Chưa có số memory GPU đáng tin cậy nên không báo con số giả.

Cloud software renderer trong lượt này chỉ đạt 2–3 FPS; không dùng số đo này để tuyên bố đạt 60fps desktop hay 30fps mobile. Cần đo lại với GPU thật. Mục tiêu hiệu năng trên thiết bị thật và chất lượng realistic cuối cùng **chưa được xác nhận**.

Không có blocker về tài khoản, API key hoặc dịch vụ backend. Asset final, real-device QA và các hạng mục nêu trên là phần việc tiếp theo; không bị giấu dưới nhãn “hoàn thành V1.0”.

## V2.1 work log / RT-1

UTC/monotonic clock, schema migration, elapsed 12h/1d/3d/7d/30d/90d, no duplicate catch-up, rollback/jump detection, partial steps and journal recovery have unit coverage. Typecheck/build and 38 tests passed at the foundation checkpoint. Biology and browser integration are being extended; previous V0.1 acceptance statements do not certify V2.1.

### RT-2 checkpoint

41 tests passed, typecheck/build passed. Added light/nutrient response, four distinct leaf counts, bounded morphology, trimming timestamp/branching and long-growth placement preservation. Browser visual regression is scheduled for RT-6.

### RT-3 checkpoint

43 tests, typecheck and build passed. Juvenile fish/shrimp grow at different species rates, age, stay within adult length and restore bounds; stress reacts to poor conditions. Renderer uses interpolated physical length for all fish parts.

### RT-4 / RT-5 checkpoints

48 tests/build/typecheck passed for automation; 54 passed for welfare. Tests cover midnight schedules, feeder stock exhaustion and event deduplication, online/offline equivalence, heater/CO₂/light durations, 90-day well-cared vs neglected Balanced, Relaxed, Challenge deaths, live-only mortality and care recovery. Full 90-day populated cases take approximately 2.5s on this cloud CPU; final benchmark is measured in RT-6.
