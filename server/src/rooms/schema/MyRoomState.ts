import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("string") sessionId: string;
  @type("string") username: string = "";
  @type("number") rotation: number;
  @type("number") gunRotation: number;
  @type("number") speed: number;
  @type("number") health: number;
  @type("number") kills: number = 0;
  @type("number") colorIndex: number = 1;
  @type("number") baseIndex: number = 1;
  @type("number") gunIndex: number = 1;
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
