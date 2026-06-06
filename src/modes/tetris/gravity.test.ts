import { describe, expect, it } from 'vitest';
import { gravityIntervalMs } from './gravity';

describe('gravityIntervalMs', () => {
  it('レベルが上がると間隔が短くなる', () => {
    const lv1 = gravityIntervalMs(1, false);
    const lv5 = gravityIntervalMs(5, false);
    const lv10 = gravityIntervalMs(10, false);
    expect(lv5).toBeLessThan(lv1);
    expect(lv10).toBeLessThan(lv5);
  });

  it('ソフトドロップは通常より速い', () => {
    expect(gravityIntervalMs(1, true)).toBeLessThan(gravityIntervalMs(1, false));
  });

  it('間隔は 1ms 以上', () => {
    expect(gravityIntervalMs(20, true)).toBeGreaterThanOrEqual(1);
  });
});
