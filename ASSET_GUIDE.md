# Asset guide — Graphics Phase 1 / 2.2

## Trạng thái bàn giao

**42 asset có generator hoạt động; 0 final asset, 42 procedural fallback, 0 mục chỉ có tên mà không có hình học.** Không kèm GLB chuyên nghiệp, ảnh texture bên ngoài hoặc HDRI tải từ dịch vụ khác. Tất cả artwork và previews tạo bằng mã trong dự án. Cá/cây có hình dáng khác nhau nhưng vẫn là mô hình phát triển; cần technical artist để đạt độ chân thực và độ chính xác sinh học chuyên nghiệp. Thiết bị giữ cách vẽ cũ và preview khối minh họa.

## Registry và previews

`src/data/catalog.ts` là registry runtime, `src/data/forms.ts` mô tả hình thái cá/cây. `public/asset-registry.json` là bản JSON có thể đọc từ web: ID/tên/loại, model path, preview, bounds, size, placement, material, performance, status, biến thể và nguồn/license. Giữ nguyên ID khi thay artwork để không hỏng save.

`model: null` có nghĩa dùng generator, không phải file GLB bị thiếu. `performance.triangles` là **ngân sách**, không phải số đo của cả cảnh; `trianglesAreBudget: true` làm rõ điều đó. `previewTriangles` là số tam giác đo của hình preview ở LOD thấp, không tính các instance động hoặc shader/shadow passes. Cụm cây có thể tăng cost theo số lá; draw calls trong scene cần đọc bộ đếm renderer.

64 WebP local (~752 KiB toàn bộ) bao gồm 18 hình đá, 15 hình lũa, 15 cây, 11 sinh vật và 5 thiết bị. Preview dùng cùng geometry generators/leaf poses với cảnh; ảnh cây ở growth 0.75, ghost cây mới ở 0.12 nên số lá/kích thước khác theo giai đoạn. Ảnh tĩnh không mô phỏng chính xác shader, ánh sáng hay chuyển động trong hồ. Thiết bị dùng ảnh khối minh họa. Nếu ảnh mất, UI có fallback SVG.

```sh
npm run assets
```

Script dùng Chromium (`/usr/bin/chromium` hoặc `CHROMIUM_PATH`) để xuất WebP và registry. Dữ liệu được kiểm tra bằng source hash: nếu không thay generator/forms/catalog, build dùng ảnh đã giao, không cần Chromium. Vite SSR của generator có cache riêng ở tmp để không làm hỏng dependency cache của dev server.

## Hình học và vật liệu

- `game/assets/surfaces.ts`: đá 6 kiểu × 3 seed/hình, 5 cây lũa CatmullRom × 3 cấu trúc nhánh, 15 profile lá, color/normal/roughness maps nền 128px có seed. Đá giữ các mặt bất quy tắc, đá cuội nhẵn, slate xếp lớp, granite có hạt, lava có lỗ qua shader. Đây không phải scan PBR tự nhiên.
- `game/assets/fishGeometry.ts`: thân, đầu/mõm, mắt, vây, dấu hiệu và đuôi theo profile riêng; guppy đuôi quạt, betta vây dài, rummy đầu đỏ/đuôi sọc, harlequin mảng tam giác, cory có râu, oto miệng bám. Tép phân đốt có chân/râu. Body/tail instancing, đuôi quay và thân đổi hướng; chưa có skinning/uốn toàn thân giải phẫu.
- `game/plants/layout.ts`: cây đốt có cặp lá và nhánh, cỏ lá kim, Vallis lá dài, hoa thị/thân rễ, rêu tán/frond. Mỗi loài có phase sway riêng; biology điều khiển số lá, độ cao, tán, nhánh và runners. Cụm con vẫn thuộc cây mẹ.
- `hardscape/material.ts`: gân/vân/lỗ/hạt procedural và roughness theo loại, không hotlink texture. `Reflection.tsx` tạo studio environment nội bộ, chỉ Medium/High.
- Low giảm DPR/độ chia lá, không shadow/PMREM/caustics, kính basic trong suốt. Medium/High có shadow, glass clearcoat/reflections và nền caustics. Auto chọn theo thiết bị và giảm xuống Low sau nhiều mẫu chậm.

## Placement và giới hạn

1 world unit tương ứng khoảng 10 cm. Origin đá/lũa/lá tại gốc +Y, cá hướng +X. Đá/lũa có envelope giới hạn và nằm trong thành hồ; moss/thân rễ có thể gắn hardscape. Ghost dùng geometry thật với wireframe. Fish radius tính đủ chiều dài thân/đuôi, dùng steering/projection tránh envelope đá/lũa và kính. Va chạm lũa là envelope bảo thủ, không len chính xác qua từng khoảng rỗng; chưa có triangle-level collision.

Living có giới hạn trưởng thành theo thể tích và hard cap 80 sinh vật; Creative bỏ giới hạn thể tích nhưng giữ cap hiệu năng 80. Không phải hướng dẫn số lượng nuôi cá ngoài đời, không mô phỏng đầy đủ tính lãnh thổ hay tương thích loài.

## Thay bằng GLB sau này

Đặt GLB được cấp phép trong `public/models/`, set `model: 'models/<id>.glb'`, ghi nguồn/tác giả/license/attribution trước khi thêm. Embed textures, tránh đường dẫn ngoài. Hardscape và plant có boundary tự chuyển sang procedural nếu load lỗi; test browser ép missing GLB xác nhận fallback. Fish renderer hiện chuyên instancing procedural, **chưa có pipeline fish GLB/skinned animation**. Trước khi gọi asset là final, kiểm tra hình thái/LOD/bounds/material, preview, chọn/đặt/save/reload và PWA offline. Cập nhật status và generator ảnh theo đúng artwork mới.

## Danh sách đầy đủ

| ID | Tên | Loại | Biến thể hình | Trạng thái |
|---|---|---|---:|---|
| `seiryu` | Đá Seiryu | rocks | 3 | procedural-fallback |
| `dragon` | Đá Dragon | rocks | 3 | procedural-fallback |
| `lava` | Đá nham thạch | rocks | 3 | procedural-fallback |
| `river` | Đá cuội suối | rocks | 3 | procedural-fallback |
| `slate` | Đá Slate | rocks | 3 | procedural-fallback |
| `granite` | Đá Granite | rocks | 3 | procedural-fallback |
| `spider` | Lũa Spider | wood | 3 | procedural-fallback |
| `branch` | Lũa cành | wood | 3 | procedural-fallback |
| `root` | Lũa gốc | wood | 3 | procedural-fallback |
| `twisted` | Lũa xoắn | wood | 3 | procedural-fallback |
| `arch` | Lũa vòm | wood | 3 | procedural-fallback |
| `monte` | Monte Carlo | plants | 1 | procedural-fallback |
| `hairgrass` | Dwarf Hairgrass | plants | 1 | procedural-fallback |
| `glosso` | Glossostigma | plants | 1 | procedural-fallback |
| `hc` | HC Cuba | plants | 1 | procedural-fallback |
| `anubias` | Anubias nana | plants | 1 | procedural-fallback |
| `buce` | Bucephalandra | plants | 1 | procedural-fallback |
| `crypt` | Cryptocoryne Wendtii | plants | 1 | procedural-fallback |
| `fern` | Dương xỉ Java | plants | 1 | procedural-fallback |
| `stauro` | Staurogyne Repens | plants | 1 | procedural-fallback |
| `rotala` | Rotala | plants | 1 | procedural-fallback |
| `rotala-hra` | Rotala H'ra | plants | 1 | procedural-fallback |
| `vallis` | Cỏ Vallisneria | plants | 1 | procedural-fallback |
| `ludwigia` | Ludwigia Repens | plants | 1 | procedural-fallback |
| `moss` | Rêu Java | plants | 1 | procedural-fallback |
| `christmas` | Christmas Moss | plants | 1 | procedural-fallback |
| `neon` | Neon Tetra | fish | 1 | procedural-fallback |
| `cardinal` | Cardinal Tetra | fish | 1 | procedural-fallback |
| `ember` | Ember Tetra | fish | 1 | procedural-fallback |
| `rummy` | Rummy Nose Tetra | fish | 1 | procedural-fallback |
| `harlequin` | Harlequin Rasbora | fish | 1 | procedural-fallback |
| `chili` | Chili Rasbora | fish | 1 | procedural-fallback |
| `guppy` | Guppy | fish | 1 | procedural-fallback |
| `betta` | Betta | fish | 1 | procedural-fallback |
| `cory` | Corydoras | fish | 1 | procedural-fallback |
| `oto` | Otocinclus | fish | 1 | procedural-fallback |
| `shrimp` | Tép Cherry | fish | 1 | procedural-fallback |
| `feeder` | Máy cho ăn | equipment | 1 | procedural-fallback |
| `filter` | Lọc ngoài | equipment | 1 | procedural-fallback |
| `heater` | Sưởi ổn nhiệt | equipment | 1 | procedural-fallback |
| `co2` | Bộ CO₂ | equipment | 1 | procedural-fallback |
| `aerator` | Sủi khí | equipment | 1 | procedural-fallback |
