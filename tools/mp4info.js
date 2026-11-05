// Read an MP4's own boxes (no ffprobe needed): the movie's length, and for each track its kind, enabled flag, size, codec and
// the codec's settings. Used by test/storepreview.test.js and test/storepreview-fr.test.js.
// Walk an MP4's boxes: the movie's length, and for each track its kind, enabled flag, size, codec and the codec's settings.
export function mp4Info(buf) {
  const info = { tracks: [], faststart: false };
  const kids = (s, e, f) => { let i = s; while (i + 8 <= e) { let size = buf.readUInt32BE(i); const type = buf.toString('latin1', i + 4, i + 8); let h = 8; if (size === 1) { size = Number(buf.readBigUInt64BE(i + 8)); h = 16; } else if (size === 0) size = e - i; f(type, i + h, i + size); i += size; } };
  let sawMdat = false;
  kids(0, buf.length, (type, s, e) => {
    if (type === 'mdat') sawMdat = true;
    if (type === 'moov') {
      info.faststart = !sawMdat;
      kids(s, e, (t, s2, e2) => {
        if (t === 'mvhd') { const v = buf[s2]; const scale = buf.readUInt32BE(s2 + (v ? 20 : 12)); const dur = v ? Number(buf.readBigUInt64BE(s2 + 24)) : buf.readUInt32BE(s2 + 16); info.seconds = dur / scale; }
        if (t !== 'trak') return;
        const tr = {}; info.tracks.push(tr);
        kids(s2, e2, (t3, s3, e3) => {
          if (t3 === 'tkhd') { tr.enabled = !!(buf.readUInt32BE(s3) & 1); tr.width = buf.readUInt32BE(e3 - 8) / 65536; tr.height = buf.readUInt32BE(e3 - 4) / 65536; }
          if (t3 !== 'mdia') return;
          kids(s3, e3, (t4, s4, e4) => {
            if (t4 === 'mdhd') { const v = buf[s4]; tr.scale = buf.readUInt32BE(s4 + (v ? 20 : 12)); tr.duration = v ? Number(buf.readBigUInt64BE(s4 + 24)) : buf.readUInt32BE(s4 + 16); }
            if (t4 === 'hdlr') tr.kind = buf.toString('latin1', s4 + 8, s4 + 12);
            if (t4 !== 'minf') return;
            kids(s4, e4, (t5, s5, e5) => { if (t5 !== 'stbl') return; kids(s5, e5, (t6, s6, e6) => {
              if (t6 === 'stts') { let n = 0; const c = buf.readUInt32BE(s6 + 4); for (let k = 0; k < c; k++) n += buf.readUInt32BE(s6 + 8 + k * 8); tr.samples = n; }
              if (t6 !== 'stsd') return;
              const es = s6 + 8; tr.codec = buf.toString('latin1', es + 4, es + 8);
              if (tr.codec === 'avc1') { // VisualSampleEntry is 78 bytes after the box header, then avcC
                tr.codedW = buf.readUInt16BE(es + 8 + 24); tr.codedH = buf.readUInt16BE(es + 8 + 26);
                kids(es + 8 + 78, es + buf.readUInt32BE(es), (t7, s7) => { if (t7 === 'avcC') { tr.profile = buf[s7 + 1]; tr.level = buf[s7 + 3]; } });
              }
              if (tr.codec === 'mp4a') { tr.channels = buf.readUInt16BE(es + 8 + 16); tr.rate = buf.readUInt32BE(es + 8 + 24) / 65536; }
            }); });
          });
        });
      });
    }
  });
  return info;
}
