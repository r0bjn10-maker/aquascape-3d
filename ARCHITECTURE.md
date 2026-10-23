# AQUASCAPE 3D 2.2 — Architecture

## Các ranh giới

`app/ui` quản lý giao diện; Zustand quản lý world và công cụ. Renderer R3F/Three dùng instancing cho lá, thân/runners và cá. Animation không setState mỗi frame. `data` là registry asset và balancing riêng theo loài/thiết bị/care mode. `game/simulation` độc lập React/Three/WebGL, không dùng RNG không kiểm soát.

`World` schema 2 lưu layout/terrain, biology, nước, thiết bị/lịch/kho, seed, achievements, care mode và clock. Kích thước vật lý cm tách khỏi world units (1 unit = 10cm), X ngang, Y cao, Z sâu. `persistence/migration.ts` giữ bố cục/growth của schema 1, bổ sung baseline UTC hiện tại và metadata còn thiếu, không tự giả định nhiều ngày quá khứ.

## Thời gian và scheduler

`realTime.ts` có monotonic live clock và UTC offline catch-up. `clock.lastSimulatedUtc` là high-water mark thời gian thực; `simulationUtc` là timeline lịch (Creative có thể tăng tốc); `seconds` là tổng game time. Canonical biology step 60s, remainder được lưu. Các mốc đèn/CO₂/feed trong một bước chia bước tại biên sự kiện, hỗ trợ nửa đêm. Online/offline dùng cùng kernel. Đổi care/schedule flush phần lẻ cũ trước, tránh áp dụng cấu hình mới ngược về khoảng cũ.

`plantGrowth.ts`, `animalGrowth.ts`, `ecoStep.ts`, `automation.ts` cập nhật biological state. `welfare.ts` tạo floor từ trạng thái đầu catch-up một lần cho cả khoảng, không reset floor sau mỗi phút. Balanced bảo vệ offline; live health vẫn có thể về 0. Creative protection là lựa chọn độc lập. Các thông số nằm trong `data/biology.ts`, `automation.ts`, `welfare.ts`.

Offline chạy một lần trên dữ liệu, không chạy renderer, không tạo mesh/object vô hạn. 90 ngày = 129.600 bước 60s; các event giữ tối đa 40 bản gần nhất nhưng tổng hoạt động không bị bỏ. Kho feeder bị trừ thực. Gap trên 366 ngày không tự xử lý; UI cho xác nhận từng chunk hoặc rebase rõ ràng, không âm thầm cắt thời gian thừa.

`ecosystem.ts` giữ helper sandbox tăng tốc cũ cho hồi quy/API tương thích; production Living Runtime dùng scheduler mới. Bộ test cũ không thay thế test của engine mới.

## Ghi dữ liệu và khóa tab

`save.ts` parse/migrate/validate toàn bộ terrain/transform/lifecycle/water/schedule/stock/clock và chống prototype keys. Không tin mù dữ liệu JSON. Invalid import không thay thế save hợp lệ.

`journal.ts` giữ Web Lock độc quyền theo origin trước khi catch-up/ghi. Một tab có quyền ghi; tab khác chỉ xem/xuất và có thể tiếp quản sau khi tab chủ đóng. Browser thiếu Web Locks/secure context dùng read-only fallback, không giả lập khóa bằng localStorage race-prone.

Dữ liệu hiện gọn, dùng localStorage: ghi checkpoint hợp lệ trước, rồi atomic primary JSON cùng revision/UTC mới. CAS revision từ chối writer lỗi thời. Nếu dừng trước commit, primary cũ/checkpoint vẫn dùng được; nếu đã commit, UTC mới ngăn double growth. Chỉ cập nhật scene sau khi catch-up commit thành công. Autosave sau edit yên khoảng 700ms, mỗi 10s và pagehide/visibility. Không bảo đảm giữ edit chưa commit nếu OS kill trong cửa sổ autosave; manual save/export vẫn có.

Clock lùi giữ high-water mark. Active wall-clock jump trên 5 phút được đánh dấu review, trong khi live vẫn dùng monotonic. Không có server nên không thể xác thực các chỉnh đồng hồ có vẻ hợp lý khi app đã đóng; không tuyên bố chống gian lận.

## Renderer và dự đoán

`visibleWorld` chọn world chính hoặc `state.preview`. Runtime, save journal và import/export luôn dùng world chính. Preview không có auto-apply, builder bị chặn khi preview. Fish poses của preview không được ghi vào cache pose chính; khi đóng preview khôi phục pose chính. Matrix lá/tỷ lệ cá nội suy giữa các trạng thái.

`report.ts` lấy snapshots/độ lệch thật, activity và tối đa 3 gợi ý. Một before-world/report giữ trong bộ nhớ cho so sánh 3D, không lưu vô hạn ảnh. Checkpoint là dữ liệu phục hồi, không phải lịch sử layout vô hạn. Lịch sử builder 40 bước giữ UTC hiện tại khi undo, không rewind/reprocess clock.

## Offline web và triển khai

PWA Workbox precache tài nguyên local. Relative Vite base hỗ trợ Pages subpath. Script build/typecheck/lint/Vitest/Playwright và benchmark nằm trong package.json. Workflow deploy thủ công, không tự publish. Kết quả GPU cloud không thay thế thiết bị thật.

## Graphics Phase 1

Catalog/form profiles tách artwork khỏi simulation, schema 2 thêm `appearance?` và object `variant?` tùy chọn; save cũ giữ nguyên, default appearance là singleton tránh selector Zustand tạo object mỗi lần. Parser vẫn strict với field mới/ID mới. Old biological balancing giữ cho loài cũ, loài mới có growth profile riêng.

`surfaces`, `fishGeometry` và `leafPose` chia sẻ cho scene, preview và ghost. Script xuất registry/previews có hash nguồn và cache Vite độc lập. Renderer chỉ tạo instance groups của loài hiện diện; body/tail mỗi loài hai draw calls; cây có leaf/stem batches. Fish movement 30Hz, scene mỗi frame, biology canonical step giữ nguyên. Không set React state mỗi frame.

Geometry/material/textures/PMREM có cleanup khi đổi loài/quality/unmount. Monitor đọc renderer.info (calls, triangles, textures, geometries/programs); số đo không phải VRAM bytes. Chế độ quality điều khiển DPR, leaf subdivisions/limit, fish detail, glass, shadows, reflection/caustics. Placement ghost cập nhật cursor ref thay vì state mỗi frame. Free Orbit thoát camera preset nội suy và giữ điều khiển chuột/cảm ứng.

Source public nằm ở main riêng của repository Aquascape; Pages lấy dist từ gh-pages. Không chứa source/lịch sử game khác trong repository phát triển ban đầu.
