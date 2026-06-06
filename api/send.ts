import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStore } from './_store.js';

/** POST /api/send { room, from, msg } -> { ok } 相手のメールボックスへ中継 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const body = req.body as { room?: unknown; from?: unknown; msg?: unknown };
  const room = body?.room;
  const from = body?.from;
  if (typeof room !== 'string' || (from !== 0 && from !== 1) || typeof body?.msg !== 'object') {
    res.status(400).json({ error: 'invalid payload' });
    return;
  }
  const to = (1 - from) as 0 | 1;
  await getStore().push(room, to, JSON.stringify(body.msg));
  res.status(200).json({ ok: true });
}
