# Seated campus staff

These are actual textured meshes, not rendered cutouts. Three MakeHuman characters are fitted to clothing and baked into a seated pose. The interior geometry assembler places them from the manufactured seat's position and quaternion, then bakes the room transform. Babylon and the offline reviewer consume the same position, normal and UV buffers in `viewer/campus/occupant-meshes.json` and these texture pixels.

## Sources and licenses

- MakeHuman Community core body, skin, eyes, brows, clothes, shoes and hair: **CC0**. [Core asset license](https://static.makehumancommunity.org/about/license.html), [system asset manifest](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html).
- SittingDefault pose by **callharvey3d**, from [Poses 01](https://static.makehumancommunity.org/assets/assetpacks/poses01.html). The current pack manifest grants CC0. The older embedded metadata says `CC-by`; attribution to the author is retained here as well.
- MPFB generator code: GPL, used as a build tool and not shipped. Pinned source commit `b58176c661a9680294eb75f127842cb8378e4974` from [makehumancommunity/mpfb2](https://github.com/makehumancommunity/mpfb2).

Characters: young Caucasian male / casualsuit01 / short02 / shoes01; young African female / fitted casualsuit01 / ponytail01 / shoes02; young Asian male / casualsuit03 / short04 / shoes01. All use high-poly eyes, eyebrow001 and the sittingdefault pose. Character variants are inferred campus staff, not depictions of reference-image individuals.

## Rebuild

Use Blender 4.5.1, the pinned MPFB source checkout, and the extracted [system pack](https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip) and [pose pack](https://files.makehumancommunity.org/asset_packs/poses01/poses01_cc0.zip) in one asset directory.

```sh
CAMPUS_MPFB_SOURCE=/path/to/mpfb2 CAMPUS_HUMAN_ASSETS=/path/to/assets CAMPUS_HUMAN_OUTPUT=/tmp/campus-people blender -b -t 4 --python scripts/build-occupants.py
python3 scripts/pack-occupants.py /tmp/campus-people
```

The packer checks that transforms and interleaved buffers have been baked, preserves texture pixels, hashes texture filenames, and records source GLB hashes. Geometry is lazy-decoded once per variant on first use and remains immutable. Each floor owns only its placed copies; material textures are shared within the scene and disposed with it.
