# Aquascape M1 asset provenance and distribution

`public/models/m1/*` and the M1 previews in `public/previews/` are original artwork created for this project. No third-party mesh, photograph, texture, scan, or image-generation input was used. Asset production uses Blender 4.3.2 and the reproducible scripts `tools/m1/build_assets.py` and `tools/m1/pack_assets.py`.

**SPDX-License-Identifier: CC0-1.0.** The project dedicates this original M1 artwork to the public domain under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/legalcode). It can be distributed, modified and used commercially. This dedication covers these generated meshes, textures and previews; it does not change the license of application code or dependencies. Blender's GPL does not apply to exported artwork.

| Stable asset ID | Original modeling work | Variants | Distribution |
| --- | --- | --- | --- |
| seiryu | Angular erosion profile, carved fracture fields, calcite and mineral maps | 3 | High/low GLB + shared PBR maps |
| dragon | Elongated Ohko erosion cavities and clay mineral surface | 3 | High/low GLB + shared PBR maps |
| spider | Asymmetric authored branch splines, tapered fluted cross sections, wood grain | 3 | High/low GLB + shared PBR maps |
| monte | Rounded paired leaf blade and petiole; biological runner placement | 3 leaf shapes | Instanced high/low leaf-module GLB |
| rotala | Narrow submerged leaf and petiole; opposite leaves along branching nodes | 3 leaf shapes | Instanced high/low leaf-module GLB |
| anubias | Broad curved oval leaf and petiole; rhizome cluster placement | 3 leaf shapes | Instanced high/low leaf-module GLB |
| neon | Streamlined body, eye/iris, gill seam, mouth and separate fin surfaces | 1 | High/low GLB, Swim morph animation |
| betta | Deeper body, broad caudal/dorsal/anal fins and ventral filaments | 1 | High/low GLB, Swim morph animation |
| shrimp | Continuous carapace/abdomen, eye stalks, rostrum, ten legs, antennae, tail fan | 1 | High/low GLB, Swim morph animation |

The asset manifest records the source, per-file SHA-256, bounds, triangles and animation clips. All other 33 catalog entries retain the existing original procedural fallback. The old fallback remains available for every upgraded asset on load failure.

## Accuracy of quality claims

These GLBs are **original mathematical game artwork**, exported through Blender. Exporting a mesh as GLB does not make it a scan or photorealistic. The work adds actual topology, surface maps, variants and morph animation; it is not a claim of hand-sculpted photogrammetry. See `M1_ASSET_REPORT.md` for rendered evidence and remaining art limitations. Base color uses WebP compression; normal and roughness maps use lossless PNG. This is file compression, not KTX2/Basis GPU block compression.
