import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStore } from './_store.js';

/** GET /api/poll?room=&player= -> { started, messages[] } 自分宛メッセージを取得 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const room = req.query.room;
  const playerRaw = req.query.player;
  if (typeof room !== 'string' || (playerRaw !== '0' && playerRaw !== '1')) {
    res.status(400).json({ error: 'invalid query' });
    return;
  }
  const player = Number(playerRaw) as 0 | 1;
  const store = getStore();
  const started = await store.isStarted(room);
  const raw = await store.drain(room, player);
  const messages = raw
    .map((s) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        return null;
      }
    })
    .filter((m): m is unknown => m !== null);
  res.status(200).json({ started, messages });
}
