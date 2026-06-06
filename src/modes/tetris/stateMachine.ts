/** ゲーム進行フェーズと、その遷移規則。 */
export type Phase = 'ready' | 'playing' | 'paused' | 'gameover';

const TRANSITIONS: Record<Phase, Phase[]> = {
  ready: ['playing'],
  playing: ['paused', 'gameover'],
  paused: ['playing', 'gameover'],
  gameover: ['ready'],
};

/** from から to への遷移が許されるか。 */
export function canTransition(from: Phase, to: Phase): boolean {
  return TRANSITIONS[from].includes(to);
}
