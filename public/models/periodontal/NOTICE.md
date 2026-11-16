# Anatomical mesh attribution

## Teeth (32) and gingiva (upper/lower)

- **Source:** BodyParts3D / Anatomography, version 4.3
- **Publisher:** Database Center for Life Science (DBCLS), Japan
- **License:** CC BY-SA 2.1 JP (Creative Commons Attribution-ShareAlike 2.1 Japan)
- **URL:** https://lifesciencedb.jp/bp3d/
- **Parts used:** 28 permanent teeth (FMA55680-FMA55815 set: incisors, canines,
  premolars, first/second molars per quadrant) + "Maxillary gingiva" (FMA59763)
  + "Mandibular gingiva" (FMA59764).
- **Processing:** `scripts/prepare-periodontal-3d-meshes.mjs` re-maps the body
  coordinates to the viewer scene frame, detects each cervical line from the
  donor's own gingival margin, bakes the yaw so the buccal faces local +z,
  bakes the CEJ crown/root vertex-color gradient, and re-anchors each mesh at
  its cervical centroid. Wisdom slots (FDI x8) reuse the adjacent second molar
  mesh (extrapolated position, 0.94 scale) - BodyParts3D has no third molars.
- **Modifications notice (ShareAlike):** the meshes above are adapted meshes of
  BodyParts3D; any redistribution of these processed meshes must carry this
  same attribution and license.

## Implant fixture/abutment/crown

Parametric (LatheGeometry profiles built at runtime in
`src/lib/periodontal/3d/periodontal3dEngine.ts`); no third-party asset.
