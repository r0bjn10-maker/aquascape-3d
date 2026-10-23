# AQUASCAPE 3D 2.4 — M1 asset QA

This phase changes asset rendering and art only. Existing gameplay, cloud logic and World schema 2 remain in place; Balanced is still the default. The complete model comparison, image paths, remaining art limitations and next-library plan are in [M1_ASSET_REPORT.md](M1_ASSET_REPORT.md). The prior cloud report is archived as `QA_REPORT_V23_HISTORY.md`.

## Evidence

- `qa/m1/gltf-validation.json`: Khronos validation of all 42 GLB exports, with zero errors and zero warnings. URI-in-GLB notices are informational because textures are shared external local files.
- `public/models/m1/manifest.json`: SHA-256 for all GLBs/textures, actual triangle counts, animation names, scale/orientation, source hashes and conservative collision metadata.
- `qa/m1/render-qc.json`: browser-measured draw calls/triangles/frame time, per-instance morph changes, growth, both LODs, repeated import/reset cleanup and render errors.
- `qa/m1/`: actual in-game front, three-quarter, top and close-up screenshots, all five lighting presets and young/mature growth states. No marketing mockups are used as QC evidence.
- `e2e/models.spec.ts`: load through the actual menu, transform/selection/history/delete/reload and an old public save, missing-GLB/PBR fallback, morph/GPU cleanup checks.
- `src/tests/models.test.ts`: local distribution/provenance, byte integrity, PBR dependencies, variant geometry signatures, LOD budgets, ground/placement envelopes, animated glTF channels, morphology and old-save/collision checks.

Final check counts, build hashes and publication status are recorded in `qa/m1/release.json` after verification. A skipped production test in the development suite does not count as passed; the PWA test is run explicitly against the current build.

## Limits of the measurements

The cloud runner uses Chromium with ANGLE/SwiftShader software rendering. These measurements help compare draw calls, geometry budgets and resource cleanup; they do **not** establish 60 FPS desktop or 30 FPS mobile. iPhone/iPad Safari, Windows hardware GPU FPS and thermal behavior remain unverified.

These are original authored mathematical game meshes, not photogrammetry or a claim of final photorealistic art. Thirty-three catalog entries still use the old fallback. Detailed visual limitations are listed in the model report rather than treating automated test success as art approval.
