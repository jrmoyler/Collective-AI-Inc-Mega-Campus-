# Continued PR12 facade, runtime and GPU recovery pass

## Visible architecture

All35 individual facility envelopes now include program-specific equipment/furniture and facade details, not just a repeated family shell. Six matched before/after views (CF01/08/13/21/27/34) reuse exactly the same camera and lighting; all35 final source comparison sheets are refreshed. Review corrected a concealed CF34 transformer bank by moving it to the frontage apron. Audits distinguish observed structure from inferred hidden equipment.

Clearer local glazing exposes furnished floors. Transparent unmasked glass no longer casts an opaque PCF shadow onto the occupied space: this shadow technique cannot model transmitted attenuation. Opaque structure still casts shadows. The runtime now uses the supported Three r186 PCF mode instead of its removed PCFSoft alias.

The new geometry improves visible occupancy but remains substantially less detailed than the illustrated references. **Exact-reference and photoreal acceptance remain not met.**

## Startup and memory

Fine furniture/equipment is constructed on approach, hidden across a small hysteresis band and evicted well beyond it. Main structural identity is always present. The eager export maximum adds64,609,424 bytes, but the runtime starts with0 fine geometry bytes. Representative Prism/south approaches materialize3,281,944/7,753,912 bytes; distant return releases all to0. These are CPU geometry-array measurements, not heap, GPU-memory or FPS claims. Shared materials survive eviction; each owned geometry is disposed once and recreated on return.

A single existing sun shadow map focuses on the viewed facility at street distance and covers the campus at aerial distance. Its center snaps in light space, and bias scales with texel footprint; no extra cascades/maps are allocated. Native device report counters now accumulate all scene, shadow and postprocessing draws instead of reporting only the last fullscreen pass.

## Silent graphics failures

General MAX_SAMPLES does not certify HDR color/depth attachment compatibility. Effects now select the intersection of format-specific RGBA16F/depth sample counts, explicitly check every ping-pong and bloom framebuffer, retry without MSAA when necessary, and fall back to base rendering if HDR targets fail. Checks run after construction, resize/quality changes and context restoration. PMREM generation checks capability and framebuffer completeness before adopting its texture. Context loss clears stale environment textures.

The native gate now compiles/links17 actual programs, including bloom and ACES/sRGB output. Native RGBA16F4×MSAA color/depth allocation, clear, resolve and float readback pass; negative controls reject mismatched shader interfaces and incomplete targets. This remains software EGL evidence, not browser/device approval.

Pending lazy tours are invalidated when the visitor changes facility, closes detail, opens a floor plan/directory or changes camera view. This prevents a completed import from opening the previous destination after the user has moved on.

## Evidence

- `detail-tests.txt`, `detail-build.txt`: all39 regression tests pass and production build passes.
- `shader-native-report.json`, `SHADER-VALIDATION.md`:17-program native gate and FBO evidence.
- `exterior-detail-budget.json`: eager maximum and actual deferred/eviction accounting.
- `../facility-detail-review/`: six matched occupied-facade review pairs.
- `../facility-review/`: all35 final geometry/reference comparisons.

Hosted browser WebGL is still disabled before scene creation. Browser startup GPU appearance,3D tours, shadow quality, driver recovery, transparency sorting and physical Galaxy A15 performance remain unverified. No offline image or native compiler result is substituted for those gates.
