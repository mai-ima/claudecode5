import type { WebSocket } from 'ws';

/**
 * ルーム管理。各ルームは最大 2 人。サーバはメッセージの中身を解釈せず、
 * 相手へそのまま中継する（疎結合な設計）。
 */
interface Room {
  id: string;
  players: WebSocket[];
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketRoom = new WeakMap<WebSocket, string>();

  /** ルームに参加させる。割り当てられたプレイヤー番号を返す（満室なら null）。 */
  join(ws: WebSocket, roomId: string): 0 | 1 | null {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = { id: roomId, players: [] };
      this.rooms.set(roomId, room);
    }
    if (room.players.length >= 2) return null;
    const index = room.players.length as 0 | 1;
    room.players.push(ws);
    this.socketRoom.set(ws, roomId);
    return index;
  }

  /** ルームが 2 人そろっているか。 */
  isFull(roomId: string): boolean {
    return (this.rooms.get(roomId)?.players.length ?? 0) === 2;
  }

  /** ルーム内の対戦相手を返す。 */
  opponent(ws: WebSocket): WebSocket | null {
    const roomId = this.socketRoom.get(ws);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.players.find((p) => p !== ws) ?? null;
  }

  /** ルーム内の全員を返す。 */
  members(roomId: string): WebSocket[] {
    return this.rooms.get(roomId)?.players ?? [];
  }

  roomOf(ws: WebSocket): string | undefined {
    return this.socketRoom.get(ws);
  }

  /** 切断処理。残った相手を返す（通知用）。 */
  leave(ws: WebSocket): WebSocket | null {
    const opponent = this.opponent(ws);
    const roomId = this.socketRoom.get(ws);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.players = room.players.filter((p) => p !== ws);
        if (room.players.length === 0) this.rooms.delete(roomId);
      }
      this.socketRoom.delete(ws);
    }
    return opponent;
  }
}
