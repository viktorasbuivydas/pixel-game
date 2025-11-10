import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("string") sessionId: string;
  @type("number") rotation: number;
  @type("number") gunRotation: number;
  @type("number") speed: number;
  @type("number") health: number;
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
