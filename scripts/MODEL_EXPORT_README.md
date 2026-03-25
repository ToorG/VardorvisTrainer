# Vardorvis Model Export & Conversion

## Status
- OBJ+MTL → GLB pipeline is working and tested
- Player model test confirmed vertex colors render correctly in the SDK
- Models load via `GLTFModel.forRenderable(this, modelPath)` in the SDK

## Export Workflow (RuneLite)
1. Install "Model Exporter" plugin from RuneLite Plugin Hub
2. Enable **"Export Color"** in plugin settings
3. Shift + right-click NPC → "Export Model" (or use Sidepanel for NPC ID lookup)
4. Files export to `~/.runelite/models/` as `.obj` + `.mtl` pairs

## NPC IDs
- **Vardorvis**: 12223 (post-quest), 12426 (awakened)
- **Swinging Axe (static)**: 12225
- **Swinging Axe (moving)**: 12227
- **Vardorvis' Head**: 12226

## Conversion
```bash
pip install pygltflib numpy
python3 scripts/convert_obj_to_glb.py <input.obj> <output.glb>
```

The script:
- Reads OBJ geometry + MTL per-face Kd colors
- Creates flat-shaded vertices (each face gets its own verts)
- Applies per-face vertex colors from MTL materials
- Smooths normals across shared positions
- Outputs GLB with COLOR_0 attribute, white baseColorFactor, doubleSided

## Model File Locations
- `src/assets/models/vardorvis.glb` → loaded by `Vardorvis.ts`
- `src/assets/models/vardorvis_tendril.glb` → loaded by `VardorvisStrangle.ts`

## Code References
- `src/content/vardorvis/js/mobs/Vardorvis.ts` → `GLTFModel.forRenderable(this, "/models/vardorvis.glb")`
- `src/content/vardorvis/js/mobs/VardorvisAxe.ts` → `BasicModel.forRenderable(this)` (orange box)
- `src/content/vardorvis/js/mobs/VardorvisHead.ts` → `BasicModel.forRenderable(this)` (dark red box)
- `src/content/vardorvis/js/mobs/VardorvisSpike.ts` → `BasicModel.forRenderable(this)` (purple box)
- `src/content/vardorvis/js/mobs/VardorvisStrangle.ts` → `GLTFModel.forRenderable(this, "/models/vardorvis_tendril.glb")`

## To update a model with a new export:
```bash
python3 scripts/convert_obj_to_glb.py ~/.runelite/models/NPC_Vardorvis*.obj src/assets/models/vardorvis.glb
git add -A && git commit -m "update vardorvis model" && git push origin beta
npm run start  # test at localhost:8000/vardorvis.html
```

## SDK Details
- Default model scale: 1/128 (set in osrs-sdk GLTFModel)
- Three.js GLTF loader auto-enables vertexColors when COLOR_0 is present
- Scene lighting: HemisphereLight + AmbientLight (both white)
- 3D mode draws GLTFModel; 2D mode draws drawOverTile/drawUnderTile canvas methods
