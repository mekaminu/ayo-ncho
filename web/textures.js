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

// Cowries (L10, a look sold in the store): the money cowrie's glossy ivory back with a faint warm band and paler flanks, and
// on the flat underside (the sphere's bottom, v < ~0.35) the slit along the shell's length lined with its little teeth.
// The slit sits on the meridians where z = 0 (u = 0, 0.5, 1 in three's sphere), the long axis of the scaled seed.
export function cowrieTexture(q={}){
  const S=q.seedS||256; const c=document.createElement('canvas'); c.width=c.height=S; const ctx=c.getContext('2d');
  const n=noise2(S,S,4); const img=ctx.createImageData(S,S);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const i=y*S+x, o=i*4; const u=x/S, v=1-y/S; const t=n[i];
    let r=0xee+t*14, g=0xe2+t*12, b=0xc6+t*10; // ivory
    const band=Math.exp(-Math.pow((v-0.78)/0.07,2))*0.6+Math.exp(-Math.pow((v-0.62)/0.05,2))*0.35; r-=band*22; g-=band*30; b-=band*46; // the dorsal bands, a pale honey
    if(v<0.42){ const k=(0.42-v)/0.42; r+=k*10; g+=k*14; b+=k*24; } // the base whiter
    const du=Math.min(Math.abs(u-0),Math.abs(u-0.5),Math.abs(u-1)); const w=0.006+0.05*Math.max(0,0.32-v);
    if(v<0.36 && du<w*2.6){ const tooth=Math.sin(v*190)>0.15; const inSlit=du<w; // the dark slit, ridged teeth on its lips
      const d=inSlit?0.62:(tooth?0.2:0.04); r*=1-d; g*=1-d*1.05; b*=1-d*1.15; }
    img.data[o]=Math.min(255,r); img.data[o+1]=Math.min(255,g); img.data[o+2]=Math.min(255,b); img.data[o+3]=255; }
  ctx.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
// Palm kernels (L10): the nut's dark brown shell, a net of pale fibres where the husk was and a few warmer patches, and the
// three germ pores ("eyes") at one end (the +x end of the seed: u = 0.5, v = 0.5).
export function kernelTexture(q={}){
  const S=q.seedS||256; const c=document.createElement('canvas'); c.width=c.height=S; const ctx=c.getContext('2d');
  const n=noise2(S,S,5), f=noise2(S,S,4), m=noise2(S,S,2); const img=ctx.createImageData(S,S);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const i=y*S+x, o=i*4; const u=x/S, v=1-y/S; const t=n[i];
    const fibre=Math.pow(Math.max(0,1-Math.abs(f[i]-0.5)*5),1.5)*0.8+Math.pow(Math.max(0,1-Math.abs(n[i]-0.45)*9),2)*0.4;
    const patch=Math.max(0,m[i]-0.55)*1.6;
    let r=0x2c+t*24+fibre*112+patch*50, g=0x1c+t*16+fibre*80+patch*32, b=0x11+t*8+fibre*50+patch*16;
    for(const [pu,pv] of [[0.5,0.56],[0.47,0.46],[0.53,0.46]]){ const d=Math.hypot((u-pu)*2,(v-pv)); if(d<0.026){ const k=1-d/0.026; r+=k*70; g+=k*58; b+=k*40; } }
    img.data[o]=Math.min(255,r); img.data[o+1]=Math.min(255,g); img.data[o+2]=Math.min(255,b); img.data[o+3]=255; }
  ctx.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}

// ---------- the boards sold as looks (L10, slice 2) ----------
// Both are drawn in board coordinates: `geo` is { BW, BL, R, pits: [[x,z]…], PIT_R, stores: [[x,z]…], SRX, SRZ } from board.js
// (passed in, so this file never imports the board). The top's UV is planar: u = x/BW + 0.5, v = z/BL + 0.5, and a canvas
// texture is flipped, so canvas row py is v = 1 - py/H. The board is symmetric end to end, so the flip changes nothing drawn.
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function canvasPair(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const b = document.createElement('canvas'); b.width = W; b.height = H;
  const ctx = c.getContext('2d'), bctx = b.getContext('2d'); return { c, b, ctx, bctx, img: ctx.createImageData(W, H), bimg: bctx.createImageData(W, H) };
}
function finishPair(p, q) {
  p.ctx.putImageData(p.img, 0, 0); p.bctx.putImageData(p.bimg, 0, 0);
  const map = new THREE.CanvasTexture(p.c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = q.anisotropy || 8;
  const bump = new THREE.CanvasTexture(p.b); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; return { map, bump };
}
// Where a point of the board's top lies: inside a pit or trough bowl (0 outside, up to 1 at the middle) — cheap, no carving.
function hollow(x, z, g) {
  let h = 0;
  for (const [px, pz] of g.pits) { const d = Math.hypot(x - px, z - pz) / g.PIT_R; if (d < 1) h = Math.max(h, 1 - d); }
  for (const [sx, sz] of g.stores) { const d = Math.hypot((x - sx) / g.SRX, (z - sz) / g.SRZ); if (d < 1) h = Math.max(h, 1 - d); }
  return h;
}

// The guilloche — the two-strand braid of the Benin court castings — as a pure function, so it can be tested: for a point
// (x across, z along, metres) of the braid running down the board's middle, how high the metal stands (0 the ground, 1 the top of
// a strand) and whether the point is in a strand, in an "eye" between the strands (each eye holds a punched dot), or on the
// incised line that edges the braid. Strands cross every half period; which one passes over alternates, as a real braid does.
export const BRAID = { A: 0.0085, w: 0.0034, k: 2 * Math.PI / 0.034, edge: 0.0175, ends: 0.43 };
export function braidAt(x, z) {
  const { A, w, k, edge, ends } = BRAID; const out = { h: 0, kind: 'ground' };
  if (Math.abs(z) > ends) return out;
  const fade = smooth(ends, ends - 0.02, Math.abs(z)); // the braid's ends tuck in under the troughs' rims
  const ph = k * z, s = A * Math.sin(ph), slope = Math.abs(A * k * Math.cos(ph)), scale = 1 / Math.sqrt(1 + slope * slope);
  const d1 = Math.abs(x - s) * scale, d2 = Math.abs(x + s) * scale; // near-perpendicular distance to each strand
  const over = Math.floor(ph / Math.PI + 0.5) % 2 === 0 ? 1 : 2; // which strand is on top at the crossing nearest this point
  const prof = (d) => Math.sqrt(Math.max(0, 1 - (d / w) ** 2));
  let h1 = d1 < w ? prof(d1) : 0, h2 = d2 < w ? prof(d2) : 0;
  // where the strands cross, the one underneath vanishes under the other and a little gap is left round the top one
  const dOver = over === 1 ? d1 : d2;
  if (dOver < w * 1.35) { if (over === 1) h2 = 0; else h1 = 0; if (dOver >= w) { out.h = -0.25 * fade; out.kind = 'groove'; return out; } }
  const h = Math.max(h1, h2) * fade;
  if (h > 0.02) { out.h = 0.35 + 0.65 * h; out.kind = 'strand'; return out; }
  // the groove round each strand
  if (Math.min(d1, d2) < w * 1.3) { out.h = -0.25 * fade; out.kind = 'groove'; return out; }
  // an eye: between the strands, away from the crossings; a punched dot in its middle
  if (Math.abs(x) < Math.abs(s) && Math.abs(Math.sin(ph)) > 0.6) {
    const cz = (Math.floor(ph / Math.PI) + 0.5) * Math.PI / k; const dd = Math.hypot(x, z - cz);
    out.kind = 'eye'; out.h = dd < 0.0018 ? -0.55 * fade : 0; return out;
  }
  if (Math.abs(Math.abs(x) - edge) < 0.0007) { out.h = -0.4 * fade; out.kind = 'line'; }
  return out;
}

// Benin bronze: a cast board in the manner of the Benin court bronzes — warm bronze, darker where the casting is rough, a green
// patina in blotches and settled in the hollows, the ground ring-punched all over, and the braid running down the middle
// between the two rows of pits, polished bright on its strands where hands have rubbed it.
export function bronzeTextures(q = {}, g) {
  const W = q.woodW || 1024, H = q.woodH || 2048; const p = canvasPair(W, H);
  const n = noise2(W, H, 5), m = noise2(W, H, 4), f = noise2(W, H, 3);
  const PUNCH = 0.0052, PR = 0.0013; // the punched ring: spacing and radius (metres)
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px, o = i * 4; const x = (px / W - 0.5) * g.BW, z = ((1 - py / H) - 0.5) * g.BL;
    const t = n[i], hol = hollow(x, z, g);
    // the cast metal
    let r = 0x62 + (0xae - 0x62) * t, gg = 0x46 + (0x84 - 0x46) * t, b = 0x2a + (0x50 - 0x2a) * t;
    let bump = 0.5 + (f[i] - 0.5) * 0.25;
    const br = braidAt(x, z);
    if (br.kind === 'strand') { r += 34 * br.h; gg += 26 * br.h; b += 12 * br.h; }
    else if (br.kind !== 'ground') { r *= 0.62; gg *= 0.6; b *= 0.58; }
    bump += br.h * 0.38;
    // the ring-punched ground, on the flat top only (not in a bowl, not on the braid)
    if (br.kind === 'ground' && hol === 0) {
      const row = Math.round(z / PUNCH), cx = (row % 2 ? PUNCH / 2 : 0); const gx = Math.round((x - cx) / PUNCH) * PUNCH + cx;
      const d = Math.hypot(x - gx, z - row * PUNCH);
      if (Math.abs(d - PR) < 0.00045) { r *= 0.55; gg *= 0.55; b *= 0.55; bump -= 0.22; }
    }
    // the patina: blotches where the noise is high, more of it in the hollows, rubbed off the strands
    const pat = Math.min(0.85, (smooth(0.58, 0.86, m[i]) * 0.6 + hol * 0.3 + (br.kind === 'groove' || br.kind === 'line' ? 0.25 : 0)) * (br.kind === 'strand' ? 0.25 : 1));
    const pr = 0x4a + t * 30, pg = 0x7c + t * 30, pb = 0x64 + t * 22;
    r += (pr - r) * pat; gg += (pg - gg) * pat; b += (pb - b) * pat;
    p.img.data[o] = clamp255(r); p.img.data[o + 1] = clamp255(gg); p.img.data[o + 2] = clamp255(b); p.img.data[o + 3] = 255;
    const bv = clamp255(255 * bump); p.bimg.data[o] = p.bimg.data[o + 1] = p.bimg.data[o + 2] = bv; p.bimg.data[o + 3] = 255;
  }
  return finishPair(p, q);
}

// A warm room for the metal to reflect (a bronze board under only the lights would read black): an equirectangular picture of
// the lamp-lit room around the board — dark walls, the lamp a soft bright pool above, the cloth's warm brown below.
export function roomTexture() {
  const W = 256, H = 128; const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
  const v = ctx.createLinearGradient(0, 0, 0, H); v.addColorStop(0, '#5a4330'); v.addColorStop(0.45, '#2a1d13'); v.addColorStop(0.55, '#1c130c'); v.addColorStop(1, '#3a2617');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const lamp = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,226,180,${a})`); g.addColorStop(1, 'rgba(255,200,140,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  lamp(W * 0.37, H * 0.16, 40, 1); lamp(W * 0.85, H * 0.3, 30, 0.45); // the lamp overhead, and the window light behind
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Grandpa's board: an old board that has been played on for fifty years — the wood darkened by hands and palm oil, the grain
// standing up, scratched all over (mostly along the length, where seeds are swept), a few dark oil stains, and a crack across
// one end mended with two iron staples. The rims worn pale and the pits darkened are drawn by board.js on the carved top.
export function grandpaTextures(q = {}, g) {
  const W = q.woodW || 1024, H = q.woodH || 2048; const p = canvasPair(W, H);
  const n = noise2(W, H, 5), n2 = noise2(W, H, 3), m = noise2(W, H, 2);
  const pal = [[0x4c, 0x33, 0x20], [0x1f, 0x14, 0x0b], [0x72, 0x52, 0x34]]; // umber, not mahogany's red: oil and years have browned it
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px, o = i * 4;
    const gr = Math.sin((px / W) * 80 + n[i] * 9 + Math.sin(py / H * 7) * 2.4); const ring = (gr * 0.5 + 0.5) ** 1.3; const fine = n2[i] * 0.5 + 0.5;
    const pore = (Math.sin(py * 0.7 + n[i] * 46) * 0.5 + 0.5) ** 10 * 0.5; const tt = ring * 0.7 + fine * 0.3; const age = smooth(0.45, 0.85, m[i]) * 0.3; // darker where the oil soaked in
    const ch = (k) => (pal[1][k] + (pal[0][k] - pal[1][k]) * tt + (pal[2][k] - pal[0][k]) * (1 - ring) * 0.3) * (1 - age) - pore * 34;
    p.img.data[o] = clamp255(ch(0)); p.img.data[o + 1] = clamp255(ch(1)); p.img.data[o + 2] = clamp255(ch(2)); p.img.data[o + 3] = 255;
    const bv = 255 * (0.5 + 0.38 * (ring - 0.5) + 0.2 * (fine - 0.5) - pore * 0.8); // the soft grain worn away, the hard grain standing up
    p.bimg.data[o] = p.bimg.data[o + 1] = p.bimg.data[o + 2] = clamp255(bv); p.bimg.data[o + 3] = 255;
  }
  p.ctx.putImageData(p.img, 0, 0); p.bctx.putImageData(p.bimg, 0, 0);
  const X = (x) => (x / g.BW + 0.5) * W, Y = (z) => (1 - (z / g.BL + 0.5)) * H; // board metres → canvas pixels
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); // the same scratches on every phone
  // scratches: paler wood showing through, a hair lower than the wood around them
  for (let k = 0; k < 260; k++) {
    const x = (rnd() - 0.5) * g.BW, z = (rnd() - 0.5) * g.BL, along = rnd() < 0.7, a = along ? Math.PI / 2 + (rnd() - 0.5) * 0.5 : rnd() * Math.PI, L = 0.006 + rnd() * (along ? 0.05 : 0.02);
    const x2 = x + Math.cos(a) * L, z2 = z + Math.sin(a) * L, wgt = 0.6 + rnd() * 1.2;
    p.ctx.strokeStyle = `rgba(196,150,104,${0.12 + rnd() * 0.22})`; p.ctx.lineWidth = wgt; p.ctx.beginPath(); p.ctx.moveTo(X(x), Y(z)); p.ctx.lineTo(X(x2), Y(z2)); p.ctx.stroke();
    p.bctx.strokeStyle = 'rgba(40,40,40,0.35)'; p.bctx.lineWidth = wgt; p.bctx.beginPath(); p.bctx.moveTo(X(x), Y(z)); p.bctx.lineTo(X(x2), Y(z2)); p.bctx.stroke();
  }
  // a few dark stains where palm oil and fingers went
  for (let k = 0; k < 9; k++) {
    const x = (rnd() - 0.5) * g.BW * 0.9, z = (rnd() - 0.5) * g.BL * 0.9, r = 0.012 + rnd() * 0.03; const rg = p.ctx.createRadialGradient(X(x), Y(z), 0, X(x), Y(z), r / g.BW * W);
    rg.addColorStop(0, 'rgba(20,10,4,0.32)'); rg.addColorStop(1, 'rgba(20,10,4,0)'); p.ctx.fillStyle = rg; p.ctx.fillRect(0, 0, W, H);
  }
  // a split along the grain down the middle between the rows, mended with two iron staples
  const crack = []; { let x = 0.003, z = 0.16; while (z > -0.3) { crack.push([x, z]); z -= 0.003; x = Math.max(-0.012, Math.min(0.012, x + (rnd() - 0.5) * 0.0022)); } }
  const pxm = W / g.BW; // canvas pixels per metre across
  for (const [ctx, col, wdt] of [[p.ctx, 'rgba(10,5,2,0.92)', 0.0016 * pxm], [p.bctx, 'rgba(0,0,0,1)', 0.002 * pxm]]) {
    ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); crack.forEach(([x, z], k) => (k ? ctx.lineTo(X(x), Y(z)) : ctx.moveTo(X(x), Y(z)))); ctx.stroke();
  }
  for (const zc of [0.06, -0.17]) {
    const [cx] = crack.reduce((a, c) => (Math.abs(c[1] - zc) < Math.abs(a[1] - zc) ? c : a)); const hw = 0.009, hh = 0.0019;
    const halo = p.ctx.createRadialGradient(X(cx), Y(zc), 0, X(cx), Y(zc), 0.017 * pxm); halo.addColorStop(0, 'rgba(126,56,22,0.5)'); halo.addColorStop(1, 'rgba(126,56,22,0)');
    p.ctx.fillStyle = halo; p.ctx.fillRect(0, 0, W, H); // rust bled into the wood round the staple
    const x0 = X(cx - hw), y0 = Y(zc + hh), w0 = X(cx + hw) - x0, h0 = Y(zc - hh) - y0;
    p.ctx.fillStyle = '#34302d'; p.ctx.fillRect(x0, y0, w0, h0); p.ctx.fillStyle = 'rgba(200,190,180,0.32)'; p.ctx.fillRect(x0, y0, w0, h0 * 0.35);
    p.ctx.fillStyle = '#16120f'; for (const ex of [x0, x0 + w0 - 0.0025 * pxm]) p.ctx.fillRect(ex, y0, 0.0025 * pxm, h0); // the ends driven into the wood
    p.bctx.fillStyle = '#dcdcdc'; p.bctx.fillRect(x0, y0, w0, h0);
  }
  const map = new THREE.CanvasTexture(p.c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = q.anisotropy || 8;
  const bump = new THREE.CanvasTexture(p.b); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; return { map, bump };
}
