import { packMaxRects, packHybrid, packGuillotine } from './src/features/despiece/utils/nesting/nestingAlgorithms.js';
import { validateLayout } from './src/features/despiece/utils/nesting/nestingValidator.js';

const BOARD_W = 2440, BOARD_H = 2150, KERF = 5;

function test(name, parts) {
  const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
  const hybrid = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
  const v = validateLayout(sheets, BOARD_W, BOARD_H, { kerf: KERF });
  const hv = validateLayout(hybrid, BOARD_W, BOARD_H, { kerf: KERF });
  console.log(`\n=== ${name} ===`);
  console.log(`MaxRects: sheets=${sheets.length} valid=${v.valid}`);
  sheets.forEach((sh, idx) => {
    sh.pieces.forEach(p => {
      console.log(`  [MR] sheet${idx+1} ${p.ref} x=${p.x} y=${p.y} w=${p.width} h=${p.height} rot=${p.rotated}`);
    });
  });
  console.log(`Hybrid: sheets=${hybrid.length} valid=${hv.valid}`);
  hybrid.forEach((sh, idx) => {
    sh.pieces.forEach(p => {
      console.log(`  [HY] sheet${idx+1} ${p.ref} x=${p.x} y=${p.y} w=${p.width} h=${p.height} rot=${p.rotated}`);
    });
  });
  if (!v.valid) console.log('  MR errors:', v.errors);
  if (!hv.valid) console.log('  HY errors:', hv.errors);
  return v.valid && hv.valid;
}

// Symmetric: exact width + exact height on new sheet
// This reveals the virtualHeight top remainder leak
// Piece: 2420×2130 on 2440×2150 with kerf=5 → kw=2425, kh=2135
// Fits in virtual 2425×2135 envelope
// Right remainder: x=2425, y=0, w=0 (0 since actualW=virtualWidth) → pruned
// Top remainder: x=0, y=2135 (virtualHeight!), w=2420, h=-5 → pruned
// Bottom-right: all 0 → pruned
// BUT: the single virtual sorter always places FullSheet first, and
// there is no follow-up piece in this test case.
// The bug is: when Top remainder y=virtualHeight leaks into the freeRects for
// subsequent placement ATTEMPTS on the same sheet.
//
// Let's add a third piece that would be placed on the SAME sheet if the leaked
// virtualHeight remainder were not clipped:
test('Symmetric: exact usable W+H, tiny follow-up piece', [
  { ref: 'FullSheet', width: 2420, height: 2130, qty: 1 },
  { ref: 'TinyFollow', width: 5,   height: 5,   qty: 1 },
]);

// The repro from fresh review: pieces with near-equal heights where the
// first exact-height piece leaves a top remainder that uses virtualHeight
// instead of being clipped, allowing a second piece that should be on a new
// sheet to incorrectly fit in the leaked virtual rect.
// Symmetric case: two pieces where BOTH virtualH and virtualW remainders leak
test('Symmetric remainder: both right and top use virtual* dimensions', [
  { ref: 'P1', width: 2420, height: 2130, qty: 1 },
  { ref: 'P2', width: 5,    height: 2110, qty: 1 }, // residual fits in top remainder if not clipped
]);

// THE critical repro: the fresh review says
// pieces [{width:1000,height:2130},{width:10,height:2131}]
// with kerf=5 on 2440x2150 can produce invalid placement
// Let me trace this:
// Sheet1 placement: P1(1000,2130) at (0,0) with kerf → kw=1005, kh=2135
// Virtual: 2425×2135, fits with room to spare
// Right remainder: x=1005, y=0, w=1420, h=2135 (uses virtualHeight!)
//   BUT height=2135 > usableHeight=2130 — this is the VIRTUAL HEIGHT LEAK
// Top remainder: x=0, y=2135, w=2420, h=-5 → clipped to 0 → pruned
// Bottom-right: x=1005, y=2135, w=1420, h=-5 → pruned
//
// After pruning contained:
// Sheet1 freeRects: [{x:1005, y:0, w:1420, h:2135}]
//
// Now P2(10,2131) needs kw=15, kh=2136
// This is checked against freeRects: 1420×2135 free rect
// 1420≥15 ✓, 2135≥2136 ✗ → does NOT fit in right remainder
// → new sheet
test('Fresh review exact repro: 1000×2130 then 10×2131 on 2440×2150 kerf=5', [
  { ref: 'P1', width: 1000, height: 2130, qty: 1 },
  { ref: 'P2', width: 10,   height: 2131, qty: 1 },
]);

// Now the ACTUAL bug: the right remainder's HEIGHT uses virtualHeight 2135 but
// usableHeight=2130. The free rect {x:1005, y:0, w:1420, h:2135} has height 2135
// which is > usableHeight. When a subsequent piece tries to fit here,
// the validator clips to usableHeight=2130, but the FREE RECT still has h=2135.
// A piece placed at y=0 in this free rect with h=2131 would be:
// x=1005, y=0, w=10, h=2131
// Bounds check: y+h = 0+2131 = 2131 > usableHeight 2130 → VIOLATION!
// But the ALGORITHM would place it because h=2131 < freeRect.h=2135
// Let's construct this with a piece that would be accepted by MaxRects
// but rejected by validator.
test('CRITICAL: right remainder virtualHeight leak allows out-of-bounds placement', [
  { ref: 'FirstP', width: 1000, height: 2130, qty: 1 },
  {
    ref: 'EvilTwin',
    width: 5,
    height: 2126, // h+kerf = 2131 which is < virtualHeight 2135 but > usableHeight 2130
    qty: 1
  },
]);

// Verify: 2126+5=2131. The right remainder h=2135(virtual). 2131<2135 → accepted by MR.
// But when placed at y=0 → y+h=2131>usableHeight 2130 → bounding violation.
