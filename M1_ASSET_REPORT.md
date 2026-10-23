# AQUASCAPE 3D — Phase M1

Priority: asset shape and rendered appearance. This release adds no gameplay or cloud feature. The existing React/Three game, stable asset IDs, world schema 2, IndexedDB, Living simulation and Balanced default remain in place.

## Inspection before changes

- `AssetModel.tsx`: optional GLB loader, automatic bounds normalization, no variant/LOD input or selection material on GLB.
- `fishGeometry.ts` / `Fish.tsx`: merged procedural body parts and a separately oscillating tail, two instanced draws per species; no GLB animation renderer.
- `Plants.tsx`: instanced procedural leaves; its optional GLB path scaled a whole adult plant and did not express leaf growth.
- `Hardscape.tsx`: procedural geometry for each catalog entry, optional generic GLB; no variant passed to the loader.
- `catalog.ts` / registry: all 42 entries had `model: null` and `procedural-fallback` status.

## Delivered models

Exactly nine asset families are integrated, distributed as **42 GLB files**: 18 hardscape LOD/variant files, 18 plant leaf-module files, and 6 animal LOD files. All art is original CC0-1.0; provenance is in `ASSET_LICENSES.md`. The complete machine-readable manifest is `public/models/m1/manifest.json`.

| Family | Improvements visible in the game | Renderer |
| --- | --- | --- |
| Seiryu | Fractured silhouette, geometry creases, mineral/base/normal/roughness maps; three distinct proportions | Shared GLB geometry, selected material, low/high LOD |
| Dragon | Warm clay surface with deep elongated geometry cavities; three shapes | Same placement/transform/save path as before |
| Spider Wood | Asymmetric branching and subbranches, tapered fluted sections and grain | Three variants, ground origin and conservative collision cylinder |
| Monte Carlo | Rounded blades and petioles; pairs spread along biological runners | Three GLB leaf shapes instanced; new leaves/runners appear during growth |
| Rotala rotundifolia | Narrow submerged leaves and petioles, opposite leaves at successive stem nodes | Existing biological branch count, height and trimming drive instances |
| Anubias nana | Broad oval curved leaves, petioles and a rhizome cluster | Separate new leaves, spread and leaf length; no static adult-plant scaling |
| Neon Tetra | Streamlined profile, blue lateral/red posterior markings, eyes/iris, gill and mouth geometry, forked tail | Instanced GLB + GPU morph weights from the actual Swim clip |
| Betta | Deeper body and broad caudal/dorsal/anal fins, ventral filaments | Swim morph clip deforms body and fin surfaces; smooth heading interpolation |
| Cherry Shrimp | Continuous segmented abdomen, rostrum, antennae, ten legs and tail fan | Morph deformation, substrate-correct render offset; existing grazing movement |

Scale: 1 game unit = 10 cm. Hardscape is authored inside the existing placement cylinder, origin at ground center, +Y up. Animal length is normalized to 1, facing +X; runtime multiplies by the existing juvenile/adult length. Only asset IDs and biological state are saved, never mesh or texture bytes.

## Rendered comparison and QC evidence

The unchanged 2.3 sample was captured before editing: `qa/m1/sample-before-front.png`, `sample-before-perspective.png`, `sample-before-top.png`, plus `sample-before.json`. Final same-scene screenshots and metrics are recorded separately from the nine-family QC fixture. Moving fish and the real-time clock naturally advance between captures.

`e2e/models.spec.ts` creates a real in-game fixture, imports it through the game menu, then captures front, three-quarter, top, rock, Dragon, wood, Monte, Rotala, Anubias, Neon, Betta and Shrimp views. It also captures every lighting preset and young/mature plant states. Close-ups use the high-detail GLB via the medium quality preset; overview measurements use low LOD. The camera now permits closer inspection without changing its default views.

Image review is mandatory alongside automated checks: test success alone does not establish species fidelity or photorealism. The report's final validation section records the inspected screenshots and observations after the test run.

## Geometry, materials and performance

- Real lower-detail exports, not a renamed high-detail file. Per-variant counts and bounds are in the manifest; low leaf modules are 62 triangles, high modules 280.
- Plants share one draw per species/leaf variant, not one draw per individual leaf. Mobile caps authored foliage to 32 leaves per cluster; Anubias uses fewer, larger leaves.
- All animals of a species share geometry/material, with per-instance GPU morph texture and independent animation phase. Fallback retains the existing body/tail batches.
- Shared texture cache across GLB variants/LODs; shared geometry from the GLTF loader; selection clones only the hardscape material.
- WebP base color and lossless, downsampled PNG normal/roughness maps; no hotlinked texture or model. Mipmaps use the existing Three texture path.
- Reference-counted GPU cleanup, instanced-buffer/morph-texture disposal and explicit animation-mixer cleanup. Loader CPU cache is bounded by the fixed asset paths and can reupload disposed GPU data on return.
- GPU FPS targets require physical-device verification. SwiftShader results are reported as software-rendering measurements and cannot establish Windows/iPhone/iPad performance.

## Remaining fallback models

33 entries retain the original renderer: `lava, river, slate, granite, branch, root, twisted, arch, hairgrass, glosso, hc, buce, crypt, fern, stauro, rotala-hra, vallis, ludwigia, moss, christmas, cardinal, ember, rummy, harlequin, chili, guppy, cory, oto, feeder, filter, heater, co2, aerator`.

For the nine upgraded entries, load failure restores the original geometry. Failed required PBR maps also trigger fallback instead of silently displaying an untextured GLB. Registry status is `authored-glb`; it does not claim an externally reviewed final photoreal asset.

## Next library plan, after M1 quality review

1. Validate this release on real Windows GPU, iPhone Safari and iPad Safari. Record FPS/frame time, draw calls and memory for the same saved scenes. Tune mobile LOD/texture budgets before increasing the library.
2. Refine macro fidelity: more irregular Seiryu fracture/vein patterns, sculpted wood junctions, thinner optically translucent fins and species-specific fine fin rays. Use licensed scan references only with documented redistribution rights.
3. Upgrade remaining rock/wood families in small batches: lava/river/slate/granite, then root/branch/twisted/arch. Apply the same three-variant, bounds, UV and rendered comparison gate.
4. Upgrade botanical families by growth habit, then remaining animals with anatomical profiles, clips and juvenile/adult collision checks. Keep each old ID and fallback.
5. Consider KTX2/Basis after validating mobile decoder/PWA behavior. Do not label WebP file compression as GPU compression.

Every batch must pass visual inspection, interaction, old-save loading, build/tests, resource cleanup and recorded performance before the next species are added.

## Visual review of actual renders

The in-game close-ups were inspected, including the high-detail mesh rather than a preview icon. Seiryu now has a fractured, stepped silhouette and surface veins; Dragon has geometry depressions instead of a color-only cavity; Spider has an asymmetric branch arrangement and visible grain. The three botanical blades have different widths/profiles, petioles and placements, and young/mature captures show added leaves and spatial spread. Neon, Betta and Cherry Shrimp have clearly different body/fin/appendage silhouettes. Their PBR textures load in the scene; the GPU morph test confirms the clip changes rendered-instance weights.

Image review caught and corrected an overly broad Neon dorsal fin and a Shrimp pitch that buried the tail in the substrate. Strict Mode animation cleanup, initially underspecified low-detail leaf curvature and startup growth interpolation were also corrected. The renderer keeps Shrimp horizontal while grazing and permits close camera inspection.

**Remaining art limits:** mineral vein patterns still have some regularity; wood branch junctions use intersecting authored surfaces rather than a fully sculpted fused root system; fish fins are opaque thin game surfaces rather than physically translucent membranes. Eye proportions and fin rays can be refined further. These are materially richer original game assets than the old fallback, but are not presented as final photorealistic scans. The remaining 33 families have not been upgraded merely to increase the count.


## Final validation and same-scene measurement

- Typecheck, ESLint and production build: passed. 129 unit/integration tests passed; the strengthened model-signature test also passed on rerun.
- 24 distinct development browser workflows passed across the complete suite and two targeted reruns. The initial care test polled a transient saved label; it now verifies a committed save revision and still checks hunger/waste. The old missing-file injection now disables M1 metadata before substituting its intentionally invalid path. No gameplay/storage change was needed for these test fixes.
- One explicit production/PWA workflow passed on the final compiled build, under the repository URL subpath and with offline service-worker reload.
- 42 GLB files: Khronos validator returned zero errors and zero warnings. Shared external local-image URI notices are informational.
- Same unchanged sample, Low, 1440×1000, top view: before **47 calls / 78,070 triangles / 3 textures**; after **49 calls / 116,676 triangles / 28 textures**. This is +4.3% calls and +49.4% triangles, reflecting curved GLB leaf/animal meshes and PBR maps.
- The old single software sample was ~170 ms/frame; four final software samples were ~205–262 ms/frame. These are SwiftShader costs, not hardware FPS certification. Desktop 60 FPS / mobile 30 FPS remain an unverified device gate.
- The final dedicated nine-family fixture records both LODs and repeated empty/loaded cycles in `qa/m1/render-qc.json`; GPU geometry/texture counts return to the same empty-scene levels rather than accumulating each cycle.

Reproducible same-scene after captures: `node scripts/capture-m1-sample.mjs` while the dev server runs on 5173. The before captures were taken from the actual pre-M1 release before edits.
