import { beforeEach, describe, expect, test, vi } from 'vitest';

const { packGuillotine, packMaxRects, packHybrid } = vi.hoisted(() => ({
  packGuillotine: vi.fn(),
  packMaxRects: vi.fn(),
  packHybrid: vi.fn(),
}));

vi.mock('./nesting/nestingAlgorithms', () => ({
  packGuillotine,
  packMaxRects,
  packHybrid,
}));

import { buildNestingPreview } from './nestingLayout.js';

describe('buildNestingPreview', () => {
  beforeEach(() => {
    packGuillotine.mockReset();
    packMaxRects.mockReset();
    packHybrid.mockReset();
  });

  test('surfaces packer placement failures as unplaced pieces', () => {
    packGuillotine.mockReturnValue([
      {
        id: 1,
        pieces: [
          {
            ref: 'Panel',
            instanceId: 'piece_0_0',
            x: 0,
            y: 0,
            width: 600,
            height: 400,
            rotated: false,
          },
        ],
        freeRects: [],
      },
    ]);

    const result = buildNestingPreview({
      rows: [{ largo: 600, ancho: 400, cantidad: 2, detalle: 'Panel' }],
      boardWidth: 2440,
      boardHeight: 2150,
      kerf: 5,
      refiladoX: 20,
      refiladoY: 20,
      algorithm: 'guillotine',
    });

    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].pieces).toHaveLength(1);
    expect(result.unplaced).toEqual([
      expect.objectContaining({
        id: 'piece_0',
        ref: 'Panel',
        label: 'Panel',
        instanceId: 'piece_0_1',
      }),
    ]);
  });
});
