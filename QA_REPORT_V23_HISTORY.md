# AQUASCAPE 3D 2.3 — Cloud Save & Sync QA

## Phạm vi và trạng thái

Nâng cấp trực tiếp 2.2; không đổi framework, schema World vẫn 2. IndexedDB thay localStorage làm nguồn offline chính, có migration giữ save cũ. Supabase Auth + CAS/versioning + backup là lớp cloud tùy chọn. Living 1:1 + Balanced giữ mặc định.

Project Supabase thật chưa được cấp trong môi trường. **Không tuyên bố đã cấu hình database production, gửi email thật hoặc kiểm thử thiết bị vật lý.** [CLOUD_SAVE_GUIDE.md](CLOUD_SAVE_GUIDE.md) ghi đầy đủ SQL/SMTP/redirect/public config cần chủ game thực hiện. Bản game vẫn chơi cục bộ khi chưa kết nối.

## Kiểm tra đã thực hiện

TypeScript, ESLint, 117/117 unit/integration tests và production build đã đạt. 21 luồng browser dev đã đạt qua bộ suite và các lượt chạy lại có mục tiêu sau sửa; các lỗi quan sát ban đầu đều đã được xử lý. Production/PWA đã đạt trên build cuối (22 luồng khác nhau tổng cộng); public smoke ghi riêng trong `qa/cloud/release.json`. Không tính test bị skip hoặc lượt chạy lại thành workflow mới.

| Phạm vi | Bằng chứng |
|---|---|
| Offline journal | IndexedDB thật trên browser, fake-indexeddb ở unit; migration legacy không cấp thêm thời gian; atomic primary/checkpoint; abort giữ dữ liệu; stale writer bị chặn; corrupt primary recover; IDB ưu tiên hơn mirror cũ |
| Cross-device | 3 kho độc lập chuyển toàn bộ layout, terrain, equipment, coins, plant/fish IDs và progression; Chromium profiles mô phỏng Windows/iPhone/iPad, không thiết bị vật lý |
| Cloud CAS | Một winner cho cùng base; nhánh người chơi thua giữ local và báo conflict; không last-write-wins, không merge coins/time |
| Idempotency | HTTP response bị hủy sau server commit; exact pending ID/snapshot giữ trong IndexedDB qua reload/đăng nhập lại, retry không tạo lần ghi trùng |
| Race | Edit trong lúc pull; edit sau pending/lost ACK; auth đổi trong request; linked save không gửi sang tài khoản khác; ACK chỉ xóa dirty của snapshot đã được nhận |
| Time | Canonical high-water mark, rebase nhánh chỉ tiến thời gian, không cộng hai catch-up; stale time-only pending có thể retry từ canonical; server reject UTC lùi/future >5 phút |
| Auth | SDK thật, magic link PKCE + callback, persist sau reload, signout/relogin và email OTP dự phòng; refresh khi session cached hết hạn; callback tab mới giữ tab chơi là writer |
| RLS/SQL | Migration thực thi trên PGlite/PostgreSQL: UID riêng, SELECT bị lọc; INSERT/UPDATE trực tiếp bị revoke; anon không gọi RPC; request ledger không đọc trực tiếp; SECURITY DEFINER có actor check/search_path rỗng |
| Backup | 10 local trước thay thế/import/restore và checkpoint; 20 cloud versions; tải JSON; phục hồi local tách sync; SHA256 receipt và 100 request retention |
| Payload/keys | Schema whitelist giữ toàn bộ World known fields, bỏ unknown model/texture blobs; public/anon key hợp lệ, reject secret/service-role và HTTP remote; build cũng validate cấu hình |
| Regression | Builder/terrain/transform/history, plants/fish assets/quality, care/preview/UTC, schema1 migration, corrupt primary recovery, exclusive tabs, touch/responsive, PWA subpath/offline |

## Mô hình môi trường kiểm thử

Unit/integration dùng Node, fake-indexeddb và PostgreSQL nhúng PGlite (SQL thật). Auth.uid trong SQL tests đọc JWT claim giả lập, không tự chứng nhận chữ ký Supabase. Browser dùng Supabase JS SDK thật với HTTP Auth/PostgREST fake tại `aquascape-test.supabase.co`, không gửi request ra project thật; route mô phỏng CAS/receipt và sự cố response. Không thay engine/journal thật bằng mock. RLS kiểm tra ở SQL suite riêng, không suy từ HTTP mock ra bảo mật production.

Live/public smoke chỉ xác nhận bản phát hành không cấu hình cloud vẫn mở, lưu/import/export và giữ layout trên 5 viewport. Email deliverability, Auth rate limits, redirect thực tế, RLS giữa hai user Supabase thật, Safari/Edge và mạng/thiết bị vật lý cần được xác nhận sau khi project được cấu hình.

## Những lỗi đã sửa trong quá trình QA

- Nút “Tiếp tục hồ đã lưu” trước đây phụ thuộc `saved` nên biến mất khi live tick đánh dấu dirty. Thêm `hasSavedWorld` để nút dựa trên sự tồn tại của save, độc lập autosave.
- Trạng thái Đã đồng bộ cũ có thể còn hiện trong khoảng manual sync đang bắt đầu hoặc sau edit. Đánh dấu Đang đồng bộ ngay khi yêu cầu/chỉnh sửa, tránh đổi máy dựa trên kết quả cũ.
- Magic link thường mở tab mới. Tab chỉ xem vẫn khởi tạo Auth/đổi mã; chỉ tab giữ writer lock mới có coordinator ghi hồ. Session qua SDK chia sẻ sang tab chơi.
- Lượt test gửi email phải chờ SDK báo gửi thành công trước khi điều hướng callback; nếu rời trang khi request đang chạy có thể hủy PKCE request. Test JWT dùng base64url đúng định dạng và expiry cố định.
- So sánh bố cục giữa máy dùng trường layout, đồng thời kiểm tra progression theo thời gian thực; không yêu cầu cây đứng yên khi game Living tiếp tục tăng trưởng.
- Lưu thủ công luôn chụp cả pose cá hiện tại, hiển thị trạng thái đang lưu trước khi commit async; không bỏ qua chỉ vì chưa có biological tick. Export historical backup dùng snapshot gốc, không chép pose live vào bản lịch sử.
- Browser regression fixtures được chuyển sang IndexedDB để thực sự kiểm tra nguồn lưu mới; chỉnh mirror localStorage không còn thay hồ. Test lưu chờ xác nhận commit async thay vì coi keypress là commit hoàn tất.

## Giới hạn còn lại

Một tài khoản đồng bộ một hồ đang chơi. Không có live multi-user editing, field merge, server biology hay chống gian lận đầy đủ. Thay đổi có chủ ý trên hai nhánh cần người chơi chọn bản. Các write được CAS và clock guard bảo vệ nhưng biology offline vẫn chạy trên thiết bị. Không bảo đảm upload sau khi app đã bị OS đóng; chờ Đã đồng bộ trước khi đổi máy. Checkpoint và autosave không bảo đảm giữ edit chưa commit nếu OS kill trong khoảng debounce/10s. Backup trong cùng project/browser không thay bản export độc lập.

117 tests không chứng minh mọi Safari/iOS/Windows version tương thích; cloud software WebGL không chứng nhận 30/60 FPS. Artwork vẫn procedural fallback như 2.2; không có GLB chuyên nghiệp mới. Báo cáo đồ họa trước: QA_REPORT_V22_HISTORY.md.

## Chạy lại

Xem CLOUD_SAVE_GUIDE.md và package scripts. Dev workflows: `PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- --grep-invert production`. Production/PWA phải chạy riêng với `AQUASCAPE_PRODUCTION=1` và preview server cổng 4173/subpath `/aquascape-3d/`. Public smoke dùng scripts/qc-public.mjs với xác minh TLS; không kiểm tra live cloud backend nếu chưa có cấu hình.

## Xuất bản và kiểm tra link thật

[GitHub Pages run 39899471162](https://github.com/r0bjn10-maker/aquascape-3d/actions/runs/39899471162) thành công; web commit `210131150500414d6f6dbb99c87bead75c32f2a0`. Public smoke 5/5 đạt: 390×844, 360×640, 844×390, 640×360 và 1280×900. HTML khớp build cuối; WebGL, thao tác chăm sóc, lưu, JSON export/import và reload giữ bố cục; không page error/HTTP lỗi/tràn ngang. Dùng TLS xác minh qua CA của nền tảng; service workers chặn trong public smoke, PWA offline được kiểm tra riêng trên production local. Xem `qa/cloud/public/results.json` và ảnh thật cùng thư mục. Bản live không có project Supabase mặc định; người chơi có thể nhập cấu hình công khai trong Cloud Save sau khi chủ project chạy SQL/Auth setup.
