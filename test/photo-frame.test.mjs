// The photo framer (2026-10-08). Teachers photograph pupils sideways and from across a room, and the report
// card then crops to a shoulder. The office can now re-frame a photo, and the ONE thing that must hold is that
// the preview box and the saved JPEG have the same shape and the same scale rule — otherwise what the office
// lines up is not what prints. These read the real numbers out of index.html.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
// A component's parameter list is itself a {destructure}, so count braces from the BODY's opening brace.
const grab = (name) => { const i = src.search(new RegExp('^function ' + name + '\\(', 'm')); if (i < 0) { console.error('  missing ' + name); process.exit(2); }
  const body = src.indexOf('{', src.indexOf(')', src.indexOf('(', i)) );
  let d = 0, j = body; for (;; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { if (--d === 0) break; } } return src.slice(i, j + 1); };
const framer = grab('PhotoFramer'), frameImg = grab('__frameImg');
let pass = 0, fail = 0; const ok = (n, c) => { c ? pass++ : (fail++, console.log('  FAIL:', n)); };

const vp = framer.match(/const VW=(\d+),VH=(\d+)/);
ok('the preview box has fixed dimensions', !!vp);
const save = framer.match(/__frameImg\(src,\{[^}]*\},VW,VH,(\d+),(\d+),([\d.]+)\)/);
ok('it saves through __frameImg at a fixed size', !!save);
const [VW, VH] = [Number(vp[1]), Number(vp[2])], [OW, OH] = [Number(save[1]), Number(save[2])];
// B = k·A: the canvas repeats the preview's mapping scaled by k=OW/VW, so the shapes must match exactly.
ok('preview and saved photo are the same shape', Math.abs(VW / VH - OW / OH) < 1e-9);
ok('the saved photo is a 3:4 portrait',          Math.abs(OW / OH - 0.75) < 1e-9);
ok('and big enough for a printed card',          OW >= 200 && OH >= 260);
ok('the quality keeps the file small',           Number(save[3]) > 0.6 && Number(save[3]) < 0.9);

// Both sides must scale to COVER the box — any other rule leaves a white edge on one of them.
ok('the canvas scales to cover',  /Math\.max\(vw\/ew,vh\/eh\)\*\(f\.zoom\|\|1\)/.test(frameImg));
ok('the preview scales to cover', /Math\.max\(VW\/ew,VH\/eh\)\*zoom/.test(framer));
ok('the canvas scales by k=ow/vw', /k=ow\/vw/.test(frameImg));
ok('rotation is about the centre',  /cx\.translate\(ow\/2\+\(f\.ox\|\|0\)\*k, oh\/2\+\(f\.oy\|\|0\)\*k\)/.test(frameImg) && /cx\.rotate\(/.test(frameImg));
ok('the picture is drawn centred',  /cx\.drawImage\(im,-w\/2,-h\/2,w,h\)/.test(frameImg));
// A rotated photo swaps its effective sides, or a sideways picture would not fill the box.
ok('canvas swaps sides at 90/270',  /\(r===90\|\|r===270\)\?h:w/.test(frameImg));
ok('preview swaps sides at 90/270', /\(r===90\|\|r===270\)\?nat\.h:nat\.w/.test(framer));
// Dragging stops at the edge of the picture, so no white gap can be saved.
ok('the drag is clamped',           /__frameClamp/.test(framer) && /clamp\(/.test(framer));
ok('a white backdrop is painted first, so a transparent PNG does not save black', /fillStyle="#fff";cx\.fillRect\(0,0,ow,oh\)/.test(frameImg));
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
