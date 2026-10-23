# AQUASCAPE 3D 2.2 — Graphics Phase 1 QA

Ngày kiểm tra: 2026-10-23 UTC. Nâng cấp trực tiếp React/Three/R3F hiện có; không đổi framework, không tạo game khác. Báo cáo 2.1 lưu riêng tại QA_REPORT_V21_HISTORY.md và QC_REPORT.md. Kết quả bên dưới thuộc code 2.2.

## Kết quả build và test

- TypeScript, ESLint và production build: đạt. Build precache 72 tài nguyên ~1.87 MiB; JS chính 1.27 MB trước gzip / ~367 KB gzip. Cảnh và dữ liệu hoạt động không cần tải asset bên ngoài.
- 93/93 unit tests đạt: 65 hồi quy + 28 graphics/assets/biology/capacity/collision/save tests mới. Test cả 15 hình lá, 11 sinh vật khác hình, 33 hardscape variants, finite geometry, kích thước chuẩn hóa, seeded maps, stage morphology, placement/save tất cả asset, 2 ngày biology mọi loài, corrupt import và hồ mẫu schema 2 cũ.
- 16/16 browser workflows phát triển và 1/1 production PWA workflow đạt (17 luồng khác nhau). Dense cleanup test được chạy thêm sau khi đổi sang snapshot telemetry cùng một thời điểm và chờ đúng cảnh render; lượt này cũng đạt. Không tính lượt chạy thêm thành một workflow mới. Kết quả/hash xuất bản nằm trong `qa/phase1/release.json`.

## Ma trận kiểm thử

| Phạm vi | Kiểm tra thực tế / giới hạn |
|---|---|
| Kính/nước/ánh sáng | 5 lighting presets, front-glass persistence, 3 quality levels render không shader error; camera front/quarter/top/free; ảnh cảnh thật trong qa/phase1 và qa |
| Đá/lũa | 6 × 3 đá + 5 × 3 lũa khác geometry/nhánh; bounds nằm trong placement envelope; chọn biến thể/scale thật qua UI, di chuyển/xoay/xóa/undo qua builder test |
| Cây | 15 profile lá/layout có signature khác nhau, growth nhiều stage và foliage instancing; foreground/midground/background/moss filter; moss gắn stone, variant/attachedTo giữ sau reload |
| Cá/tép | 10 cá và tép riêng hình, body/tail/fin/marks; đủ 11 species mua từ UI; 6.000 bước movement + isolated/overlapping stone tests; speed/zone/schooling theo profile |
| Catalog | 42 registry entries, 64 WebP local HTTP200/RIFF, fallback status rõ; tìm slate/Christmas, nhóm cây/tầng bơi, ghost scale |
| Save | Hồ cũ schema2 parse/roundtrip đúng 74 vật thể/Balanced; variant/appearance tùy chọn; import mới, reload, checkpoint, tab lock, migration và preview isolation qua hồi quy |
| Tương tác | Terrain/brush, drag, scale/rotate/duplicate/delete/undo/redo/save, chạm tablet/phone, 4 viewport thấp/ngang qua responsive tests |
| Tải model lỗi | Ép URL GLB không tồn tại tại runtime; fallback vẫn hiển thị và không hỏng scene. Test route nhận cả query Vite `?t=` |
| Hồ dày/cleanup | Import/reset 2 chu kỳ: 45 cụm cây, 7 hardscape, 66 cá/tép. Renderer.info trở về baseline sau cleanup; chi tiết `qa/phase1/resource-cleanup.json` |
| Offline PWA | Test riêng bản production ở `/aquascape-3d/`, service worker control, ngắt mạng/reload/tiếp tục, layout không mất |
| Public | Đạt 5/5: 390×844, 360×640, 844×390, 640×360, 1280×900. HTML khớp build, WebGL, chăm sóc, save/JSON export/import/reload, không page error/HTTP lỗi/overflow. TLS xác minh; service workers chặn ở smoke này |

## Đo hiệu năng và tài nguyên

`qa/performance.json`: số đo production Low, renderer/viewport/user-agent và 4 mẫu frame thực. `qa/phase1/resource-cleanup.json`: số geometry/textures và calls/triangles/FPS của dense/cleared cảnh qua 2 chu kỳ. `qa/offline-benchmark-v21.json`: benchmark CPU kernel hồi quy vẫn dùng cùng biology; số mới được ghi bởi unit suite.

Production Low 1280×900: 6–7 FPS, 51 calls, 78.108 triangles, 3 textures; đây là software rendering. Dense 45 cây/7 hardscape/66 sinh vật: 83 calls, 111.864 triangles; 29 → 73 → 29 geometries và 3 textures qua cả hai chu kỳ import/reset. Snapshot từng cảnh đọc thống nhất và chờ renderer đổi đúng scene. Cloud dùng ANGLE/SwiftShader software WebGL, không có GPU điện thoại. Cảnh dense có thể chậm rõ khi compile shader ban đầu. Không suy từ kết quả cloud thành 60 FPS desktop/30 FPS mobile; hai mục tiêu này **chưa được xác nhận trên thiết bị thật**. Renderer.info.memory.geometries/textures là số resource đang theo dõi, không phải VRAM byte hay phép đo mọi loại memory leak.

Low đã giảm DPR và topology lá/cá, bỏ shadow/PMREM/caustics, dùng kính basic; Medium/High có phản chiếu và bóng. Auto giảm xuống Low khi nhiều mẫu dưới 25fps. Vẫn giữ builder/camera/touch. Screenshot kiểm thử có thể hiển thị frame compile chậm; xem samples ổn định trong report thay vì coi một ảnh là benchmark.

## Bằng chứng hình ảnh

`qa/phase1/showcase-medium.png` chụp scene nhiều loài ở Medium; `catalog-phone.png` chụp thư viện trên viewport 390×844 sau khi ảnh giải mã đầy đủ; cấu hình và lỗi console nằm trong `screenshots.json`. Ảnh chụp browser thật, không dùng ảnh quảng cáo/render bên ngoài: `lighting-daylight/warm/cool/evening/night.png`, `expanded-interaction.png`, `dense-scene.png` trong `qa/phase1`; ảnh camera, builder, touch và production ở `qa/`. Preview catalog là ảnh raster hóa chính geometry trong mã, không được dùng thay screenshot game. Các ảnh mới có thể khác số đo lịch sử 2.1 do đổi geometry/LOD và giờ đèn thực tế.

## Trạng thái artwork và giới hạn còn lại

- **0 final professional assets; 42 procedural fallback; 0 mục chỉ thêm tên.** 10 cá + tép có hình học khác nhau; 15 cây có shape/layout riêng. Tất cả `model:null` là chủ ý. Registry/ASSET_GUIDE.md liệt kê từng asset và ngân sách. Chưa kèm GLB được model/rig bởi artist, chưa có pipeline cá GLB/skinned animation.
- Kính dùng transparency/ordering xấp xỉ; không ray tracing/refraction vật lý. Preview thiết bị là khối minh họa; các model thiết bị giữ renderer cũ. Lá/gỗ/đá procedural chưa đạt độ thực ảnh chụp hoặc morphology nghiên cứu thực vật. Chưa có whole-body skinning cho cá, vây đuôi dùng geometry/rotation.
- Fish chống xuyên kính/hardscape bằng envelope + projection, không phải triangle collider. Envelope lũa bảo thủ khiến cá tránh cả khoảng rỗng. Chưa mô phỏng lãnh thổ Betta/tương thích loài đầy đủ, không phải hướng dẫn nuôi cá thật.
- Giữ hạn chế engine trước: biology là chỉ số game, không ppm/mg/L; catch-up CPU đồng bộ có thể giữ UI vài giây; Web Locks cần để ghi; không cloud sync/sinh sản. Save cũ/schema2/UTC/care mode được giữ. Cụm con cây vẫn thuộc mẹ.
- Đã chạy Chromium touch emulation; chưa có iPhone/Android/iPad vật lý hoặc Safari/Windows thực. Cần thiết bị thật để xác nhận FPS và tương thích iOS. Không có credential/deployment blocker trong phạm vi đã kiểm tra.

## Tái lập

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- --grep-invert production
# Giữ preview server ở terminal khác:
npm run preview -- --port 4173 --strictPort --base=/aquascape-3d/
AQUASCAPE_PRODUCTION=1 PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- e2e/production.spec.ts
```

Chromium: `/usr/bin/chromium` hoặc `CHROMIUM_PATH`. Public QC: `node scripts/qc-public.mjs` sau deploy; cloud proxy CA phải được Node tin cậy qua `NODE_EXTRA_CA_CERTS`, script vẫn xác minh TLS. Live smoke chặn service workers để đối chiếu đúng build; offline PWA được kiểm tra riêng trên production local.

## Xuất bản bản 2.2

GitHub Pages deployment [39877643642](https://github.com/r0bjn10-maker/aquascape-3d/actions/runs/39877643642) thành công, build commit `7c439eea47612c3ab9e35ce2e85b988bf40e9d29`. [Chơi trực tiếp](https://r0bjn10-maker.github.io/aquascape-3d/). Public smoke 5/5 đạt trên đúng HTML build; chi tiết request/check/ảnh và JSON xuất thử nằm tại `qa/phase1/public/`. PWA đã kiểm tra riêng bằng production local khi offline; không tuyên bố live service worker đã được smoke kiểm tra. Source Aquascape độc lập được bàn giao trên nhánh main, compiled web trên gh-pages.
