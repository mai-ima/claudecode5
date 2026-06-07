import type { SoloOutcome, VersusOutcome } from '../app/Session';

/** 戦績・モード別ベスト・簡易レーティング（Elo）。localStorage 永続化。 */
const KEY = 'tetris.stats';
const ELO_K = 32;

export interface StatsData {
  games: number;
  totalLines: number;
  rating: number;
  wins: number;
  losses: number;
  sprintBestMs: number | null;
  ultraBestScore: number | null;
  marathonBestScore: number | null;
}

const DEFAULTS: StatsData = {
  games: 0,
  totalLines: 0,
  rating: 1000,
  wins: 0,
  losses: 0,
  sprintBestMs: null,
  ultraBestScore: null,
  marathonBestScore: null,
};

export class StatsStore {
  private data: StatsData;

  constructor() {
    this.data = this.load();
  }

  get all(): Readonly<StatsData> {
    return this.data;
  }

  recordSolo(o: SoloOutcome): void {
    this.data.games++;
    this.data.totalLines += o.lines;
    if (o.mode === 'sprint' && o.cleared) {
      if (this.data.sprintBestMs === null || o.timeMs < this.data.sprintBestMs) {
        this.data.sprintBestMs = o.timeMs;
      }
    } else if (o.mode === 'ultra') {
      if (this.data.ultraBestScore === null || o.score > this.data.ultraBestScore) {
        this.data.ultraBestScore = o.score;
      }
    } else if (o.mode === 'marathon') {
      if (this.data.marathonBestScore === null || o.score > this.data.marathonBestScore) {
        this.data.marathonBestScore = o.score;
      }
    }
    this.save();
  }

  recordVersus(o: VersusOutcome): void {
    if (o.youWon === null) return;
    this.data.games++;
    if (o.youWon) this.data.wins++;
    else this.data.losses++;
    if (o.rated) {
      const opp = o.opponentRating ?? 1000;
      const expected = 1 / (1 + Math.pow(10, (opp - this.data.rating) / 400));
      const score = o.youWon ? 1 : 0;
      this.data.rating = Math.round(this.data.rating + ELO_K * (score - expected));
    }
    this.save();
  }

  private load(): StatsData {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<StatsData>) };
    } catch {
      // 既定。
    }
    return { ...DEFAULTS };
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // 無視。
    }
  }
}
