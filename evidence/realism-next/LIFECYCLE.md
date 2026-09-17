# Lifecycle failure reproduction

The connected browser reported `GL_VENDOR=Disabled` and `GL_RENDERER=Disabled`.
Its WebGL context could not initialize, before campus shaders were compiled.
That environment limitation is not evidence of a campus shader defect.

Independent Node/NullEngine fault injection found three actual application
failures in the previous interior implementation:

- Throwing from floor initialization left a Babylon scene and input listeners
  allocated because no disposable tour had been returned to the caller.
- Throwing during a later rendered frame propagated without stopping or disposing
  the engine.
- Losing focus retained held movement and nonzero camera inertia.

The original code fails these three tests (`lifecycle-before.txt`). The fixed
interior cleans partial initialization, disposes and reports later errors through
`onError`, and clears input/motion on blur. Invalid floor requests preserve the
previous valid tour. Quality changes also resize the active shadow map.

`render-lifecycle.test.js` additionally verifies that a render failure leaves no
scheduled animation callback, and teardown cancels both queued frames and a loop
stopped from its own callback. It also injects an atmosphere shader failure and
checks that the renderer restores its screen target, tone mapping, auto-clear and
XR state. Shared scene resources are disposed once, including textures referenced
by shader uniforms; a failing disposal listener does not block other cleanup.
All nine focused tests pass (`lifecycle-after.txt`).
The existing all-74-floor construction/disposal budget gate also passed alongside
the initial five fault tests (`lifecycle-all-floors.txt`). These are CPU lifecycle
checks, not a substitute for WebGL rendering or physical-device performance.

The main loop now rejects stale shader-compilation completions after context loss,
reenables tours after restoration, listens for context loss during construction,
and falls back to base rendering if initial postprocessing fails. Disposing a
failed composer unbinds its offscreen target. Repeated boot calls no longer attach
duplicate controls or prematurely dismiss the loading view.
Final failure also releases the scene, buffers, materials, textures and retained
building/fleet references. Assets arriving after failure are disposed immediately.
