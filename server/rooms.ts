import type { WebSocket } from 'ws';

/**
 * 権威的サーバのルーム。最大2プレイヤー＋任意人数の観戦者。
 * サーバがシードを配布し、対戦の開始/中継/退出を司る。
 */
export interface Room {
  id: string;
  seed: number;
  players: WebSocket[];
  spectators: WebSocket[];
  started: boolean;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketRoom = new WeakMap<WebSocket, string>();

  private ensure(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0,
        players: [],
        spectators: [],
        started: false,
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  /** プレイヤーとして参加。番号(0/1)とseedを返す。満室なら null。 */
  joinPlayer(ws: WebSocket, roomId: string): { player: 0 | 1; seed: number } | null {
    const room = this.ensure(roomId);
    if (room.players.length >= 2) return null;
    const player = room.players.length as 0 | 1;
    room.players.push(ws);
    this.socketRoom.set(ws, roomId);
    return { player, seed: room.seed };
  }

  /** 観戦者として参加。seed を返す。 */
  joinSpectator(ws: WebSocket, roomId: string): { seed: number } {
    const room = this.ensure(roomId);
    room.spectators.push(ws);
    this.socketRoom.set(ws, roomId);
    return { seed: room.seed };
  }

  roomOf(ws: WebSocket): Room | undefined {
    const id = this.socketRoom.get(ws);
    return id ? this.rooms.get(id) : undefined;
  }

  isFull(roomId: string): boolean {
    return (this.rooms.get(roomId)?.players.length ?? 0) === 2;
  }

  markStarted(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.started = true;
  }

  /** 送信元以外のルーム参加者（対戦相手＋観戦者）。 */
  audience(ws: WebSocket): WebSocket[] {
    const room = this.roomOf(ws);
    if (!room) return [];
    return [...room.players, ...room.spectators].filter((p) => p !== ws);
  }

  everyone(roomId: string): WebSocket[] {
    const room = this.rooms.get(roomId);
    return room ? [...room.players, ...room.spectators] : [];
  }

  /** 退出処理。残った相手/観戦者を返す。 */
  leave(ws: WebSocket): WebSocket[] {
    const room = this.roomOf(ws);
    if (!room) return [];
    room.players = room.players.filter((p) => p !== ws);
    room.spectators = room.spectators.filter((p) => p !== ws);
    this.socketRoom.delete(ws);
    const rest = [...room.players, ...room.spectators];
    if (rest.length === 0) this.rooms.delete(room.id);
    return rest;
  }
}
