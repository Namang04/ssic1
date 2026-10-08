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
ok('a backdrop is painted before the photo, so a transparent PNG does not save black', /cx\.fillStyle=[^;]+;cx\.fillRect\(0,0,ow,oh\)[\s\S]*cx\.drawImage/.test(frameImg));

// ── automatic framing, passport style ──
const auto = grab('__autoFrame'), box = grab('__autoFrameFromBox'), ready = grab('__faceReady'), face = grab('__faceIn');
const pp = src.match(/var __PP=\{EYEW:([\d.]+), EYEY:([\d.]+)\}/);
ok('the detector is fetched only when it is used', /document\.createElement\("script"\)/.test(ready) && !/face-api/.test(src.slice(0, src.indexOf('function __faceReady'))));
ok('the maths backend is up before the model loads',
  ready.indexOf('tf.setBackend') >= 0 && ready.indexOf('tf.ready()') > ready.indexOf('tf.setBackend') && ready.indexOf('loadFromUri') > ready.indexOf('tf.ready()'));
ok('a failed load can be retried',      /__faceReady\._p=null/.test(ready));
ok('landmarks load too, not just the box', /faceLandmark68TinyNet\.loadFromUri/.test(ready));
ok('and the eyes are read off them',    /withFaceLandmarks\(true\)/.test(face) && /getLeftEye\(\)/.test(face) && /getRightEye\(\)/.test(face));
ok('all four turns are tried',          /turns=\[0,90,270,180\]/.test(auto));
ok('a clear UPRIGHT face stops the turning early', /best&&best\.ok&&best\.score>=0\.75/.test(auto));
ok('nothing is guessed without an upright face', /if\(!best\|\|!best\.ok\)return null/.test(auto));
// A detector fires on an inverted face too, so confidence alone chose the wrong way up on real photos.
ok('the mouth must sit below the eyes',  /f\.my>eyeY\+0\.08\*f\.h/.test(auto));
ok('and the eye line must be roughly level', /Math\.abs\(roll\)<=35/.test(auto));
ok('the mouth is read off the landmarks', /getMouth\(\)/.test(face));
ok('an upright reading beats a surer crooked one', /cand\.ok&&!best\.ok/.test(auto));
ok('rotations are compared by score, not box area', /cand\.ok===best\.ok&&cand\.score>best\.score/.test(auto));
ok('a re-run repairs an earlier bad crop', /doc&&doc\.orig&&doc\.autoFramedAt\)\{try\{await window\.__fbUpdateDoc/.test(src));

// The three things that make every photo come out the same.
ok('the composition is one shared setting', !!pp);
ok('the head sits at passport proportions', Number(pp[1]) > 0.2 && Number(pp[1]) < 0.34 && Number(pp[2]) > 0.33 && Number(pp[2]) < 0.5);
ok('scale comes from the eye-to-eye width, so every face is the same size', /sc=\(__PP\.EYEW\*vw\)\/D/.test(auto));
ok('the eye line lands at the same height every time', /oy:\(__PP\.EYEY\*vh\)-\(vh\/2\)-sc\*vy/.test(auto) && /ox:-sc\*vx/.test(auto));
ok('a tilted head is straightened',     /roll=Math\.atan2\(dy,dx\)/.test(auto) && /rot:best\.rot-roll/.test(auto));
ok('the tilt used is the one already checked', /var roll=best\.roll;/.test(auto));
ok('eyes too close together are not trusted', /if\(!\(D>2\)\)return __autoFrameFromBox/.test(auto));
ok('the fallback still uses one fixed head size', /sc=\(0\.42\*vh\)\/Math\.max\(1,best\.fh\)/.test(box));

// A passport crop has to be free to pull back from a close-up, so it sets an ABSOLUTE scale, and whatever it
// reaches past the edge of the photo is filled with the colour around that photo's border, not white.
ok('it passes an absolute scale',       /scale:sc/.test(auto) && /f\.scale!=null\)\?f\.scale:/.test(frameImg));
ok('the manual framer still uses cover+zoom', /Math\.max\(vw\/ew,vh\/eh\)\*\(f\.zoom\|\|1\)/.test(frameImg));
ok('the fill blends with the photo',    /bg:"auto"/.test(auto) && /f\.bg==="auto"\?__edgeColor\(im\)/.test(frameImg));

// A second run must re-crop the ORIGINAL, never a crop of a crop, and must be undoable.
ok('the untouched picture is kept',     /orig:base/.test(src));
ok('and is what a re-run crops from',   /\(doc&&\(doc\.orig\|\|doc\.img\)\)/.test(src));
ok('undo puts the original back',       /img:doc\.orig,autoFramedAt:null/.test(src));
console.log(`\n  ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
