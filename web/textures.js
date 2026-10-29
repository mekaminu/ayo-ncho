// Procedural wood, seed and cloth textures (no image files: everything is generated on the device).
// `q` is a quality tier from quality.js: the lighter one draws the same grain at half size for slow phones.
import * as THREE from 'three';


// ---------- procedural textures ----------
export function noise2(w,h,oct){ // value noise, returns Float32Array
  const out=new Float32Array(w*h);
  for(let o=0;o<oct;o++){
    const f=2**o, amp=1/f; const gw=Math.max(2,Math.floor(w/ (64/f))), gh=Math.max(2,Math.floor(h/(64/f)));
    const g=new Float32Array(gw*gh); for(let i=0;i<g.length;i++) g[i]=Math.random();
    for(let y=0;y<h;y++){ const gy=y/h*gh, y0=Math.floor(gy), y1=(y0+1)%gh, ty=gy-y0, sy=ty*ty*(3-2*ty);
      for(let x=0;x<w;x++){ const gx=x/w*gw, x0=Math.floor(gx), x1=(x0+1)%gw, tx=gx-x0, sx=tx*tx*(3-2*tx);
        const a=g[y0*gw+x0], b=g[y0*gw+x1], c=g[y1*gw+x0], d=g[y1*gw+x1];
        out[y*w+x]+=amp*((a*(1-sx)+b*sx)*(1-sy)+(c*(1-sx)+d*sx)*sy); } }
  }
  let mx=0; for(const v of out) mx=Math.max(mx,v); for(let i=0;i<out.length;i++) out[i]/=mx; return out;
}
export function woodTextures(finish, q={}){
  const W=q.woodW||1024,H=q.woodH||2048; const c=document.createElement('canvas'); c.width=W;c.height=H; const ctx=c.getContext('2d');
  const img=ctx.createImageData(W,H); const n=noise2(W,H,5), n2=noise2(W,H,3);
  const pal={mahogany:[[0x6e,0x39,0x20],[0x4c,0x24,0x13],[0x8a,0x4e,0x2d]], iroko:[[0xa9,0x7a,0x3d],[0x83,0x5a,0x28],[0xc4,0x95,0x52]], ebony:[[0x2a,0x22,0x1c],[0x16,0x11,0x0e],[0x3b,0x30,0x27]]}[finish];
  const bump=document.createElement('canvas'); bump.width=W;bump.height=H; const bctx=bump.getContext('2d'); const bimg=bctx.createImageData(W,H);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const i=y*W+x; const g=Math.sin((x/W)*110 + n[i]*7 + Math.sin(y/H*5)*2.0); // grain runs along the length (y)
    const ring=(g*0.5+0.5)**1.6; const fine=n2[i]*0.5+0.5; const pore=(Math.sin(y*0.9+n[i]*40)*0.5+0.5)**12*0.35;
    const t=ring*0.75+fine*0.25;
    const r=pal[1][0]+(pal[0][0]-pal[1][0])*t + (pal[2][0]-pal[0][0])*(1-ring)*0.25 - pore*30;
    const gg=pal[1][1]+(pal[0][1]-pal[1][1])*t + (pal[2][1]-pal[0][1])*(1-ring)*0.25 - pore*25;
    const b=pal[1][2]+(pal[0][2]-pal[1][2])*t + (pal[2][2]-pal[0][2])*(1-ring)*0.25 - pore*20;
    const o=i*4; img.data[o]=r; img.data[o+1]=gg; img.data[o+2]=b; img.data[o+3]=255;
    const bv=255*(0.5+0.25*(ring-0.5)+0.25*(fine-0.5)-pore*0.6); bimg.data[o]=bimg.data[o+1]=bimg.data[o+2]=bv; bimg.data[o+3]=255;
  }
  ctx.putImageData(img,0,0); bctx.putImageData(bimg,0,0);
  const map=new THREE.CanvasTexture(c); map.colorSpace=THREE.SRGBColorSpace; map.wrapS=map.wrapT=THREE.RepeatWrapping; map.anisotropy=q.anisotropy||8;
  const bmap=new THREE.CanvasTexture(bump); bmap.wrapS=bmap.wrapT=THREE.RepeatWrapping;
  return {map,bump:bmap};
}
export function seedTexture(q={}){
  const S=q.seedS||256; const c=document.createElement('canvas'); c.width=c.height=S; const ctx=c.getContext('2d');
  const n=noise2(S,S,4); const img=ctx.createImageData(S,S);
  for(let i=0;i<S*S;i++){ const v=n[i]; const t=v*v; const r=0x8e+(0xd8-0x8e)*t, g=0x92+(0xd6-0x92)*t, b=0x74+(0xb2-0x74)*t; const o=i*4;
    const spot=(v>0.72)?-28:0; img.data[o]=r+spot; img.data[o+1]=g+spot; img.data[o+2]=b+spot; img.data[o+3]=255; }
  ctx.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
// River stones: cool grey with warm speckles and a faint vein, for the seed set the calm streak unlocks.
export function stoneTexture(q={}){
  const S=q.seedS||256; const c=document.createElement('canvas'); c.width=c.height=S; const ctx=c.getContext('2d');
  const n=noise2(S,S,4), v=noise2(S,S,2); const img=ctx.createImageData(S,S);
  for(let i=0;i<S*S;i++){ const t=n[i]; const vein=Math.pow(Math.max(0,1-Math.abs(v[i]-0.55)*9),3)*22; const o=i*4;
    const spot=(t>0.78)?-18:(t<0.22?-10:0); const r=0x7c+(0xa6-0x7c)*t+spot+vein*0.8, g=0x79+(0xa0-0x79)*t+spot+vein*0.7, b=0x74+(0x98-0x74)*t+spot+vein*0.5;
    img.data[o]=r; img.data[o+1]=g; img.data[o+2]=b; img.data[o+3]=255; }
  ctx.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
export function clothTexture(q={}){
  const S=q.clothS||512; const c=document.createElement('canvas'); c.width=c.height=S; const ctx=c.getContext('2d'); const n=noise2(S,S,5); const img=ctx.createImageData(S,S);
  for(let i=0;i<S*S;i++){ const v=0.18+n[i]*0.14; const o=i*4; img.data[o]=38*v*2; img.data[o+1]=26*v*2; img.data[o+2]=18*v*2; img.data[o+3]=255; }
  ctx.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(6,6); return t;
}

