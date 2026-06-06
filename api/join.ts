import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStore } from './_store.js';

/** POST /api/join { room } -> { player, room } | 409 満室 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const room = (req.body as { room?: unknown })?.room;
  if (typeof room !== 'string' || room.length === 0 || room.length > 64) {
    res.status(400).json({ error: 'invalid room' });
    return;
  }
  const player = await getStore().join(room);
  if (player === null) {
    res.status(409).json({ error: 'room full' });
    return;
  }
  res.status(200).json({ player, room });
}
