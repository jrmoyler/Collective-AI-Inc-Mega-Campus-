// sky.js — procedural surrounding sky for the Three.js campus viewer.
// Z is UP. Site center ~ (548.5, 332, 0). Sky dome radius ~4500.
// THREE is injected; do NOT import it here.

export function createSky(THREE, scene, options = {}) {
  const center = new THREE.Vector3(
    options.centerX != null ? options.centerX : 548.5,
    options.centerY != null ? options.centerY : 332,
    options.centerZ != null ? options.centerZ : 0
  );
  const radius = options.radius != null ? options.radius : 4500;

  // ---- Color palettes -------------------------------------------------------
  const NIGHT = {
    top: new THREE.Color('#020812'),
    bottom: new THREE.Color('#0a2038'),
    haze: new THREE.Color('#0e3550'),
    offset: 8.0,
    exponent: 0.9,
  };
  const DAY = {
    top: new THREE.Color('#3a78c8'),
    bottom: new THREE.Color('#cfe2f2'),
    haze: new THREE.Color('#87b9e8'),
    offset: 12.0,
    exponent: 0.7,
  };

  // ---- Gradient sky dome (ShaderMaterial) -----------------------------------
  // World-space direction is derived from local position (sphere centered at
  // origin, mesh translated to site center). Z is up, so we use normalized z.
  const skyUniforms = {
    topColor: { value: DAY.top.clone() },
    bottomColor: { value: DAY.bottom.clone() },
    hazeColor: { value: DAY.haze.clone() },
    offset: { value: DAY.offset },
    exponent: { value: DAY.exponent },
  };

  const skyVert = `
    varying vec3 vDir;
    void main() {
      // position is local to the sphere (centered at origin), so it is the
      // outward direction from the dome center.
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const skyFrag = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform vec3 hazeColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vDir;
    void main() {
      // Z is up. h in [-1,1] over the sphere; remap to [0,1] vertical.
      float h = normalize(vDir).z;
      float t = clamp((h * offset + 1.0) * 0.5, 0.0, 1.0);
      t = pow(t, exponent);
      vec3 col = mix(bottomColor, topColor, t);
      // Horizon haze band: strongest right at the horizon, fading up.
      float hb = clamp(1.0 - abs(h) * 6.0, 0.0, 1.0);
      col = mix(col, hazeColor, hb * 0.45);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const skyGeo = new THREE.SphereGeometry(radius, 48, 32);
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

  // ---- Stars (night only) ---------------------------------------------------
  const STAR_COUNT = options.starCount != null ? options.starCount : 1500;
  const starRadius = radius * 0.9;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starPhase = new Float32Array(STAR_COUNT);
  const starBaseSize = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    // Upper hemisphere (z >= small positive). Cosine-ish distribution biased up.
    const u = Math.random();
    const v = Math.random();
    const theta = 2.0 * Math.PI * u;          // azimuth
    const z = 0.05 + 0.95 * v;                 // height fraction (upper hemi)
    const r = Math.sqrt(Math.max(0.0, 1.0 - z * z));
    starPositions[i * 3 + 0] = center.x + Math.cos(theta) * r * starRadius;
    starPositions[i * 3 + 1] = center.y + Math.sin(theta) * r * starRadius;
    starPositions[i * 3 + 2] = center.z + z * starRadius;
    starPhase[i] = Math.random() * Math.PI * 2.0;
    starBaseSize[i] = radius * (0.0016 + Math.random() * 0.0030);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starBaseSize, 1));

  const starUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
  };
  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aPhase;
      attribute float aSize;
      uniform float uTime;
      varying float vTwinkle;
      void main() {
        // Twinkle: modulate size & brightness.
        float tw = 0.65 + 0.35 * sin(uTime * 2.0 + aPhase);
        vTwinkle = tw;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * tw * (300.0 / max(1.0, -mv.z)) * 1.0;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vTwinkle;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 1.0, 0.96), a * vTwinkle * uOpacity);
      }
    `,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.position.set(0, 0, 0);
  stars.frustumCulled = false;
  stars.renderOrder = -999;
  stars.visible = false;
  scene.add(stars);

  // ---- Sun / Moon glow sprite -----------------------------------------------
  function makeGlowTexture() {
    const size = 256;
    const canvas =
      typeof document !== 'undefined'
        ? document.createElement('canvas')
        : null;
    if (!canvas) return null;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    return tex;
  }
  const glowTex = makeGlowTexture();

  // Direction the light comes from: NW and high up. With Z up, NW ~ (-X, +Y).
  const lightDir = new THREE.Vector3(-0.55, 0.5, 0.66).normalize();
  const bodyDistance = radius * 0.82;
  const bodyPos = center.clone().add(lightDir.clone().multiplyScalar(bodyDistance));

  const SUN_COLOR = new THREE.Color('#fff3d0');
  const MOON_COLOR = new THREE.Color('#cfe6f2');

  const spriteMat = new THREE.SpriteMaterial({
    map: glowTex || null,
    color: SUN_COLOR.clone(),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    opacity: 1.0,
    fog: false,
  });
  const body = new THREE.Sprite(spriteMat);
  body.position.copy(bodyPos);
  const bodyScale = radius * 0.35;
  body.scale.set(bodyScale, bodyScale, 1);
  body.frustumCulled = false;
  body.renderOrder = -998;
  scene.add(body);

  // ---- Day/Night state ------------------------------------------------------
  let night = false;

  function applyPalette(p) {
    skyUniforms.topColor.value.copy(p.top);
    skyUniforms.bottomColor.value.copy(p.bottom);
    skyUniforms.hazeColor.value.copy(p.haze);
    skyUniforms.offset.value = p.offset;
    skyUniforms.exponent.value = p.exponent;
  }

  function setDayNight(isNight) {
    night = !!isNight;
    if (night) {
      applyPalette(NIGHT);
      stars.visible = true;
      starUniforms.uOpacity.value = 1.0;
      spriteMat.color.copy(MOON_COLOR);
      spriteMat.opacity = 0.85;
      body.scale.set(bodyScale * 0.72, bodyScale * 0.72, 1);
    } else {
      applyPalette(DAY);
      stars.visible = false;
      starUniforms.uOpacity.value = 0.0;
      spriteMat.color.copy(SUN_COLOR);
      spriteMat.opacity = 1.0;
      body.scale.set(bodyScale, bodyScale, 1);
    }
  }

  // initialize to day by default (or honor option)
  setDayNight(options.night === true);

  // ---- Update ---------------------------------------------------------------
  function update(dt, elapsed) {
    const t = typeof elapsed === 'number' ? elapsed : 0;
    starUniforms.uTime.value = t;
    // Very slow sky rotation about the up (Z) axis for subtle life.
    skyMesh.rotation.z = t * 0.0015;
    if (stars.visible) {
      stars.rotation.z = t * 0.0015;
    }
  }

  // ---- Dispose --------------------------------------------------------------
  function dispose() {
    scene.remove(skyMesh);
    scene.remove(stars);
    scene.remove(body);
    skyGeo.dispose();
    skyMat.dispose();
    starGeo.dispose();
    starMat.dispose();
    spriteMat.dispose();
    if (glowTex && glowTex.dispose) glowTex.dispose();
  }

  return { setDayNight, update, dispose };
}
