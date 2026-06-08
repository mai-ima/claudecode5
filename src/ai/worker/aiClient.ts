import type { MoveDecision } from '../../modes/tetris/ai';
import type { PieceType } from '../../modes/tetris/types';

export interface AiRequestPayload {
  cells: Uint8Array;
  current: PieceType;
  hold: PieceType | null;
  next: PieceType[];
  depth: number;
  beam: number;
  allowHold: boolean;
}

interface AiResponse {
  id: number;
  move: MoveDecision | null;
}

/** AI ワーカのクライアント。利用不可環境では available()=false（同期フォールバック）。 */
export class AiClient {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, (m: MoveDecision | null) => void>();

  constructor() {
    try {
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(new URL('./aiWorker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e: MessageEvent<AiResponse>) => {
          const { id, move } = e.data;
          const resolve = this.pending.get(id);
          if (resolve) {
            this.pending.delete(id);
            resolve(move);
          }
        };
        this.worker.onerror = () => {
          // 失敗時は以後フォールバック。
          this.worker = null;
        };
      }
    } catch {
      this.worker = null;
    }
  }

  available(): boolean {
    return this.worker !== null;
  }

  request(payload: AiRequestPayload): Promise<MoveDecision | null> {
    if (!this.worker) return Promise.resolve(null);
    const id = ++this.seq;
    const buffer = payload.cells.buffer;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.worker?.postMessage(
        {
          id,
          cells: buffer,
          current: payload.current,
          hold: payload.hold,
          next: payload.next,
          depth: payload.depth,
          beam: payload.beam,
          allowHold: payload.allowHold,
        },
        [buffer],
      );
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}

let shared: AiClient | null = null;

/** 共有 AI ワーカクライアント（複数コントローラで再利用）。 */
export function getAiClient(): AiClient {
  if (!shared) shared = new AiClient();
  return shared;
}
