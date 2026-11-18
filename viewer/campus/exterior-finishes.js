import * as T from 'three';

// R stores relief and G stores microsurface roughness. Packing both linear
// channels together keeps the surface maps aligned and halves texture uploads.
const SIZE=128, TAU=Math.PI*2;
function texture(bytes,color){
 const t=new T.DataTexture(bytes,SIZE,SIZE);
 t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
 t.wrapS=t.wrapT=T.RepeatWrapping;
 t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;
 t.anisotropy=8;t.generateMipmaps=true;t.needsUpdate=true;
 return t;
}

function limestone(u,v,grit){
 const course=Math.floor(v*4), jointU=(u*3+course%2*.5)%1, jointV=(v*4)%1;
 const mortar=Math.min(jointU,1-jointU)*SIZE/3<.65||Math.min(jointV,1-jointV)*SIZE/4<.65;
 const bedding=Math.sin(TAU*(3*u+v)+.65*Math.sin(TAU*(2*v-u)));
 const fossil=Math.cos(TAU*(u+2*v)+.9*Math.cos(TAU*3*u))>.974;
 const grain=bedding*3.7+grit*7+(fossil?7:0)-(mortar?37:0);
 return [209+grain,202+grain*.93,187+grain*.84,mortar?60:180+grit*18,mortar?229:178+grit*15];
}

function graphite(u,v,grit){
 const panel=(u*2)%1, seam=Math.min(panel,1-panel)<.008||Math.min(v,1-v)<.009;
 const brushing=2*Math.sin(TAU*24*v+Math.sin(TAU*u))+grit*3;
 const k=brushing+(u>.5?1.4:-1.4)-(seam?13:0);
 return [45+k,52+k,57+k,seam?48:161+grit*9,seam?191:116+grit*17];
}

function copper(u,v,grit){
 const roll=Math.sin(TAU*(2*u-v)+Math.cos(TAU*2*v));
 const oxide=Math.max(0,(Math.sin(TAU*(u+v)+1.2*Math.sin(TAU*u))-.5)*1.8);
 const grain=grit*7+roll*6;
 return [173+grain-47*oxide,109+grain*.62+14*oxide,72+grain*.52+22*oxide,148+oxide*14+grit*11,99+oxide*70+grit*14];
}

function createFinish(sample,seed){
 const albedo=new Uint8Array(SIZE*SIZE*4), detail=new Uint8Array(albedo.length);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const [r,g,b,h,rough]=sample((x+.5)/SIZE,(y+.5)/SIZE,seed/4294967296-.5);
  const off=(y*SIZE+x)*4;
  albedo[off]=r;albedo[off+1]=g;albedo[off+2]=b;albedo[off+3]=255;
  detail[off]=h;detail[off+1]=rough;detail[off+2]=255;detail[off+3]=255;
 }
 return {color:texture(albedo,true),surface:texture(detail,false)};
}

export const exteriorFinishes={
 limestone:createFinish(limestone,4277),graphite:createFinish(graphite,6193),copper:createFinish(copper,5729),
};

const dimensions={
 stone:[4.8,2.4],civic:[4.8,2.4],path:[4.8,2.4],dark:[2.4,1.2],copper:[1.2,1.2]
};

// Project the finished, merged surfaces in metres. This keeps masonry courses
// the same size on a 50-metre podium and a 2-metre wall return.
export function setExteriorUV(geometry,materialKey){
 const spans=dimensions[materialKey];
 if(!spans)return;
 const {position,normal,uv}=geometry.attributes;
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
  const nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i);
  if(Math.abs(ny)>.7)uv.setXY(i,x/spans[0],z/spans[1]);
  else if(Math.abs(nx)>Math.abs(nz))uv.setXY(i,z/spans[0],y/spans[1]);
  else uv.setXY(i,x/spans[0],y/spans[1]);
 }
}
