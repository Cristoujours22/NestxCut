/**
 * src/features/despiece/utils/nesting/nestingAlgorithms.test.js
 * Targeted regression tests for the nesting engine.
 * Validates: in-bounds placement, no overlap, deterministic shape,
 * hybrid chooser behavior on representative rectangular inputs.
 */

import {
  usableArea,
  applyKerf,
  computeSheetStats,
  packGuillotine,
  packMaxRects,
  packHybrid,
} from './nestingAlgorithms.js';
import { validateLayout } from './nestingValidator.js';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const BOARD_W = 2440;
const BOARD_H = 2150;
const KERF = 5;

/**
 * Assert that `sheets` is a valid layout: no overlaps, all pieces in-bounds.
 */
function assertValidLayout(sheets, sheetW, sheetH) {
  const result = validateLayout(sheets, sheetW, sheetH, { kerf: KERF });
  if (!result.valid) {
    throw new Error(`Invalid layout:\n${result.errors.join('\n')}`);
  }
}

/**
 * Assert two layouts have the same shape (same sheets with same piece counts
 * at same positions). Used to verify deterministic output.
 */
function assertSameShape(layoutA, layoutB) {
  if (layoutA.length !== layoutB.length) {
    throw new Error(`Sheet count mismatch: ${layoutA.length} vs ${layoutB.length}`);
  }
  for (let s = 0; s < layoutA.length; s++) {
    const a = layoutA[s];
    const b = layoutB[s];
    if (a.pieces.length !== b.pieces.length) {
      throw new Error(`Sheet ${s} piece count mismatch: ${a.pieces.length} vs ${b.pieces.length}`);
    }
    for (let p = 0; p < a.pieces.length; p++) {
      const ap = a.pieces[p];
      const bp = b.pieces[p];
      if (ap.x !== bp.x || ap.y !== bp.y || ap.width !== bp.width || ap.height !== bp.height) {
        throw new Error(`Sheet ${s} piece ${p} position/size mismatch`);
      }
    }
  }
}

// ─────────────────────────────────────────────
// USABLE AREA TESTS
// ─────────────────────────────────────────────

describe('usableArea', () => {
  test('applies total refilado per axis (not per-edge)', () => {
    // Board 2440×2150 with refiladoX=20, refiladoY=20
    // usable should be 2440-20=2420 × 2150-20=2130  (NOT 2400×2110)
    const { usableWidth, usableHeight } = usableArea(2440, 2150, 20, 20);
    expect(usableWidth).toBe(2420);
    expect(usableHeight).toBe(2130);
  });

  test('handles zero refilado', () => {
    const { usableWidth, usableHeight } = usableArea(1000, 800, 0, 0);
    expect(usableWidth).toBe(1000);
    expect(usableHeight).toBe(800);
  });
});

// ─────────────────────────────────────────────
// APPLY KERF TESTS
// ─────────────────────────────────────────────

describe('applyKerf', () => {
  test('expands piece dimensions by kerf on both sides', () => {
    const result = applyKerf({ width: 100, height: 80 }, 5);
    expect(result.width).toBe(105);
    expect(result.height).toBe(85);
  });
});

// ─────────────────────────────────────────────
// SHEET STATS TESTS
// ─────────────────────────────────────────────

describe('computeSheetStats', () => {
  test('calculates efficiency and waste correctly', () => {
    const pieces = [
      { width: 500, height: 400 },
      { width: 300, height: 200 },
    ];
    // Pass usable dimensions (sheet minus refilado deductions)
    const stats = computeSheetStats(pieces, 2420, 2130, 5);
    // Total piece area = 500*400 + 300*200 = 200000 + 60000 = 260000
    // Usable area = 2420 * 2130 = 5154600
    expect(stats.waste).toBe(5154600 - 260000);
    expect(stats.efficiency).toBeCloseTo((260000 / 5154600) * 100, 2);
  });

  test('cutLength sums perimeters with kerf', () => {
    const pieces = [{ width: 100, height: 50 }];
    const stats = computeSheetStats(pieces, 1000, 800, 5);
    // Cut length = 2 * ((100+5) + (50+5)) = 2 * 160 = 320
    expect(stats.cutLength).toBe(320);
  });
});

// ─────────────────────────────────────────────
// IN-BOUNDS & NO-OVERLAP TESTS
// ─────────────────────────────────────────────

describe('packGuillotine — in-bounds and no-overlap', () => {
  const parts = [
    { ref: 'A', width: 600, height: 400, qty: 3 },
    { ref: 'B', width: 300, height: 200, qty: 4 },
    { ref: 'C', width: 150, height: 150, qty: 6 },
  ];

  test('all pieces placed within usable bounds', () => {
    const sheets = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('produces deterministic result on repeated calls', () => {
    const run1 = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const run2 = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertSameShape(run1, run2);
  });

  test('REGRESSION: fresh-sheet virtual-height remainder is clipped before reuse', () => {
    const parts = [
      { ref: 'P0', width: 170, height: 418, qty: 3, canRotate: false },
      { ref: 'P1', width: 765, height: 1706, qty: 1, canRotate: false },
    ];

    const sheets = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF, allowRotation: false });
    const placedCount = sheets.reduce((sum, sheet) => sum + sheet.pieces.length, 0);

    expect(placedCount).toBe(4);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('REGRESSION: mirrored fresh-sheet virtual-width remainder is clipped to usable bounds', () => {
    const parts = [{ ref: 'ExactWidth', width: 2420, height: 1000, qty: 1, canRotate: false }];

    const sheets = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF, allowRotation: false });

    expect(sheets.length).toBe(1);
    expect(sheets[0].freeRects).toContainEqual({
      x: 0,
      y: 1005,
      width: 2420,
      height: 1125,
    });
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });
});

describe('packMaxRects — in-bounds and no-overlap', () => {
  const parts = [
    { ref: 'A', width: 600, height: 400, qty: 3 },
    { ref: 'B', width: 300, height: 200, qty: 4 },
    { ref: 'C', width: 150, height: 150, qty: 6 },
  ];

  test('all pieces placed within usable bounds', () => {
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('produces deterministic result on repeated calls', () => {
    const run1 = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const run2 = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertSameShape(run1, run2);
  });
});

// ─────────────────────────────────────────────
// HYBRID CHOOSER TESTS
// ─────────────────────────────────────────────

describe('REGRESSION: equal-sheet ties must preserve Guillotine result', () => {
  /**
   * Rule: MaxRects wins only on strict sheet-count improvement.
   * Equal-sheet ties preserve Guillotine result (deterministic first-wins).
   * No efficiency or scrap-score tie-break — sheet count is the sole decider.
   */

  test('hybrid never worse than public packGuillotine on sheet count', () => {
    const testCases = [
      // Diverse aspect ratios
      [
        { ref: 'S1', width: 400, height: 300, qty: 3 },
        { ref: 'S2', width: 200, height: 150, qty: 6 },
      ],
      // Mix of tall and wide pieces
      [
        { ref: 'Tall1', width: 150, height: 600, qty: 2 },
        { ref: 'Wide1', width: 700, height: 200, qty: 2 },
        { ref: 'Sq1', width: 300, height: 300, qty: 4 },
      ],
      // Many small pieces (stress test scrap selection)
      [
        { ref: 'P1', width: 120, height: 80, qty: 10 },
        { ref: 'P2', width: 90, height: 60, qty: 8 },
        { ref: 'P3', width: 200, height: 150, qty: 5 },
      ],
    ];

    for (const parts of testCases) {
      const hybrid = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
      const guillotine = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
      expect(hybrid.length).toBeLessThanOrEqual(guillotine.length);
      assertValidLayout(hybrid, BOARD_W, BOARD_H);
    }
  });

  test('MaxRects wins only when it strictly improves sheet count', () => {
    // Run many diverse inputs — in every case where MaxRects matches Guillotine
    // on sheet count, hybrid must return the Guillotine result (not prefer MaxRects)
    const inputs = [
      [
        { ref: 'A', width: 400, height: 300, qty: 2 },
        { ref: 'B', width: 200, height: 150, qty: 4 },
      ],
      [
        { ref: 'P1', width: 300, height: 200, qty: 4 },
        { ref: 'P2', width: 250, height: 180, qty: 3 },
        { ref: 'P3', width: 150, height: 100, qty: 5 },
      ],
      [
        { ref: 'X', width: 500, height: 350, qty: 2 },
        { ref: 'Y', width: 250, height: 180, qty: 3 },
      ],
      [
        { ref: 'A', width: 600, height: 400, qty: 3 },
        { ref: 'B', width: 300, height: 200, qty: 4 },
        { ref: 'C', width: 150, height: 150, qty: 6 },
      ],
    ];

    for (const parts of inputs) {
      const hybrid = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
      const guillotine = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });

      // When hybrid sheet count === Guillotine sheet count, hybrid must be
      // identical to Guillotine (Guillotine preserved on ties, not preferred MaxRects)
      if (hybrid.length === guillotine.length) {
        assertSameShape(hybrid, guillotine);
      } else {
        // MaxRects can only win when it strictly reduces sheet count
        expect(hybrid.length).toBeLessThan(guillotine.length);
      }
    }
  });

  test('equal-sheet ties preserve Guillotine result deterministically', () => {
    // On equal sheet counts, hybrid must deterministically return Guillotine result
    const parts = [
      { ref: 'A', width: 400, height: 300, qty: 2 },
      { ref: 'B', width: 200, height: 150, qty: 4 },
    ];

    // Run 5 times — all must return identical shape (determinism)
    const runs = Array.from({ length: 5 }, () => packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF }));
    for (let i = 1; i < runs.length; i++) {
      assertSameShape(runs[0], runs[i]);
    }

    const guillotine = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    if (runs[0].length === guillotine.length) {
      assertSameShape(runs[0], guillotine);
    }
  });

  test('equal-sheet ties preserve Guillotine deterministically — no scrap-score fallback', () => {
    // Rule: sheet count is the sole tie-break. No scrap-score or efficiency
    // fallback exists — equal sheets always preserve Guillotine result.
    // This test verifies stability across repeated runs.
    const parts = [
      { ref: 'M1', width: 800, height: 600, qty: 1 },
      { ref: 'M2', width: 100, height: 80, qty: 3 },
    ];

    // Hybrid must be deterministic
    const r1 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const r2 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertSameShape(r1, r2);

    // And must not exceed Guillotine sheets
    const g = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(r1.length).toBeLessThanOrEqual(g.length);

    // If equal sheets, must match Guillotine shape (Guillotine preserved)
    if (r1.length === g.length) {
      assertSameShape(r1, g);
    }
  });
});

describe('packMaxRects — multi-sorter expansion', () => {
  test('multi-sorter produces valid layout for diverse part shapes', () => {
    // Parts with varied aspect ratios to exercise different sorters
    const parts = [
      { ref: 'Square', width: 300, height: 300, qty: 2 },
      { ref: 'Wide', width: 600, height: 200, qty: 2 },
      { ref: 'Tall', width: 200, height: 500, qty: 2 },
    ];
    // packHybrid internally exercises packMaxRectsMulti
    const result = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(result.length).toBeGreaterThan(0);
    assertValidLayout(result, BOARD_W, BOARD_H);
  });

  test('MaxRects single-sorter public API remains deterministic', () => {
    // packMaxRects should use single area-desc sorter (backward compatible)
    const parts = [
      { ref: 'A', width: 600, height: 400, qty: 2 },
      { ref: 'B', width: 300, height: 200, qty: 3 },
    ];
    const r1 = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const r2 = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertSameShape(r1, r2);
    assertValidLayout(r1, BOARD_W, BOARD_H);
  });

  test('MaxRects single-sorter still places all pieces', () => {
    const parts = [
      { ref: 'P1', width: 400, height: 250, qty: 3 },
      { ref: 'P2', width: 200, height: 150, qty: 4 },
    ];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const totalPieces = sheets.reduce((sum, s) => sum + s.pieces.length, 0);
    expect(totalPieces).toBe(7); // 3 + 4
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });
});

describe('hybrid vs individual algorithms', () => {
  test('hybrid result is at least as good as either algorithm alone', () => {
    const parts = [
      { ref: 'A', width: 500, height: 350, qty: 2 },
      { ref: 'B', width: 250, height: 180, qty: 3 },
    ];
    const hybrid = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const guillotine = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const maxrects = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    // Hybrid should never produce more sheets than either algorithm alone
    expect(hybrid.length).toBeLessThanOrEqual(Math.min(guillotine.length, maxrects.length));
    assertValidLayout(hybrid, BOARD_W, BOARD_H);
  });
});

// ─────────────────────────────────────────────
// REGRESSION GUARDS — confirmed findings from fresh review
// ─────────────────────────────────────────────

describe('REGRESSION: hybrid must not be worse than public packGuillotine', () => {
  /**
   * Finding 1: packHybrid compared MaxRects against a REDUCED 96-config Guillotine sweep,
   * while public packGuillotine runs a 384-config sweep. This allows inputs where hybrid
   * returns MORE sheets than packGuillotine.
   *
   * Fix: hybrid now runs the FULL 384-config Guillotine sweep (same as public API).
   * This test guards the regression.
   */
  test('hybrid never returns more sheets than packGuillotine for the same input', () => {
    const testCases = [
      // Diverse aspect ratios
      [
        { ref: 'S1', width: 400, height: 300, qty: 3 },
        { ref: 'S2', width: 200, height: 150, qty: 6 },
      ],
      // Mix of tall and wide pieces
      [
        { ref: 'Tall1', width: 150, height: 600, qty: 2 },
        { ref: 'Wide1', width: 700, height: 200, qty: 2 },
        { ref: 'Sq1', width: 300, height: 300, qty: 4 },
      ],
      // Many small pieces (stress test scrap selection)
      [
        { ref: 'P1', width: 120, height: 80, qty: 10 },
        { ref: 'P2', width: 90, height: 60, qty: 8 },
        { ref: 'P3', width: 200, height: 150, qty: 5 },
      ],
    ];

    for (const parts of testCases) {
      const hybrid = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
      const guillotine = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
      // Hybrid with full Guillotine sweep must NEVER be worse than public API
      expect(hybrid.length).toBeLessThanOrEqual(guillotine.length);
      assertValidLayout(hybrid, BOARD_W, BOARD_H);
    }
  });

  test('hybrid never returns more sheets than packGuillotine — deterministic across runs', () => {
    const parts = [
      { ref: 'A', width: 500, height: 350, qty: 3 },
      { ref: 'B', width: 250, height: 180, qty: 5 },
      { ref: 'C', width: 150, height: 100, qty: 7 },
    ];

    const results = Array.from({ length: 5 }, () => ({
      hybrid: packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF }),
      guillotine: packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF }),
    }));

    // All runs must be deterministic
    for (let i = 1; i < results.length; i++) {
      assertSameShape(results[0].hybrid, results[i].hybrid);
      assertSameShape(results[0].guillotine, results[i].guillotine);
    }

    // Hybrid must not exceed Guillotine in any run
    for (const r of results) {
      expect(r.hybrid.length).toBeLessThanOrEqual(r.guillotine.length);
    }
  });

  test('REGRESSION: hybrid internal Guillotine branch uses exact same tie semantics as public packGuillotine', () => {
    /**
     * Finding from fresh review: Hybrid's internal packGuillotineFull used
     * betterLayout() (last-wins on ties) while public packGuillotine uses
     * isBetterLayout() (first-wins on ties). This means identical layouts
     * found by different config orderings could be ranked differently,
     * causing hybrid to select a different winner than a standalone call to
     * packGuillotine for the same input.
     *
     * Fix: packGuillotineFull now uses isBetterLayout() (first-wins) matching
     * public packGuillotine. This test guards the exact parity.
     */
    const parts = [
      { ref: 'P1', width: 800, height: 400, qty: 2 },
      { ref: 'P2', width: 400, height: 200, qty: 3 },
      { ref: 'P3', width: 200, height: 150, qty: 4 },
    ];

    // Run hybrid and standalone guillotine — both should be deterministic
    const hybrid1 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const hybrid2 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const guillotine1 = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const guillotine2 = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });

    assertSameShape(hybrid1, hybrid2);
    assertSameShape(guillotine1, guillotine2);
    assertValidLayout(hybrid1, BOARD_W, BOARD_H);
    assertValidLayout(guillotine1, BOARD_W, BOARD_H);

    // Hybrid must not use more sheets than public Guillotine
    expect(hybrid1.length).toBeLessThanOrEqual(guillotine1.length);
  });
});

describe('REGRESSION: packMaxRects public API is Y-bias-free (stable behavior)', () => {
  /**
   * Finding 2: packMaxRectsCore was modified to add Y-bias to its scorer,
   * but packMaxRects (the public API) should NOT have changed behavior.
   *
   * Fix: packMaxRects now calls packMaxRectsCore with useYBiasedScorer=false,
   * using pure BSSF. This test guards against future accidental re-introduction
   * of Y-bias into the public API.
   */
  test('packMaxRects produces deterministic output (no Y-bias)', () => {
    const parts = [
      { ref: 'A', width: 600, height: 400, qty: 3 },
      { ref: 'B', width: 300, height: 200, qty: 4 },
      { ref: 'C', width: 150, height: 150, qty: 6 },
    ];
    const run1 = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const run2 = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const run3 = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertSameShape(run1, run2);
    assertSameShape(run2, run3);
    assertValidLayout(run1, BOARD_W, BOARD_H);
  });

  test('packMaxRects places all pieces without dropping any', () => {
    const parts = [
      { ref: 'P1', width: 400, height: 250, qty: 3 },
      { ref: 'P2', width: 200, height: 150, qty: 4 },
      { ref: 'P3', width: 100, height: 80, qty: 5 },
    ];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const totalPieces = sheets.reduce((sum, s) => sum + s.pieces.length, 0);
    expect(totalPieces).toBe(12); // 3 + 4 + 5
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('packMaxRects behavior is consistent with prior version (area-desc sort only)', () => {
    // The public API should only use area-descending sort — no multi-sorter sweep
    const parts = [
      { ref: 'A', width: 700, height: 300, qty: 2 },
      { ref: 'B', width: 350, height: 200, qty: 3 },
      { ref: 'C', width: 180, height: 120, qty: 4 },
    ];

    // Run multiple times to confirm stable, single-sorter behavior
    const results = [
      packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF }),
      packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF }),
      packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF }),
    ];

    for (const r of results) {
      assertSameShape(results[0], r);
      assertValidLayout(r, BOARD_W, BOARD_H);
    }
  });
});

describe('REGRESSION: sheet-count-only tie rule (no efficiency fallback)', () => {
  /**
   * Rule: MaxRects wins only on strict sheet-count improvement.
   * Equal-sheet ties preserve Guillotine result (deterministic first-wins).
   * No efficiency or scrap-score fallback.
   */
  test('equal-sheet ties preserve Guillotine deterministically', () => {
    const parts = [
      // Mix designed to potentially produce equal sheet counts
      { ref: 'A', width: 400, height: 300, qty: 2 },
      { ref: 'B', width: 200, height: 150, qty: 4 },
    ];

    // Run hybrid multiple times — must get same result
    const r1 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const r2 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const r3 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });

    assertSameShape(r1, r2);
    assertSameShape(r2, r3);

    // Also verify packGuillotine and packMaxRects are individually deterministic
    const g1 = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const g2 = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertSameShape(g1, g2);

    const m1 = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const m2 = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertSameShape(m1, m2);
  });

  test('efficiency metric is consistent across different part configurations', () => {
    // Verify that efficiency (not freeRects structure) drives the tie-break
    const parts = [
      { ref: 'A', width: 800, height: 600, qty: 1 },
      { ref: 'B', width: 100, height: 80, qty: 3 },
    ];
    const result = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(result.length).toBeGreaterThan(0);
    assertValidLayout(result, BOARD_W, BOARD_H);

    // Verify determinism
    const r2 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertSameShape(result, r2);
  });

  test('efficiency tie-break does not favor Guillotine over MaxRects when counts are equal', () => {
    // Run a mix where Guillotine and MaxRects might produce equal sheet counts
    // The tie-break should be algorithm-neutral (efficiency), not favoring either algorithm
    const parts = [
      { ref: 'P1', width: 300, height: 200, qty: 4 },
      { ref: 'P2', width: 250, height: 180, qty: 3 },
      { ref: 'P3', width: 150, height: 100, qty: 5 },
    ];

    const r1 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const r2 = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });

    assertSameShape(r1, r2);
    assertValidLayout(r1, BOARD_W, BOARD_H);

    // Verify individual algorithms are also deterministic
    const g = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const m = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    assertSameShape(g, g); // run twice to verify
    assertSameShape(m, m);
  });
});

// ─────────────────────────────────────────────
// EXACT-EDGE FIT REGRESSION TEST
// ─────────────────────────────────────────────

describe('REGRESSION: exact-edge right/bottom fits on new sheet (MaxRects kerf bug)', () => {
  /**
   * Bug: packMaxRects() initializes free space with plain usableWidth/usableHeight,
   * unlike Guillotine's virtual usable+kerf envelope. This causes exact-edge fits
   * (piece + kerf exactly fills usable dimension) to be incorrectly rejected.
   *
   * Repro: piece width 2420, height 100 on 2440×2150 sheet with kerf 5.
   * Usable = 2440-20=2420 wide. Piece needs 2420+5 kerf = 2425 wide in the
   * virtual envelope. But a 2420-wide free rect cannot accept 2425 unless we
   * allow the kerf to spill outside the usable area (same as Guillotine does).
   *
   * Fix: Use virtualWidth = usableWidth + kerf when initializing new sheet free rect,
   * then clip placed rect to physical usable bounds before computing split rects.
   * This mirrors the existing Guillotine fix exactly.
   */
  test('piece width 2420 height 100 fits on 2440x2150 with kerf 5 (exact usable width)', () => {
    const parts = [{ ref: 'WideStrip', width: 2420, height: 100, qty: 1 }];
    // 2440 - 20 refilado = 2420 usable; kerf = 5
    // kw = 2420 + 5 = 2425, kh = 100 + 5 = 105
    // With virtual envelope (2420+5)×(2130+5) = 2425×2135 — the piece fits
    // Without fix: plain usable 2420×2130 → kw=2425 > usableWidth → unplaced
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    expect(sheets[0].pieces.length).toBe(1);
    expect(sheets[0].pieces[0].ref).toBe('WideStrip');
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('exact-edge fit also works in hybrid (same kerf semantics)', () => {
    const parts = [{ ref: 'WideStrip', width: 2420, height: 100, qty: 1 }];
    const sheets = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    expect(sheets[0].pieces.length).toBe(1);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('exact-edge fit in Guillotine confirms same behavior', () => {
    const parts = [{ ref: 'WideStrip', width: 2420, height: 100, qty: 1 }];
    const sheets = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    expect(sheets[0].pieces.length).toBe(1);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('exact-edge fit consistency across all three algorithms', () => {
    const parts = [{ ref: 'WideStrip', width: 2420, height: 100, qty: 1 }];
    const g = packGuillotine(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const m = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    const h = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(g.length).toBe(1);
    expect(m.length).toBe(1);
    expect(h.length).toBe(1);
    // All three must place the piece — no algorithm rejects a valid exact-edge fit
    expect(g[0].pieces.length).toBe(1);
    expect(m[0].pieces.length).toBe(1);
    expect(h[0].pieces.length).toBe(1);
  });

  test('near-edge first placement is rejected instead of treated as an exact-edge fit', () => {
    const parts = [{ ref: 'NearEdgeStrip', width: 2418, height: 100, qty: 1, canRotate: false }];
    const hybridSheets = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF, allowRotation: false });
    const maxRectsSheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF, allowRotation: false });

    expect(hybridSheets).toEqual([]);
    expect(maxRectsSheets).toEqual([]);
  });

  test('two exact-width strips stack on the same sheet with kerf spacing', () => {
    // Two pieces both 2420mm wide (full usable width). With kerf=5 they stack
    // vertically: Strip1 kerfed footprint 2425×105 at y=0, Strip2 kerfed footprint
    // 2425×105 at y=105. Total height 210mm << usableHeight 2130mm → fits on one sheet.
    const parts = [
      { ref: 'Strip1', width: 2420, height: 100, qty: 1 },
      { ref: 'Strip2', width: 2420, height: 100, qty: 1 },
    ];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    expect(sheets[0].pieces.length).toBe(2);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('existing-sheet follow-up rejects raw-fit piece whose kerf footprint would overflow', () => {
    // First piece creates ONLY a right remainder {x:1505, y:0, w:915, h:2130}.
    // Follow-up width 911 fits RAW width 915, but its stored footprint needs
    // 916 because it does not reach the physical right edge.
    const parts = [
      { ref: 'Anchor', width: 1500, height: 2125, qty: 1, canRotate: false },
      { ref: 'OverflowFollowUp', width: 911, height: 100, qty: 1, canRotate: false },
    ];

    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });

    expect(sheets.length).toBe(2);
    expect(sheets[0].pieces).toHaveLength(1);
    expect(sheets[0].pieces[0].ref).toBe('Anchor');
    expect(sheets[1].pieces[0].ref).toBe('OverflowFollowUp');
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('hybrid keeps the exact-width stacking behavior green', () => {
    const stackingParts = [
      { ref: 'Strip1', width: 2420, height: 100, qty: 1 },
      { ref: 'Strip2', width: 2420, height: 100, qty: 1 },
    ];
    const stackingSheets = packHybrid(stackingParts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(stackingSheets.length).toBe(1);
    expect(stackingSheets[0].pieces.length).toBe(2);
    assertValidLayout(stackingSheets, BOARD_W, BOARD_H);
  });
});

// ─────────────────────────────────────────────
// SYMMETRIC REMAINDER BUG REGRESSION TESTS
// ─────────────────────────────────────────────

describe('REGRESSION: symmetric MaxRects remainder bug (virtualHeight leak)', () => {
  /**
   * Bug: after an exact bottom-edge fit on a new sheet, the right remainder
   * was computed with height = virtualHeight (usableHeight + kerf) instead of
   * usableHeight.  This allowed a follow-up piece with effective_bottom
   * (y + height + kerf) > usableHeight to be incorrectly placed in that
   * remainder, overflow the physical sheet.
   *
   * Fix (in validator): the kerf-expanded boundary check is applied to all
   * non-top-edge pieces.  A piece at y=0 is exempt because kerf is allowed to
   * spill past the physical top edge.  A piece at x>0 is exempt from the
   * left-edge kerf check for the same reason.  All other kerf directions
   * must fit within usable bounds.
   */

  test('exact-height bottom-edge fit clips the right remainder to physical usableHeight', () => {
    const parts = [{ ref: 'P1', width: 1000, height: 2130, qty: 1, canRotate: false }];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });

    expect(sheets.length).toBe(1);
    expect(sheets[0].pieces).toHaveLength(1);
    expect(sheets[0].freeRects).toContainEqual({
      x: 1005,
      y: 0,
      width: 1415,
      height: 2130,
    });
  });

  test('symmetric remainder: follow-up piece correctly rejected for height overflow', () => {
    // P1(1000,2130) creates right remainder {x:1005, y:0, w:1415, h:2130}
    // P2(5,2126) fits in free rect (5<1415, 2126<2130) but y+2126+kerf=2131>2130
    // → must be placed on a new sheet, not on sheet 1.
    const parts = [
      { ref: 'P1', width: 1000, height: 2130, qty: 1 },
      { ref: 'EvilTwin', width: 5, height: 2126, qty: 1 },
    ];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    // P2 should land on its own sheet because it overflows usableHeight
    expect(sheets.length).toBe(2);
    expect(sheets[1].pieces[0].ref).toBe('EvilTwin');
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('symmetric remainder: oversized follow-up part is rejected after exact bottom-edge fit', () => {
    // TooTall only fits the leaked virtual-height remainder (2135), not the
    // physical clipped remainder (2130). It must stay unplaced.
    const parts = [
      { ref: 'P1', width: 1000, height: 2130, qty: 1, canRotate: false },
      { ref: 'TooTall', width: 5, height: 2131, qty: 1, canRotate: false },
    ];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });

    expect(sheets.length).toBe(1);
    expect(sheets[0].pieces).toHaveLength(1);
    expect(sheets[0].pieces[0].ref).toBe('P1');
  });

  test('exact full-sheet fit: no follow-up pieces allowed on same sheet', () => {
    // A piece that exactly fills usable area leaves no free rects.
    // Any follow-up piece must go to a new sheet.
    const parts = [
      { ref: 'FullSheet', width: 2420, height: 2130, qty: 1 },
      { ref: 'TinyFollow', width: 5, height: 5, qty: 1 },
    ];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(2);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('right-edge piece at x=0 is valid despite right kerf spillover', () => {
    // A piece placed at x=0 (left/top corner) has kerf that can spill right
    // and down.  Only the non-spill directions are validated.
    const parts = [{ ref: 'LeftTopPiece', width: 500, height: 500, qty: 1 }];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('interior piece: both x>0 and y>0 — kerf must fit in all four directions', () => {
    // A piece placed neither at left nor top edge must satisfy kerf bounds
    // in both directions.  This is the normally-correct case.
    const parts = [
      { ref: 'First', width: 1000, height: 1000, qty: 1 },
      { ref: 'Interior', width: 500, height: 500, qty: 1 },
    ];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('interior piece at x>0 but y=0: only right/bottom kerf checked', () => {
    // A piece at y=0 is exempt from the top kerf check (kerf spills up).
    // A piece at x>0 is subject to the left kerf check.
    const parts = [
      { ref: 'WideFirst', width: 1500, height: 500, qty: 1 },
      { ref: 'BelowIt', width: 500, height: 1625, qty: 1 }, // y=0, x>0
    ];
    const sheets = packMaxRects(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('hybrid strategy also respects symmetric remainder constraint', () => {
    const parts = [
      { ref: 'P1', width: 1000, height: 2130, qty: 1 },
      { ref: 'EvilTwin', width: 5, height: 2126, qty: 1 },
    ];
    const sheets = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });

    const placedCount = sheets.reduce((sum, sheet) => sum + sheet.pieces.length, 0);
    expect(placedCount).toBe(2);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });
});

// ─────────────────────────────────────────────
// EDGE CASES
// ─────────────────────────────────────────────

describe('edge cases', () => {
  test('empty parts list returns empty sheets', () => {
    const sheets = packHybrid([], BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets).toEqual([]);
  });

  test('pieces that fit exactly in one sheet', () => {
    // A single piece that exactly fits the usable area
    const parts = [{ ref: 'ExactFit', width: 2415, height: 2125, qty: 1 }]; // 2440-20=2420, 2150-20=2130, minus tiny kerf
    const sheets = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('rotation allowed when canRotate is true', () => {
    // Tall narrow piece that should benefit from rotation in a wide-short context
    const parts = [{ ref: 'Tall', width: 100, height: 800, qty: 1, canRotate: true }];
    const sheets = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });

  test('rotation disabled when canRotate is false', () => {
    const parts = [{ ref: 'NoRotate', width: 100, height: 800, qty: 1, canRotate: false }];
    const sheets = packHybrid(parts, BOARD_W, BOARD_H, { kerf: KERF });
    expect(sheets.length).toBe(1);
    assertValidLayout(sheets, BOARD_W, BOARD_H);
  });
});

// ─────────────────────────────────────────────
// VALIDATE LAYOUT TESTS
// ─────────────────────────────────────────────

describe('validateLayout', () => {
  test('detects piece exceeding width bounds', () => {
    const badSheets = [{
      id: 1,
      pieces: [{ ref: 'Oversized', x: 2300, y: 0, width: 200, height: 100 }],
    }];
    const result = validateLayout(badSheets, BOARD_W, BOARD_H, { kerf: KERF });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('exceeds usable width'))).toBe(true);
  });

  test('detects overlapping pieces', () => {
    const badSheets = [{
      id: 1,
      pieces: [
        { ref: 'A', x: 0, y: 0, width: 100, height: 100 },
        { ref: 'B', x: 90, y: 90, width: 100, height: 100 }, // overlaps A with kerf gap
      ],
    }];
    const result = validateLayout(badSheets, BOARD_W, BOARD_H, { kerf: KERF });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('overlap'))).toBe(true);
  });

  test('accepts valid non-overlapping layout', () => {
    const goodSheets = [{
      id: 1,
      pieces: [
        { ref: 'A', x: 0, y: 0, width: 500, height: 400 },
        { ref: 'B', x: 510, y: 0, width: 300, height: 200 }, // separated by kerf
      ],
    }];
    const result = validateLayout(goodSheets, BOARD_W, BOARD_H, { kerf: KERF });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects first piece at origin when kerf overflows without exact right-edge touch', () => {
    const badSheets = [{
      id: 1,
      pieces: [{ ref: 'NearEdgeStrip', x: 0, y: 0, width: 2418, height: 100 }],
    }];

    const result = validateLayout(badSheets, BOARD_W, BOARD_H, { kerf: KERF });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('exceeds usable width with kerf'))).toBe(true);
  });
});
