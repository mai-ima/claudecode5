import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { RoomManager } from './rooms.js';
import { Matchmaking } from './matchmaking.js';

/**
 * 権威的 WebSocket 対戦サーバ（Node + ws）。
 * - join(room|spectate|matchmake): 参加 → joined(player/seed) を返し、2人揃えば start
 * - それ以外のメッセージ: ルームの相手＋観戦者へ中継（snapshot/attack/gameover）
 * - 切断: 残った参加者へ opponentLeft
 *
 * シードはサーバが配布し、両者同一の 7-bag で公平に対戦する。
 */
const PORT = Number(process.env.PORT ?? 8080);
const wss = new WebSocketServer({ port: PORT });
const rooms = new RoomManager();
const mm = new Matchmaking();

function send(ws: WebSocket, obj: unknown): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function startIfReady(roomId: string): void {
  if (!rooms.isFull(roomId)) return;
  rooms.markStarted(roomId);
  for (const member of rooms.everyone(roomId)) send(member, { t: 'start' });
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (raw: Buffer | string) => {
    let msg: { t?: string; room?: string; mode?: string };
    try {
      msg = JSON.parse(raw.toString()) as typeof msg;
    } catch {
      return;
    }

    if (msg.t === 'join') {
      // mode: 'spectate' で観戦、'matchmake' で自動マッチ、未指定はルーム名参加。
      if (msg.mode === 'spectate' && typeof msg.room === 'string') {
        const { seed } = rooms.joinSpectator(ws, msg.room);
        send(ws, { t: 'joined', player: 2, room: msg.room, seed, spectator: true });
        if (rooms.isFull(msg.room)) send(ws, { t: 'start' });
        return;
      }
      if (msg.mode === 'matchmake') {
        const match = mm.enqueue(ws);
        if (!match) {
          send(ws, { t: 'waiting' });
          return;
        }
        const a = rooms.joinPlayer(match.opponent, match.roomId);
        const b = rooms.joinPlayer(ws, match.roomId);
        if (a) send(match.opponent, { t: 'joined', player: a.player, room: match.roomId, seed: a.seed });
        if (b) send(ws, { t: 'joined', player: b.player, room: match.roomId, seed: b.seed });
        startIfReady(match.roomId);
        return;
      }
      if (typeof msg.room === 'string') {
        const res = rooms.joinPlayer(ws, msg.room);
        if (!res) {
          send(ws, { t: 'opponentLeft' }); // 満室。
          return;
        }
        send(ws, { t: 'joined', player: res.player, room: msg.room, seed: res.seed });
        startIfReady(msg.room);
        return;
      }
      return;
    }

    // 中継（相手＋観戦者へ）。
    for (const member of rooms.audience(ws)) send(member, msg);
  });

  ws.on('close', () => {
    mm.remove(ws);
    for (const rest of rooms.leave(ws)) send(rest, { t: 'opponentLeft' });
  });
});

console.log(`Tetris authoritative WS server listening on ws://localhost:${PORT}`);
