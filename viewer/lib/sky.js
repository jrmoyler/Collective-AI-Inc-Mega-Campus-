// sky.js — procedural surrounding sky for the Three.js campus viewer.
// Z is UP. Site center ~ (548.5, 332, 0). Sky dome radius ~4500.
// THREE is injected; do NOT import it here.
//
// AAA upgrade: physically-flavoured gradient dome with sun/moon disk + glow,
// a Rayleigh-ish horizon haze band, a twinkling starfield (night), a drifting
// crescent moon, and two layers of soft volumetric-ish clouds that scroll.
// setDayNight() smoothly crossfades the whole palette via an animated factor.
//
// Export:
//   export function createSky(THREE, scene, options = {})
//   -> { setDayNight(isNight), update(dt, elapsed), dispose() }

export function createSky(THREE, scene, options = {}) {
  const center = new THREE.Vector3(
    options.centerX != null ? options.centerX : 548.5,
    options.centerY != null ? options.centerY : 332,
    options.centerZ != null ? options.centerZ : 0
  );
  const radius = options.radius != null ? options.radius : 4500;

  // ---- Color palettes (day / night) ----------------------------------------
  // Each component sky value is crossfaded by `dayFactor` (1 = day, 0 = night)
  // inside the dome shader, so day<->night transitions are buttery.
  const DAY = {
    top: new THREE.Color('#2f6fc4'),
    mid: new THREE.Color('#8fc0ec'),
    bottom: new THREE.Color('#dcebf6'),
    haze: new THREE.Color('#aacdf0'),
    sun: new THREE.Color('#fff4d6'),
    sunGlow: new THREE.Color('#ffd9a0'),
  };
  const NIGHT = {
    top: new THREE.Color('#01040c'),
    mid: new THREE.Color('#061226'),
    bottom: new THREE.Color('#0c2440'),
    haze: new THREE.Color('#123a5a'),
    sun: new THREE.Color('#cfe6f2'),
    sunGlow: new THREE.Color('#3a6aa0'),
  };

  // Direction the celestial body comes from: NW and high up. Z up, NW ~ (-X,+Y).
  const lightDir = new THREE.Vector3(-0.55, 0.5, 0.62).normalize();

  // ---- Gradient sky dome (ShaderMaterial) -----------------------------------
  const skyUniforms = {
    dayTop:    { value: DAY.top.clone() },
    dayMid:    { value: DAY.mid.clone() },
    dayBottom: { value: DAY.bottom.clone() },
    dayHaze:   { value: DAY.haze.clone() },
    nightTop:    { value: NIGHT.top.clone() },
    nightMid:    { value: NIGHT.mid.clone() },
    nightBottom: { value: NIGHT.bottom.clone() },
    nightHaze:   { value: NIGHT.haze.clone() },
    sunColor:    { value: DAY.sun.clone() },
    sunGlow:     { value: DAY.sunGlow.clone() },
    sunDir:      { value: lightDir.clone() },
    dayFactor:   { value: 1.0 },
    uTime:       { value: 0.0 },
  };

  const skyVert = `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Cheap hash noise for subtle dithering (kills banding on the gradient).
  const skyFrag = `
    uniform vec3 dayTop, dayMid, dayBottom, dayHaze;
    uniform vec3 nightTop, nightMid, nightBottom, nightHaze;
    uniform vec3 sunColor, sunGlow, sunDir;
    uniform float dayFactor;
    uniform float uTime;
    varying vec3 vDir;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main() {
      vec3 dir = normalize(vDir);
      float h = clamp(dir.z, -1.0, 1.0);          // Z up
      float t = clamp(h * 1.05 + 0.05, 0.0, 1.0); // vertical 0..1

      // Three-stop vertical gradient (bottom -> mid -> top).
      vec3 dayCol   = (t < 0.5)
        ? mix(dayBottom, dayMid, smoothstep(0.0, 0.5, t))
        : mix(dayMid, dayTop, smoothstep(0.5, 1.0, t));
      vec3 nightCol = (t < 0.5)
        ? mix(nightBottom, nightMid, smoothstep(0.0, 0.5, t))
        : mix(nightMid, nightTop, smoothstep(0.5, 1.0, t));
      vec3 col = mix(nightCol, dayCol, dayFactor);

      // Horizon haze band — strongest at the horizon, fades up.
      vec3 haze = mix(nightHaze, dayHaze, dayFactor);
      float hb = clamp(1.0 - abs(h) * 5.0, 0.0, 1.0);
      col = mix(col, haze, hb * 0.5);

      // Sun/moon glow bleed into the sky (broad + tight halo).
      float cosA = clamp(dot(dir, normalize(sunDir)), -1.0, 1.0);
      float broad = pow(max(cosA, 0.0), 6.0);
      float tight = pow(max(cosA, 0.0), 220.0);
      col += sunGlow * broad * (0.18 + 0.10 * dayFactor);
      col += sunColor * tight * (0.6 + 0.4 * dayFactor);

      // Warm scatter near horizon on the sun side during day (dawn/dusk feel).
      float warm = hb * pow(max(cosA, 0.0), 1.5) * dayFactor;
      col = mix(col, sunGlow, warm * 0.25);

      // Dither to remove banding.
      col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const skyGeo = new THREE.SphereGeometry(radius, 64, 40);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.position.copy(center);
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = -1000;
  scene.add(skyMesh);

  // ===========================================================================
  // CLOUDS — two scrolling layers on a high dome cap, soft fBm puffs.
  // ===========================================================================
  const cloudUniforms = {
    uTime:     { value: 0.0 },
    dayFactor: { value: 1.0 },
    sunDir:    { value: lightDir.clone() },
    uCover:    { value: 0.52 },
    dayTint:   { value: new THREE.Color('#ffffff') },
    nightTint: { value: new THREE.Color('#6f86a8') },
  };
  const cloudVert = `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const cloudFrag = `
    precision highp float;
    uniform float uTime, dayFactor, uCover;
    uniform vec3 sunDir, dayTint, nightTint;
    varying vec3 vDir;

    float hash(vec2 p){ p = fract(p*vec2(123.34,345.45)); p += dot(p,p+34.345); return fract(p.x*p.y); }
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      float a = hash(i), b = hash(i+vec2(1.0,0.0));
      float c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }
    float fbm(vec2 p){
      float v = 0.0, amp = 0.5;
      for(int i=0;i<5;i++){ v += amp*noise(p); p *= 2.02; amp *= 0.5; }
      return v;
    }
    void main(){
      vec3 dir = normalize(vDir);
      if (dir.z < 0.04) discard;                 // only the sky cap
      // Project direction onto a plane for stable UVs.
      vec2 uv = dir.xy / (dir.z + 0.35);
      float drift = uTime * 0.006;
      float n1 = fbm(uv * 1.6 + vec2(drift, drift*0.6));
      float n2 = fbm(uv * 3.3 - vec2(drift*1.7, drift));
      float clouds = n1 * 0.65 + n2 * 0.35;

      float cover = mix(0.62, uCover, dayFactor); // a touch more cloud at night
      float a = smoothstep(cover, cover + 0.26, clouds);
      a *= smoothstep(0.04, 0.22, dir.z);         // fade into the horizon
      a *= smoothstep(0.95, 0.55, dir.z);         // fade out at zenith edge softly... keep some
      a = clamp(a, 0.0, 1.0);

      // Soft self-shading: sun-facing edges brighter.
      float lightAmt = clamp(dot(dir, normalize(sunDir)) * 0.5 + 0.5, 0.0, 1.0);
      vec3 base = mix(nightTint, dayTint, dayFactor);
      vec3 lit  = base * (0.7 + 0.5 * lightAmt);
      float opacity = a * mix(0.45, 0.85, dayFactor);
      gl_FragColor = vec4(lit, opacity);
    }
  `;
  const cloudGeo = new THREE.SphereGeometry(radius * 0.96, 48, 24);
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: cloudUniforms,
    vertexShader: cloudVert,
    fragmentShader: cloudFrag,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMesh.position.copy(center);
  cloudMesh.frustumCulled = false;
  cloudMesh.renderOrder = -995;
  scene.add(cloudMesh);

  // ===========================================================================
  // STARS (night only) — twinkling additive points, slight color variation.
  // ===========================================================================
  const STAR_COUNT = options.starCount != null ? options.starCount : 1800;
  const starRadius = radius * 0.92;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starPhase = new Float32Array(STAR_COUNT);
  const starBaseSize = new Float32Array(STAR_COUNT);
  const starColor = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2.0 * Math.PI * u;
    const z = 0.04 + 0.96 * v;
    const r = Math.sqrt(Math.max(0.0, 1.0 - z * z));
    starPositions[i * 3 + 0] = center.x + Math.cos(theta) * r * starRadius;
    starPositions[i * 3 + 1] = center.y + Math.sin(theta) * r * starRadius;
    starPositions[i * 3 + 2] = center.z + z * starRadius;
    starPhase[i] = Math.random() * Math.PI * 2.0;
    // a few bright stars, mostly faint
    const bright = Math.random();
    starBaseSize[i] = radius * (0.0013 + (bright > 0.92 ? 0.006 : 0.0026) * Math.random());
    // subtle blue/white/amber tint
    const tint = Math.random();
    const cr = tint < 0.15 ? 1.0 : tint > 0.85 ? 0.78 : 0.92;
    const cg = 0.9 + 0.1 * Math.random();
    const cb = tint < 0.15 ? 0.8 : 1.0;
    starColor[i * 3 + 0] = cr;
    starColor[i * 3 + 1] = cg;
    starColor[i * 3 + 2] = cb;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starBaseSize, 1));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColor, 3));

  const starUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
  };
  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aPhase;
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uTime;
      varying float vTwinkle;
      varying vec3 vColor;
      void main() {
        float tw = 0.6 + 0.4 * sin(uTime * 2.2 + aPhase);
        vTwinkle = tw;
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * tw * (300.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vTwinkle;
      varying vec3 vColor;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        float halo = smoothstep(0.5, 0.15, d);
        float a = (core * 0.8 + halo * 0.4);
        gl_FragColor = vec4(vColor, a * vTwinkle * uOpacity);
      }
    `,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.position.set(0, 0, 0);
  stars.frustumCulled = false;
  stars.renderOrder = -999;
  stars.visible = false;
  scene.add(stars);

  // ===========================================================================
  // SUN / MOON disk + glow sprites
  // ===========================================================================
  function makeGlowTexture() {
    const size = 256;
    const canvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    if (!canvas) return null;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.16, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.30)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Sharp-edged disk (sun); moon uses a separate cratered/crescent canvas.
  function makeDiskTexture() {
    const size = 128;
    const canvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    if (!canvas) return null;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.74, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.86, 'rgba(255,255,255,0.55)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeMoonTexture() {
    const size = 128;
    const canvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    if (!canvas) return null;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2, R = size * 0.46;
    // base lit disk
    const g = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.1, cx, cy, R);
    g.addColorStop(0.0, 'rgba(245,248,255,1.0)');
    g.addColorStop(0.8, 'rgba(205,220,235,1.0)');
    g.addColorStop(1.0, 'rgba(175,195,215,0.95)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    // craters / maria
    const seeded = (() => { let s = 9973; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
    for (let i = 0; i < 24; i++) {
      const a = seeded() * Math.PI * 2;
      const rr = Math.sqrt(seeded()) * R * 0.82;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      const cr = R * (0.04 + seeded() * 0.13);
      ctx.fillStyle = `rgba(150,168,190,${0.18 + seeded() * 0.22})`;
      ctx.beginPath();
      ctx.arc(x, y, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // soft rim
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const glowTex = makeGlowTexture();
  const diskTex = makeDiskTexture();
  const moonTex = makeMoonTexture();

  const bodyDistance = radius * 0.84;
  const bodyPos = center.clone().add(lightDir.clone().multiplyScalar(bodyDistance));

  // Outer glow sprite (additive).
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex || null,
    color: DAY.sunGlow.clone(),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    opacity: 1.0,
    fog: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.position.copy(bodyPos);
  const glowScale = radius * 0.5;
  glow.scale.set(glowScale, glowScale, 1);
  glow.frustumCulled = false;
  glow.renderOrder = -997;
  scene.add(glow);

  // Crisp disk sprite (sun by day, moon by night via map swap).
  const diskMat = new THREE.SpriteMaterial({
    map: diskTex || null,
    color: DAY.sun.clone(),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    opacity: 1.0,
    fog: false,
  });
  const disk = new THREE.Sprite(diskMat);
  disk.position.copy(bodyPos);
  const sunDiskScale = radius * 0.10;
  const moonDiskScale = radius * 0.085;
  disk.scale.set(sunDiskScale, sunDiskScale, 1);
  disk.frustumCulled = false;
  disk.renderOrder = -996;
  scene.add(disk);

  // ---- Day/Night state (animated crossfade) ---------------------------------
  let night = false;
  let dayFactor = 1.0;     // current animated value
  let targetFactor = 1.0;  // 1 = day, 0 = night

  function applyFactor(f) {
    skyUniforms.dayFactor.value = f;
    cloudUniforms.dayFactor.value = f;
    starUniforms.uOpacity.value = 1.0 - f;
    stars.visible = f < 0.985;

    // Body color crossfade.
    diskMat.color.copy(NIGHT.sun).lerp(DAY.sun, f);
    glowMat.color.copy(NIGHT.sunGlow).lerp(DAY.sunGlow, f);
    skyUniforms.sunColor.value.copy(NIGHT.sun).lerp(DAY.sun, f);
    skyUniforms.sunGlow.value.copy(NIGHT.sunGlow).lerp(DAY.sunGlow, f);

    // Disk map + scale swap: snap to moon once we're mostly night.
    const wantMoon = f < 0.5;
    const desiredMap = wantMoon ? (moonTex || diskTex) : diskTex;
    if (diskMat.map !== desiredMap) {
      diskMat.map = desiredMap || null;
      diskMat.blending = wantMoon ? THREE.NormalBlending : THREE.AdditiveBlending;
      diskMat.needsUpdate = true;
    }
    const ds = wantMoon ? moonDiskScale : sunDiskScale;
    disk.scale.set(ds, ds, 1);
    diskMat.opacity = wantMoon ? 1.0 : 1.0;

    // Glow shrinks a touch at night.
    const gs = glowScale * (0.6 + 0.4 * f);
    glow.scale.set(gs, gs, 1);
    glowMat.opacity = 0.55 + 0.45 * f;
  }

  function setDayNight(isNight) {
    night = !!isNight;
    targetFactor = night ? 0.0 : 1.0;
  }

  // initialize (snap, no animation on first set)
  setDayNight(options.night === true);
  dayFactor = targetFactor;
  applyFactor(dayFactor);

  // ---- Update ---------------------------------------------------------------
  function update(dt, elapsed) {
    const t = typeof elapsed === 'number' ? elapsed : 0;
    const d = typeof dt === 'number' ? dt : 0.016;

    // Smooth crossfade toward target (~2.5s transition).
    if (dayFactor !== targetFactor) {
      const rate = d / 2.5;
      if (dayFactor < targetFactor) dayFactor = Math.min(targetFactor, dayFactor + rate);
      else dayFactor = Math.max(targetFactor, dayFactor - rate);
      applyFactor(dayFactor);
    }

    skyUniforms.uTime.value = t;
    cloudUniforms.uTime.value = t;
    starUniforms.uTime.value = t;

    // Slow celestial drift / sky life.
    skyMesh.rotation.z = t * 0.0012;
    cloudMesh.rotation.z = t * 0.0024;
    if (stars.visible) stars.rotation.z = t * 0.0012;
  }

  // ---- Dispose --------------------------------------------------------------
  function dispose() {
    scene.remove(skyMesh);
    scene.remove(cloudMesh);
    scene.remove(stars);
    scene.remove(glow);
    scene.remove(disk);
    skyGeo.dispose();
    skyMat.dispose();
    cloudGeo.dispose();
    cloudMat.dispose();
    starGeo.dispose();
    starMat.dispose();
    glowMat.dispose();
    diskMat.dispose();
    if (glowTex && glowTex.dispose) glowTex.dispose();
    if (diskTex && diskTex.dispose) diskTex.dispose();
    if (moonTex && moonTex.dispose) moonTex.dispose();
  }

  return { setDayNight, update, dispose };
}
