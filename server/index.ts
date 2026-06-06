import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { RoomManager } from './rooms.js';

/**
 * オンライン対戦のリレーサーバ（Node + ws）。
 * 中身は解釈せず、'join' 以外のメッセージは相手へそのまま転送する。
 */
const PORT = Number(process.env.PORT ?? 8080);
const wss = new WebSocketServer({ port: PORT });
const rooms = new RoomManager();

function sendJson(ws: WebSocket, obj: unknown): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (raw: Buffer | string) => {
    let msg: { t?: string; room?: string };
    try {
      msg = JSON.parse(raw.toString()) as { t?: string; room?: string };
    } catch {
      return;
    }

    if (msg.t === 'join' && typeof msg.room === 'string') {
      const player = rooms.join(ws, msg.room);
      if (player === null) {
        sendJson(ws, { t: 'opponentLeft' }); // 満室扱い。
        return;
      }
      sendJson(ws, { t: 'joined', room: msg.room, player });
      if (rooms.isFull(msg.room)) {
        for (const member of rooms.members(msg.room)) sendJson(member, { t: 'start' });
      }
      return;
    }

    // それ以外は相手へ中継。
    const opponent = rooms.opponent(ws);
    if (opponent) sendJson(opponent, msg);
  });

  ws.on('close', () => {
    const opponent = rooms.leave(ws);
    if (opponent) sendJson(opponent, { t: 'opponentLeft' });
  });
});

console.log(`Tetris versus relay server listening on ws://localhost:${PORT}`);
