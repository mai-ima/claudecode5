import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET, makeRuleSet } from './ruleset';

describe('TetrisRuleSet', () => {
  it('既定は SRS・180可・T-spin', () => {
    expect(DEFAULT_RULESET.rotationSystem).toBe('srs');
    expect(DEFAULT_RULESET.allow180).toBe(true);
    expect(DEFAULT_RULESET.spinMode).toBe('tspin');
  });

  it('ソフトドロップは通常より速い', () => {
    const r = makeRuleSet();
    expect(r.gravityMs(1, true)).toBeLessThan(r.gravityMs(1, false));
  });

  it('softDrop40G ではソフトが即着(0ms)', () => {
    const r = makeRuleSet({ softDrop40G: true });
    expect(r.gravityMs(1, true)).toBe(0);
    // 通常落下は 0 ではない。
    expect(r.gravityMs(1, false)).toBeGreaterThan(0);
  });

  it('部分上書きで他は既定を維持', () => {
    const r = makeRuleSet({ allow180: false, nextCount: 1 });
    expect(r.allow180).toBe(false);
    expect(r.nextCount).toBe(1);
    expect(r.rotationSystem).toBe('srs');
  });
});
