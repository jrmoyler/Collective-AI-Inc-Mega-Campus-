# Living-campus continuation review

Baseline: `62bd8b0`, merged PR #11. Baseline tests and export ran from an isolated
snapshot of that commit, with the same installed dependencies as this branch.

## Structural evidence

| Check | PR #11 baseline | Continuation |
| --- | ---: | ---: |
| Automated tests | 13 passed | 21 passed |
| Facilities | 35 | 35 |
| Interior floors checked | 74 | 74 |
| Largest floor geometry allocation | 27,227,744 bytes | 30,396,304 bytes |
| Blocked guided room arrivals | 0 | 0 |
| Exterior mesh objects | 2,332 | 2,339 |
| Exterior vertices, multiplied by instance count | 3,566,486 | 8,408,577 |

Counts describe scene geometry, not visible draw calls, GPU memory or frame rate.
The larger vertex workload is a material mobile performance uncertainty even
though trees, vehicles and street furnishings share geometry or use instancing.
All 74 floors remain below the existing 96 MiB per-floor geometry limit.

## Matched offline images

`baseline-aerial.jpg` / `current-aerial.jpg` and
`baseline-prism.jpg` / `current-prism.jpg` use identical Blender 4.5.3 Cycles
cameras, lighting, 12 samples, AgX transform and 1200 × 900 resolution.
These are renders of exported actual Three.js scene geometry, not artwork
replacements. Current export includes Blender-authored street furniture.

Visible changes include asphalt markings, less saturated water, continuous
glazing and mullions, revised curved facades and open branching/leaf crowns.
The first continuation render (`pass1-*.jpg`) was rejected for broad bare ground
and isolated pink planting clumps. The final render uses precise building,
pond and road setbacks and mixed planting across the campus. This visibly fills
the previous gaps while retaining circulation. Its background skyline is still
regimented, and some facility masses remain repetitive. These images do not
demonstrate exact reference agreement or photorealism.

glTF export does not retain custom water, wind or atmospheric shaders, browser
lighting, postprocessing, UI or interactive behavior. Export warns about
unsupported ShaderMaterial surfaces; those are not treated as validated.
Runtime animation references are stripped from exported metadata to avoid
recursively serializing duplicated scene buffers; runtime code is unchanged.

## Remaining acceptance gates

- Desktop and mobile WebGL rendering and shader compilation were not observed.
  The available browser capability could not be invoked through its required
  runtime; no alternate browser automation was used.
- Installed Three.js source contains the atmosphere uniforms and shader include
  locations used by the changes. This source inspection is not GPU compilation.
- No physical Galaxy A15 measurements were collected. Use the app's local device
  performance report on the phone, including campus navigation and floor tours.
- Exact visual agreement with all 35 facility references and visible interiors
  remains open. Hidden-room furnishing remains an interpretation of the program.

Raw test, build, export and all-floor budget outputs are in this folder. Timings
were collected alongside offline rendering and are not comparable benchmarks.
