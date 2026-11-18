import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

// Display-referred finishing pass. It runs after OutputPass (tone mapping and
// the sRGB transfer), the place a photographic LUT would sit, and does four
// small things a camera pipeline does and the raw renderer does not:
//  - a gentle toe/shoulder S-curve so the tone-mapped image is not flat grey,
//  - split toning: neutral-cool shadows, warm highlights (the daylight preset
//    stays almost neutral so masonry and glass keep their own colour),
//  - vibrance that lifts muted colours without pushing saturated ones,
//  - a soft optical vignette and blue-noise-like dither that removes 8-bit
//    banding from the sky gradient.
// None of it adds light: glass, foliage, water and masonry cannot glow here.

// Presets are deliberately restrained; see DESIGN.md (September 17).
export const GRADE_PRESETS=Object.freeze({
 day:Object.freeze({contrast:.14,saturation:1.02,vibrance:.1,shadowTint:[.985,1,1.02],highlightTint:[1.015,1.005,.985],vignette:.16,dither:1}),
 dusk:Object.freeze({contrast:.1,saturation:1,vibrance:.06,shadowTint:[.97,.99,1.04],highlightTint:[1.03,1,.96],vignette:.22,dither:1}),
});

export function gradePreset(day){return day?GRADE_PRESETS.day:GRADE_PRESETS.dusk;}

export const GradeShader={
 name:'CampusGradeShader',
 uniforms:{
  tDiffuse:{value:null},
  aspect:{value:1},
  contrast:{value:GRADE_PRESETS.day.contrast},
  saturation:{value:GRADE_PRESETS.day.saturation},
  vibrance:{value:GRADE_PRESETS.day.vibrance},
  shadowTint:{value:[...GRADE_PRESETS.day.shadowTint]},
  highlightTint:{value:[...GRADE_PRESETS.day.highlightTint]},
  vignette:{value:GRADE_PRESETS.day.vignette},
  dither:{value:1},
 },
 vertexShader:/* glsl */`
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:/* glsl */`
  uniform sampler2D tDiffuse;
  uniform float aspect,contrast,saturation,vibrance,vignette,dither;
  uniform vec3 shadowTint,highlightTint;
  varying vec2 vUv;
  float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
  void main(){
   vec4 texel=texture2D(tDiffuse,vUv);
   vec3 c=clamp(texel.rgb,0.0,1.0);
   float l=dot(c,vec3(.2126,.7152,.0722));
   c*=mix(shadowTint,highlightTint,smoothstep(.12,.82,l));
   vec3 s=c*c*(3.0-2.0*c);
   c=mix(c,s,contrast);
   l=dot(c,vec3(.2126,.7152,.0722));
   float chroma=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
   c=mix(vec3(l),c,saturation+vibrance*(1.0-smoothstep(0.0,.6,chroma)));
   vec2 d=(vUv-.5)*vec2(aspect,1.0);
   float r=dot(d,d)/(.25*aspect*aspect+.25);
   c*=1.0-vignette*r*r*(3.0-2.0*r);
   c+=dither*(ign(gl_FragCoord.xy)+ign(gl_FragCoord.yx+17.0)-1.0)/255.0;
   gl_FragColor=vec4(clamp(c,0.0,1.0),texel.a);
  }`,
};

export function createGradePass(){
 const pass=new ShaderPass(GradeShader);
 pass.name='campus-grade';
 const base=pass.setSize.bind(pass);
 pass.setSize=(width,height)=>{base(width,height);pass.uniforms.aspect.value=height>0?width/height:1;};
 pass.setPreset=preset=>{
  const u=pass.uniforms;
  for(const key of ['contrast','saturation','vibrance','vignette','dither'])u[key].value=preset[key];
  u.shadowTint.value=[...preset.shadowTint];u.highlightTint.value=[...preset.highlightTint];
 };
 return pass;
}
