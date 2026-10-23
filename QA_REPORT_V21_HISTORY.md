# AQUASCAPE 3D — V2.1 QA report

Ngày kiểm tra: 23/10/2026, Asia/Bangkok. Dự án mở rộng tại `aquascape-3d`, giữ nguyên source game tu tiên ở thư mục cha. Báo cáo cũ được giữ ở `QA_REPORT_V01_HISTORY.md`; không dùng kết quả 0.1 để chứng nhận tính năng V2.1.

## Kết quả

- TypeScript, ESLint và production build: **đạt**.
- **65 unit tests đạt**, gồm 26 kiểm tra hồi quy cũ và 39 kiểm tra mới về clock, lifecycle, automation, welfare, persistence, presentation và benchmark.
- **8 luồng browser phát triển đạt**: builder/raycast/drag/history/save/responsive; care/Creative/pause/Zen/import; missing GLB; catch-up 30 ngày + báo cáo + preview isolation; multi-tab/takeover; migration/checkpoint recovery; active clock jump; tablet touch.
- **1 browser production/PWA test đạt trên bản build cuối**: repository subpath, service-worker control, ngắt mạng rồi reload và tiếp tục hồ.
- Tổng cộng **13 browser workflows đã đạt** (12 development + 1 production); không có required test còn thất bại. Đã xuất bản bản build vào repository công khai riêng `r0bjn10-maker/aquascape-3d`; deployment run `39863046597` thành công. Public smoke check trên viewport cảm ứng 390×844 đạt: HTTP 200, mở hồ mẫu 74 đối tượng, lưu/tải lại giữ bố cục, không page error hoặc tràn ngang. Xem `qa/public-deployment.json` và `qa/public-phone.png`; lần kiểm tra này dùng Playwright TLS-verified fetch với CA proxy của nền tảng, không tắt xác minh TLS, và không kiểm tra live service worker. Không kiểm thử thiết bị Apple/Windows vật lý. Không có test cơ chế sinh sản vì tính năng đó không thuộc bản này.

Default `npm run test:e2e` có thể báo skip bài production nếu chưa bật `AQUASCAPE_PRODUCTION=1`; bài đó phải được chạy riêng với preview server đúng subpath, không được tính skip là pass.

## Ma trận yêu cầu bắt buộc

| Yêu cầu | Bằng chứng |
|---|---|
| 1–5: 12h, 1/7/30/90 ngày | `realtime.test.ts`, `offline-benchmark.test.ts`; thêm mốc 3 ngày |
| 6: không double growth | UTC high-water mark/remainder unit tests và browser reload sau catch-up |
| 7: Creative tách Living | Browser không có ×20 trong Living, có tăng tốc/pause trong Creative |
| 8–9: timezone, rollback | Cùng UTC từ +07:00/Z cho cùng biology; rollback không trừ/cộng thời gian âm; forward >366 ngày và active wall jump được giữ để review |
| 10: độc lập FPS | 30/120fps so sánh water, cây và động vật của hồ populated; sai số số thực tối đa 1e-9 cho biology, 1e-5 giây cho tổng time |
| 11–14: cây/điều kiện/giới hạn | Light/nutrient/temperature/CO₂ conditions, logistic growth, spread/height bounds, 90-day tests |
| 15: morphology 3D | Unit 4 stage + screenshot/render counter thực trước/sau 30 ngày |
| 16–17: tỉa/save | Trim timestamp/branches/regrowth; serialization và reload giữ biology |
| 18–22: cá/tép | Tuổi, size tăng theo loài, adult cap, stress, immediate restore bounds và movement 6.000 bước |
| 23–28: hệ sinh thái | Waste/filter/CO₂/oxygen/algae/heater, finite feeder stock, recursive finite-number assertions và nonnegative state |
| 29–35: Balanced/welfare | Default, well-cared 90d, neglect có hậu quả, không chết hàng loạt offline, recovery, Relaxed/Challenge, care save và không retroactive replay |
| 36–39: persistence | Schema-1 không hồi tố, journal exception/checkpoint, corrupt primary browser recovery, exclusive tabs + takeover, current JSON equivalence |
| 40: online/offline | Cùng scheduler/event boundaries cho kết quả tương đương khi welfare floors không kích hoạt. Khi floor offline kích hoạt, khác biệt với live là chủ ý thiết kế |

## Bằng chứng hình ảnh/sinh học

`qa/v21-welcome-back.png`: bảng so sánh thật. `qa/v21-time-lapse.png`: cảnh dự đoán trên bản sao, không ghi vào hồ chính. `qa/v21-care.png`: chăm sóc/Creative. Các ảnh camera, chọn hardscape, trồng cây, phone viewport và tablet touch tiếp tục nằm trong `qa/`.

`qa/v21-visual-growth.json` ghi renderer trước/sau 30 ngày: **115.932 → 144.612 tam giác**, cá mẫu **1,26 → khoảng 2,94 cm**. Thay đổi thể hiện bằng số lá/thân/cụm và tỷ lệ model; không chỉ tăng text progress. Kích thước là từ biological state, renderer áp dụng cho thân/đuôi/stripe/mắt. Cá có thể ở vị trí khác vì chuyển động độc lập; không phát lại đường bơi offline.

Preview được kiểm tra cả age/coins/layout lẫn pose persistence: các lần save trong lúc đang preview giữ pose cache chính, không chép quỹ đạo/biological prediction vào primary. UI không có nút auto-apply prediction.

## Benchmark CPU offline

Hồ mẫu: **74 vật thể, 18 cá/tép**, 60s canonical step, không renderer. `npm run benchmark` ghi `qa/offline-benchmark-v21.json` với Node/CPU và số đo thực. Tất cả giây của khoảng đã yêu cầu đều được xử lý; event list giới hạn 40 nhưng activity totals/food consumption không bị bỏ.

| Vắng mặt | Thời gian CPU đo được | Số bước | Thời gian xử lý |
|---|---:|---:|---:|
| 1 ngày | 56.2 ms | 1,440 | 86,400 giây |
| 7 ngày | 206.9 ms | 10,080 | 604,800 giây |
| 30 ngày | 785.3 ms | 43,200 | 2,592,000 giây |
| 90 ngày | 2345.3 ms | 129,600 | 7,776,000 giây |

Đây là CPU cloud AMD EPYC 9V74 / Node 24.19.0, không phải benchmark điện thoại. Catch-up 90 ngày tạm giữ main thread vài giây trong bản hiện tại; chưa chuyển sang Worker. Không có bước mô phỏng từng frame, không tạo object/mesh mới vô hạn. Kho feeder không âm, hết kho không tiếp tục feed.

## Đồ họa production

`qa/performance.json` ghi renderer thực, Low preset, viewport 1280 × 900, ANGLE/SwiftShader. Bản build cuối ghi 4 mẫu: 7 fps · 134.1 ms · 52 calls · 115,932 tris · 1 tex; 8 fps · 125.0 ms · 52 calls · 115,932 tris · 1 tex; 7 fps · 153.4 ms · 52 calls · 115,932 tris · 1 tex; 8 fps · 129.6 ms · 52 calls · 115,932 tris · 1 tex. Không suy diễn thành 60fps desktop/30fps mobile. Không báo memory GPU vì không đo đáng tin cậy.

## An toàn dữ liệu và giới hạn

- Save schema 2, cùng key cũ, migration giữ layout/growth/coins và thiết bị. Save cũ không có UTC nên baseline khởi tạo tại migration, không cộng ngày tưởng tượng.
- Web Lock có trước catch-up/commit. JSON primary replace atomic, previous checkpoint hợp lệ và revision CAS. Unit fault-injection mô phỏng lỗi write/quota; browser kiểm tra primary bị hỏng rồi recovery. Chưa thực hiện kill OS đúng giữa một write; edit chưa autosave vẫn có thể mất trong cửa sổ ~700ms. Không tuyên bố zero-loss cho mọi lỗi phần cứng.
- Một tab ghi; tab khác chỉ xem/xuất. Web Locks/storage thiếu hoặc origin không secure dùng read-only fallback. Đã kiểm tra Chromium; chưa xác nhận Safari/iPad/iPhone thật.
- Clock live dùng monotonic; khi đóng dùng UTC. Active jump >5 phút gắn review, rollback không reset high-water mark. Gap offline >366 ngày cần xử lý explicit chunk/rebase, không tự cấp thời gian vô hạn. Không server nên không thể xác thực mọi chỉnh đồng hồ có vẻ hợp lý khi app đã đóng.
- Balanced floors chỉ áp dụng catch-up, không làm bất tử khi đang chơi. Challenge phải chủ động chọn. Creative protection là tùy chọn riêng. Care change flush phần lẻ cũ, không replay khoảng trước dưới chế độ mới.
- Before-world/report giữ một bản trong memory, không lưu vô hạn PNG. Sau reload ngắn không bảo đảm giữ báo cáo cũ; checkpoint dùng phục hồi, không phải lịch sử gallery.
- Model/texture vẫn là procedural fallback. Tép chưa có rig chân/antenna chuyên nghiệp; va chạm, bám hardscape và runner là xấp xỉ. Cụm con chưa có ID/edit độc lập. Chưa có sinh sản, bệnh học, tuổi già hay nghiên cứu hóa học nước thật.
- Auto/Low/Medium/High vẫn có. Auto giảm DPR khi thấp FPS; chưa có LOD nhiều tầng hoặc benchmark thiết bị thật. PWA/SVG icon và WebGL context recovery chưa được chứng nhận trên mọi iOS.

## Các lỗi được chẩn đoán trong QA

- So sánh triangle count sau 7 ngày không nhất thiết tăng vì growth có thể đổi kích thước trong cùng stage. Bài render chuyển sang 30 ngày để vượt mốc stage thật, vẫn giữ assertion tăng geometry; 7 ngày tiếp tục được unit-test đầy đủ.
- FPS comparisons có chênh floating-point khoảng 1e-14 giây age. So sánh organism fields dùng độ chính xác 1e-9 đã định nghĩa; không bỏ assertion hay bỏ organisms khỏi test.
- Bài stress trước đây quan sát 7 ngày sau khi lọc đã phục hồi nước, nên không còn stress. Fixture được đổi để đo giai đoạn môi trường xấu ban đầu và có test CO₂ quá cao riêng.

## Tái lập

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run benchmark
npm run build
PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- e2e/builder.spec.ts e2e/living.spec.ts e2e/realtime.spec.ts e2e/touch.spec.ts
```

Production: giữ `npm run preview -- --port 4173 --base=/aquascape-3d/` đang chạy, rồi:

```sh
AQUASCAPE_PRODUCTION=1 PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- e2e/production.spec.ts
```

**Implemented:** RT-1…RT-6 core. **Tested:** các cơ chế và workflow liệt kê trên. **Partial:** final art/precise mesh collision/full botanical morphology/native-device compatibility. **Not implemented:** server/cloud sync, reproduction, scientific chemistry, background OS execution (không cần cho catch-up). **Blocked:** không có blocker môi trường hoặc credential; cần thiết bị thật để xác nhận các mục tiêu hardware FPS/iOS.

## QC sau xuất bản

Đã sửa 2 lỗi giao diện về viewport thấp/điện thoại ngang và tiêu đề chồng bộ điều khiển xem trước. Thêm 4 regression tests responsive; kiểm tra bản build và bản công khai ở 5 cỡ màn hình đều đạt. Chi tiết và giới hạn: [QC_REPORT.md](QC_REPORT.md).
