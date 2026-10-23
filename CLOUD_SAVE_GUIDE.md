# Cross-Device Cloud Save & Sync — 2.3

## Trạng thái triển khai

Đã thêm Supabase JS SDK, email magic link/PKCE, mã email dự phòng, session persist/refresh, IndexedDB offline, migration save cũ, CAS cloud, pending request bền vững/idempotency, phát hiện xung đột, backup và giao diện trạng thái. Một tài khoản hiện đồng bộ **một hồ đang chơi**. Có thể chơi cục bộ không đăng nhập. Không chuyển framework hoặc thay engine Real-Time; Living 1:1 và Balanced vẫn mặc định.

**Chưa kết nối project Supabase thật:** môi trường không có Project URL, publishable key, tài khoản SMTP hay quyền quản lý Supabase. SQL được kiểm tra trên PostgreSQL nhúng; luồng browser dùng Supabase SDK thật với HTTP/Auth giả lập, IndexedDB thật và các profile Chromium độc lập. Không tuyên bố đã gửi email thật hoặc kiểm thử iPhone/iPad/Windows vật lý. Các bước dưới đây là phần cấu hình chủ project cần làm.

## Cấu hình Supabase cần thực hiện

1. Tạo một Supabase project. Trong **SQL Editor**, chạy toàn bộ `supabase/migrations/202610230001_cloud_saves.sql`. Script tạo 3 bảng, RLS và 2 RPC; không tắt RLS. Không tạo public Storage bucket: game chỉ gửi JSON với ID asset, không upload GLB/texture.
2. Trong **Authentication → Providers → Email**, bật email login. Thiết lập Site URL và Redirect URLs với địa chỉ chính xác `https://r0bjn10-maker.github.io/aquascape-3d/`. Khi phát triển, thêm URL dev riêng, ví dụ `http://localhost:5173/`; không thêm wildcard rộng không cần thiết. Tất cả máy cần mở cùng địa chỉ game.
3. Cấu hình **SMTP** cho email người chơi thực. Email thử mặc định của Supabase có giới hạn người nhận/rate limit; lỗi email không đồng nghĩa hồ bị mất. Trong template Magic Link giữ `{{ .ConfirmationURL }}` và nên thêm dòng mã `{{ .Token }}` để iPhone/iPad cài app màn hình chính có thể nhập mã nếu email mở sang Safari khác kho lưu trữ. Không đặt access/refresh token vào URL tùy chỉnh.
4. Lấy **Project URL** và **publishable key** (hoặc legacy anon key) từ Project Settings / API. Trong game mở Menu → Cloud Save → Kết nối Supabase, nhập hai giá trị công khai này. Thực hiện trên từng trình duyệt/thiết bị. Cách này dùng được ngay trên bản GitHub Pages đã build, không cần gửi khóa cho Codex hay rebuild.
5. Tùy chọn cấu hình chung lúc build: copy `.env.example` thành `.env.local`, điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`, rồi build/deploy lại. `.env.local` không được commit. Cấu hình build có ưu tiên hơn cấu hình nhập trong UI; để dùng cấu hình riêng từng trình duyệt, để trống hai biến build này. Đây là cấu hình **công khai**, có thể thấy trong bundle; tuyệt đối không dùng `service_role` hoặc `sb_secret_...`. UI và cấu hình build đều từ chối các khóa đó.
6. Trên Windows, iPhone, iPad, yêu cầu magic link bằng **cùng email** trên từng máy. Mở link trên đúng trình duyệt đã yêu cầu để PKCE tìm thấy verifier. Nếu email mở trình duyệt khác hoặc app Home Screen không chia sẻ storage với Safari, nhập mã email trong game ở mục “Đăng nhập bằng mã email”. Mỗi thiết bị có session riêng; không chuyển token giữa thiết bị. Nếu link mở tab mới trong cùng trình duyệt, tab đó hoàn tất Auth và tab chơi nhận session qua SDK; chỉ tab đang giữ quyền ghi mới đồng bộ hồ. Có thể đóng tab callback và quay về tab chơi.
7. Máy đầu tiên mở hồ muốn dùng và bấm “Đồng bộ hồ này”, chờ “Đã đồng bộ”. Trên máy mới đăng nhập rồi dùng “Tiếp tục hồ đã lưu”. Nếu máy mới đã có hồ cục bộ, game yêu cầu chọn hồ cloud hoặc giữ bản riêng; tải cloud luôn backup bản hiện tại trước.

## Cách đồng bộ và giải quyết xung đột

Sau thay đổi do người chơi, game lưu offline sau khoảng 700ms và thử cloud sau khoảng 1,8s. Có kiểm tra định kỳ 30s khi trang hiện, khi có mạng, khi focus và khi quay lại trang. Khi ẩn trang có best-effort flush; browser có thể dừng mọi JavaScript/network nên **không bảo đảm upload lúc đã đóng ứng dụng**. Trước khi đổi máy, chờ “Đã đồng bộ”. Trạng thái này xác nhận snapshot và các chỉnh sửa đã được nhận; clock live vẫn tiếp tục và được gửi theo chu kỳ, không upload từng frame. Tiến trình cục bộ autosave mỗi 10s; thao tác chưa commit trong khoảng autosave vẫn có thể mất khi OS kill đột ngột.

IndexedDB là nguồn offline chính. localStorage chỉ giữ cấu hình công khai, Supabase session và bản mirror save cũ để tương thích; xóa/chỉnh mirror không thay hồ đã có trong IndexedDB. Game nhập save localStorage schema1/2 đúng một lần khi chưa có IndexedDB. Migration giữ ID, bố cục, tiến trình và UTC; schema1 bắt đầu UTC mới, không tự cấp ngày quá khứ. Không xóa save cũ trong migration. Trình duyệt thiếu IndexedDB/Web Locks sẽ hiển thị chỉ xem/xuất JSON thay vì giả lập khóa yếu.

Mỗi hồ cloud có `version` tăng riêng, độc lập `world.clock.revision` dùng ở local. RPC nhận expected version, UUID request, UUID device và toàn bộ world JSON. Một transaction PostgreSQL khóa dòng, so version, giữ backup, ghi snapshot + version + receipt. Client không có quyền INSERT/UPDATE/DELETE trực tiếp bảng; chỉ RPC có xác thực được ghi. RLS chỉ cho đọc hồ/backup của `auth.uid()`.

Trước HTTP POST, pending request và **đúng snapshot đã gửi** được commit vào IndexedDB. Nếu mất response sau khi server đã ghi, lần sau gửi lại cùng ID/snapshot. Receipt trả lại version đã nhận trước đó, kể cả cloud đã có bản mới hơn. Các thay đổi cục bộ mới trong lúc gửi vẫn giữ dirty, được gửi ở lượt tiếp theo; không bị response cũ xóa mất. Ledger giữ 100 request gần nhất/tài khoản; retry quá cũ sẽ gặp CAS conflict, không nhân đôi dữ liệu.

Nếu cloud đã tiến và máy chỉ có tiến triển sinh học tự động, game thay cả nhánh thời gian từ bản canonical rồi catch-up từ UTC high-water mark của bản đó. **Không cộng hai kết quả catch-up lại với nhau.** Nếu có chỉnh sửa của người chơi trên cả hai nhánh, game báo Xung đột và giữ hồ offline. Không tự gộp tiền, cây, cá hay thao tác undo.

- **Dùng hồ cloud, sao lưu hồ này:** tải bản cloud mới nhất, lưu backup cục bộ, thay hồ/clear history/preview, catch-up từ clock canonical rồi ghi có điều kiện.
- **Giữ hồ này cục bộ:** tách nhánh riêng, dừng auto-sync cho nhánh đó; cloud giữ nguyên. Nút Đồng bộ hồ này có thể bật lại; nếu cloud đã có hồ sẽ lại yêu cầu chọn.
- **Xuất bản xung đột JSON:** giữ file độc lập trước khi chọn.
- Không có nút ép ghi đè cloud hoặc merge tự động. Muốn giữ cả hai, xuất JSON của nhánh riêng.

Server từ chối mốc `lastSimulatedUtc` lùi so với bản canonical hoặc vượt giờ server hơn 5 phút. Không hợp nhất elapsed, không reset version khi đổi máy, không tự áp dụng dữ liệu dưới tài khoản khác. Đây không phải server chạy biology hoặc hệ thống chống gian lận: đồng hồ offline vẫn đến từ thiết bị, engine và save vẫn chạy phía client.

## Backup và phục hồi

IndexedDB giữ checkpoint atomic cùng primary, cùng metadata/link/pending. Giữ tối đa 10 backup khi tải cloud, nhập JSON, tách xung đột hoặc phục hồi. Nếu primary hỏng, boot dùng checkpoint hợp lệ; nếu cả hai hỏng, game không tự ghi đè và cung cấp chế độ chỉ xem/xuất. Menu → Backup và phục hồi cho xuất hoặc phục hồi các bản local; phục hồi tạo nhánh cục bộ riêng để không đẩy một trạng thái lịch sử lên canonical một cách âm thầm.

Cloud giữ 20 phiên bản trước mỗi lần ghi thành công. Trong Menu có “Tải danh sách backup cloud” và tải từng bản JSON, được RLS bảo vệ. Nhập JSON bằng chức năng cũ; giữ bản hiện tại trước khi nhập. JSON chứa toàn bộ layout/biology, không chứa Supabase access token, refresh token, config key hoặc model binaries. Backup cùng project/browser không thay thế bản export độc lập nếu xóa project, tài khoản hoặc dữ liệu trình duyệt.

## Session và bảo mật

Supabase Auth chịu trách nhiệm xác thực email, cấp/refresh token. SPA dùng PKCE, session persistence của SDK và HTTPS; refresh tự động, refresh khi foreground do SDK, đăng xuất chỉ thiết bị hiện tại. Mã email là fallback chính thức của Supabase, không tự xây OTP. Token không nằm trong World/JSON export/cloud backup/logs, không cần service-role key. Referrer policy no-referrer. SPA không có cookie HttpOnly/backend riêng; session SDK lưu trong browser nên vẫn cần bảo vệ origin khỏi XSS và chỉ đưa mã nguồn/asset tin cậy lên hosting. RLS/SQL phải được chạy trước khi dùng cloud.

Đổi tài khoản không tự upload hồ liên kết với người trước sang tài khoản mới. Request đang bay được kiểm tra auth generation trước khi ACK/apply; pending thuộc account cũ vẫn ở IndexedDB để recover khi đăng nhập lại. Chỉ tab có Web Lock mới ghi/sync, tab khác chỉ xem. Không thêm analytics hoặc gửi email trực tiếp từ frontend ngoài Supabase Auth theo thao tác đăng nhập của người chơi.

## Kiểm thử và việc cần kiểm tra trên project thật

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
PW_TEST_SCREENSHOT_NO_FONTS_READY=1 npm run test:e2e -- --grep-invert production
```

Các bài kiểm tra mới: journal IndexedDB/migration/transaction abort/stale writer/backup bounds; chuyển 3 store; CAS conflict; lost ACK + reopen/relogin; mất mạng; giữ local; backup trước tải cloud; đổi tài khoản; auth đổi trong request; edit trong lúc pull; public-only keys; schema whitelist. SQL thực thi trên PGlite/PostgreSQL kiểm tra RLS, privilege, CAS, idempotency, clock rejection và backup retention. Browser dùng SDK thật + mock HTTP Auth/PostgREST, không thay SyncEngine bằng mock.

Sau cấu hình Supabase thật, chủ project cần xác nhận email đến được, magic link/mã email đúng trên Safari/Edge/iPad, refresh session sau hết hạn, RLS giữa hai tài khoản thật, mất Internet thật và chuyển thiết bị. Nếu muốn Codex chạy kiểm tra endpoint cloud từ môi trường này, cần cho phép đúng hostname project trong network policy; hiện không có Supabase hostname được cấu hình. Không gửi secret/service-role key để làm việc đó.
