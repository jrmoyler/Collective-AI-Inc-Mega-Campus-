// Aerial perspective for the exterior.
//
// Three's linear fog depends on view depth only, so a 1.2 km aerial looked
// through the same "clear air" at the lawn below as at the horizon, and the
// distant countryside kept full foreground saturation. Real haze is denser near
// the ground and thins with altitude, and the air glows warmer toward the sun.
//
// installAerialPerspective() replaces the four fog chunks once, before any
// exterior material compiles. It keeps the scene.fog API (a THREE.Fog):
//   fog.near  distance of perfectly clear air around the camera (metres)
//   fog.far   ground-level visibility: haze reaches ~95% at this distance
// FogExp2 scenes keep three's original behaviour.
//
// The optical depth integrates an exponential density exp(-y/H) along the ray
// from the camera to the shaded point, so tall facades stay crisp while the far
// ground recedes. Lit materials (those defining RE_Direct) also scatter the
// shadow-casting sun, which three always sorts to directionalLights[0].

export const AERIAL_SCALE_HEIGHT=180;
export const AERIAL_MARKER='/* campus-aerial-perspective */';

// JS mirror of the GLSL, used by tests and by the QA panel to reason about
// how much haze a view receives. Returns the fraction of fog colour (0..1).
export function aerialHaze(distance,cameraY,pointY,{near=0,far=6000,scaleHeight=AERIAL_SCALE_HEIGHT}={}){
 const hazeDistance=Math.max(0,distance-near);
 if(!(hazeDistance>0))return 0;
 const sigma=3/Math.max(1,far-near),k=1/scaleHeight;
 const y0=Math.max(cameraY,-10),y1=Math.max(pointY,-10),dy=y1-y0;
 const x=k*dy;
 const column=Math.exp(-k*y0)*(Math.abs(x)<1e-4?1-x/2:(1-Math.exp(-x))/x);
 return 1-Math.exp(-sigma*hazeDistance*column);
}

const parsVertex=`${AERIAL_MARKER}
#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vFogViewPosition;
	varying vec3 vFogWorldPosition;
#endif`;

// viewMatrix is rigid, so its inverse is the transposed rotation. Deriving the
// world position from mvPosition covers instancing, batching and skinning.
const vertex=`
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vFogViewPosition = mvPosition.xyz;
	vFogWorldPosition = transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz );
#endif`;

const parsFragment=`
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vFogViewPosition;
	varying vec3 vFogWorldPosition;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`;

const fragment=`
#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
		gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
	#else
		vec3 aerialRay = vFogWorldPosition - cameraPosition;
		float aerialDistance = max( length( aerialRay ) - fogNear, 0.0 );
		float aerialK = 1.0 / ${AERIAL_SCALE_HEIGHT.toFixed(1)};
		float aerialY0 = max( cameraPosition.y, - 10.0 );
		float aerialX = aerialK * ( max( vFogWorldPosition.y, - 10.0 ) - aerialY0 );
		float aerialColumn = exp( - aerialK * aerialY0 ) * ( abs( aerialX ) < 1e-4 ? 1.0 - 0.5 * aerialX : ( 1.0 - exp( - aerialX ) ) / aerialX );
		float fogFactor = 1.0 - exp( - 3.0 / max( fogFar - fogNear, 1.0 ) * aerialDistance * aerialColumn );
		vec3 aerialColor = fogColor;
		#if defined( RE_Direct ) && NUM_DIR_LIGHTS > 0
			// Forward-scattering lobe toward the sun; hue only, so the sun's
			// intensity never brightens the haze past the sky it sits in.
			vec3 aerialSun = directionalLights[ 0 ].color;
			aerialSun /= max( max( aerialSun.r, max( aerialSun.g, aerialSun.b ) ), 1e-3 );
			float aerialCos = max( dot( normalize( vFogViewPosition ), directionalLights[ 0 ].direction ), 0.0 );
			float aerialPhase = 0.18 * pow( aerialCos, 4.0 ) + 0.32 * pow( aerialCos, 24.0 );
			aerialColor = mix( fogColor, fogColor * aerialSun * 1.35, aerialPhase );
		#endif
		gl_FragColor.rgb = mix( gl_FragColor.rgb, aerialColor, fogFactor );
	#endif
#endif`;

export function installAerialPerspective(ShaderChunk){
 if(ShaderChunk.fog_pars_vertex?.startsWith(AERIAL_MARKER))return false;
 ShaderChunk.fog_pars_vertex=parsVertex;
 ShaderChunk.fog_vertex=vertex;
 ShaderChunk.fog_pars_fragment=parsFragment;
 ShaderChunk.fog_fragment=fragment;
 return true;
}

// Per-mode atmosphere. Colours are sRGB hex. fogNear/fogFar use the aerial
// semantic above: the default 1.2 km aerial keeps the whole campus within
// ~15% haze, while the countryside toward the horizon recedes into the sky.
// envGround is the lower hemisphere of the reflection probe: a lit lawn/paving
// radiance in sky units, so glazing reflects ground below the horizon instead
// of a second bright sky (DESIGN.md: glass must not glow).
export const ATMOSPHERE_PRESETS=Object.freeze({
 day:Object.freeze({fogColor:0xb9cddd,fogNear:450,fogFar:6800,exposure:.9,environmentIntensity:.32,envGround:0x6c7458}),
 dusk:Object.freeze({fogColor:0x2c3556,fogNear:380,fogFar:5600,exposure:1.2,environmentIntensity:.35,envGround:0x24232a}),
});
export function atmospherePreset(day){return day?ATMOSPHERE_PRESETS.day:ATMOSPHERE_PRESETS.dusk;}
