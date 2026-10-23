# QC Aquascape 3D — 22/10/2026 UTC

**Kết quả:** các luồng đã kiểm tra đạt sau khi sửa 2 lỗi giao diện. Bản sửa đã triển khai tại https://r0bjn10-maker.github.io/aquascape-3d/.

Public commit: `0dd5c15ce44ad1bd7ffda2ed48714ee822fd378a`. GitHub Pages run [39863046597](https://github.com/r0bjn10-maker/aquascape-3d/actions/runs/39863046597) thành công. Chỉ `src/ui/style.css` thay đổi so với mã nguồn trước QC; logic sinh học và định dạng save được giữ.

## Lỗi đã sửa

| Mã | Mức độ | Hiện tượng | Bản sửa |
| --- | --- | --- | --- |
| QC-001 | P2 — ảnh hưởng sử dụng | Điện thoại ngang và cửa sổ thấp: chiều cao tối thiểu 500/580 px đẩy các nút ra ngoài màn hình; khung bắt đầu, chăm sóc và thuộc tính có thể bị khuất. | Giới hạn chiều cao theo viewport, cho nội dung bảng cuộn, bố trí lại các bảng trong cửa sổ thấp. Bổ sung 4 ca kiểm tra hồi quy. |
| QC-002 | P3 — giao diện | Bộ điều khiển xem trước thời gian chồng lên tiêu đề trang trí khi đang chơi. | Thu gọn phần tiêu đề trang trí khi hồ đã bắt đầu; giữ điều khiển xem trước rõ ràng. |

## Kiểm tra đã đạt

| Nhóm | Kết quả |
| --- | --- |
| Typecheck, lint, production build | Đạt |
| Unit tests về mô phỏng, thời gian, save, chăm sóc, tự động hóa | 65/65 |
| Các workflow development hiện có | 8/8 |
| Hồi quy responsive mới: 844×390, 640×360, 1280×600, 390×844 | 4/4 |
| Production/PWA: mở hồ, lưu và tải lại khi mất mạng | 1/1 |
| Kiểm tra bản build trên 5 cỡ màn hình | 5/5 |
| Kiểm tra link công khai trên 5 cỡ màn hình | 5/5 |

5 cỡ màn hình: 390×844, 360×640, 844×390, 640×360 và 1280×900. Mỗi lượt kiểm tra bản build/công khai xác nhận HTML khớp bản build, WebGL có render, bảng bắt đầu trong màn hình, thao tác cho ăn cập nhật trạng thái, xuất/nhập JSON và tải lại giữ bố cục, không page error hoặc HTTP lỗi, không tràn trang theo chiều ngang/dọc.

Các workflow hiện có kiểm tra thêm: sửa nền, đặt/di chuyển/nhân bản vật thể, undo/redo, trồng cây bằng cảm ứng, Creative và Living, Zen, import hỏng, model dự phòng, vắng mặt 30 ngày, cách ly Time-Lapse preview, nhiều tab, chuyển save cũ, checkpoint và nhảy đồng hồ.

## Bằng chứng và giới hạn

- [Dữ liệu kiểm tra công khai](qa/qc/post-public/results.json), [ảnh điện thoại](qa/qc/post-public/phone.png), [ảnh điện thoại ngang](qa/qc/post-public/landscape.png).
- [Kiểm tra bản build](qa/qc/built-release/results.json), [manifest bản phát hành](qa/qc/release.json).
- Kiểm tra public dùng Chromium mô phỏng viewport/cảm ứng. Request được chuyển qua `route.fetch` xác minh TLS với CA proxy do môi trường cung cấp; không tắt xác minh chứng chỉ. Service worker bị chặn riêng trong lượt public này. Offline/PWA được kiểm tra độc lập trên bản production phục vụ nội bộ.
- Chưa kiểm tra trực tiếp trên iPhone/Android thật, Safari thật hoặc xác nhận FPS trên phần cứng điện thoại. Cloud dùng software WebGL; số FPS cloud không đại diện cho điện thoại.
- Kết quả áp dụng cho các luồng và bản phát hành nêu trên; không phải cam kết game không còn lỗi.

## Chạy lại

```sh
npm run typecheck
npm run lint
npm test
PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- e2e/builder.spec.ts e2e/living.spec.ts e2e/realtime.spec.ts e2e/touch.spec.ts e2e/responsive.spec.ts
```

Giữ production preview tại cổng 4173 với base `/aquascape-3d/`, rồi chạy:

```sh
AQUASCAPE_PRODUCTION=1 PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- e2e/production.spec.ts
NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/environment-proxy-ca.crt node scripts/qc-public.mjs
```

Để nhận bản sửa trên thiết bị đã mở game trước đó, đóng các tab game rồi mở lại link; service worker mới kích hoạt sau khi phiên cũ kết thúc.
