# Changelog

## 2.2.0 — Graphics Phase 1 — 2026-10-23

Nâng cấp trực tiếp renderer và thư viện, giữ framework, builder, schema 2, ID/save cũ và Living 1:1 + Balanced.

- Kính có độ dày, bật/tắt mặt trước; nước trong gợn nhẹ; 5 ánh sáng, ACES/sRGB, shadow/reflection và caustics theo preset; nền hạt có normal/roughness.
- 10 loài cá + tép có geometry/profile riêng, 15 loài cây có morphology, 18 đá và 15 lũa khác hình; tất cả vẫn là procedural fallback, chưa final professional art.
- Registry 42 assets, 64 WebP local, status/material/placement/budgets; tìm kiếm, lọc, chọn biến thể và ghost theo kích thước; camera Tự do.
- Instancing theo loài đang có, LOD lá/cá, Auto giảm hiệu ứng, Low bỏ PMREM/physical glass nặng; stock cap theo thể tích và hiệu năng, envelope collision bảo thủ.
- Kiểm thử bổ sung geometry, growth, cũ/mới save, placement, biology mọi loài, catalog, lighting/quality và cleanup lặp lại. 93 unit tests đạt; kết quả browser cuối xem QA_REPORT.md.


## 0.1.0 — First playable foundation

Standalone project inside `aquascape-3d`; original cultivation game remains intact. Curated procedural aquarium, three camera presets/orbit, glass/water, instanced plant animation, schooling fish, builder/terrain/catalog, inspector, history, validated local persistence. Pure ecosystem model, fixed clock, quality settings and PWA/build scaffolding. See QA_REPORT.md for tested scope and incomplete release work.

## 2.1.0 / RT-1 — Time and persistence foundation

Schema 1 migration establishes a fresh UTC baseline without retroactive days. Added monotonic clock, bounded catch-up, retained partial steps, UTC rollback/forward-jump diagnostics, atomic primary/checkpoint journal with revision checks, and exclusive browser writer lock. Existing renderer/builder retained. RT-1 checks: typecheck, build, 38 unit tests passed; browser session tests follow in RT-6.

### RT-2 — Plants

Bounded species growth, biological condition data, morphology/spread/density, trim timestamp and branching, seeded instanced leaf layout with soft transitions. Ground bounds retained. RT-2 typecheck/build and 41 unit tests passed.

### RT-3 — Animals

Per-species juvenile/adult sizes, age, growth, comfort and behaviour; renderer scales body/tail/stripe/eyes together and interpolates size. Stress/rest/foraging influence movement; restored positions remain bounded. RT-3 validation checkpoint recorded below after checks.

### RT-4 — Ecosystem automation

UTC schedules (including midnight), causal light/CO₂, bounded heater/filter efficiency, and finite automatic-feeder inventory/events share the canonical biological scheduler. RT-3 checkpoint passed 43 tests/build/typecheck; RT-4 checks recorded after the automation suite.

### RT-4 / RT-5 checkpoints

Automation milestone: 48 unit tests, typecheck/build passed. Welfare milestone: 54 tests, typecheck/build passed. Balanced offline health floors/maximum decline apply only to catch-up; live neglect and opted-in Challenge can kill organisms. Relaxed is gentler; recovery after care is tested. A stress fixture was corrected to inspect the initial adverse period rather than a naturally recovered week; long 90-day checks use a documented 20s timeout.

### RT-6 — Presentation and QA

Welcome Back uses real biological before/after deltas; one before scene can be compared. Time-Lapse renders a separate world and never commits forecast biology or preview fish poses. Added Living 1:1 controls, Creative-only speed/pause, care modes, UTC automation/food UI, clock-review diagnostics, and browser coverage of old save migration, no double growth, multi-tab takeover, checkpoint recovery and active clock jumps. Restored the existing healthy-growth mission to the new engine (one reward). Final validated outcomes/benchmarks are recorded in QA_REPORT.md.

Final V2.1 validation: 65 unit tests passed; 8 development browser workflows plus 1 production/PWA workflow passed. Typecheck, lint, build and isolated 1/7/30/90-day CPU benchmark passed. GPU FPS/native-device limits remain documented.

## QC patch — 2026-10-22

Fit short/landscape viewports, keep welcome/care/inspector panels reachable by scrolling, and remove the scene-title overlap with forecast controls. Added four responsive regression tests and repeatable public QC across five viewports with JSON export/import. 65 unit tests, 13 browser workflows, and all supplementary built/public viewport checks passed. Deployed public commit `0dd5c15ce44ad1bd7ffda2ed48714ee822fd378a`; see QC_REPORT.md.
