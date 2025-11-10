import { Room, Client } from "@colyseus/core";
import { MyRoomState, Player } from "./schema/MyRoomState";
import { TankFactory } from "../../../src/core/TankFactory";

export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;
  state = new MyRoomState();

  onCreate(options: any) {
    this.onMessage("type", (client, message) => {
      //
      // handle "type" message
      //
    });

    this.onMessage("player-input", (client, message) => {
      const player = this.state.players.get(client.id);

      player.x = message.x;
      player.y = message.y;
      player.sessionId = client.sessionId;
      player.rotation = message.rotation;
      player.gunRotation = message.gunRotation;
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const mapWidth = 1000;
    const mapHeight = 1000;
    // Create a new Player instance for the joined client, following the MainScene tank setup
    // We'll give the player an initial position similar to MainScene (x=100, y=100)
    const player = new Player();
    player.x = 100;
    player.y = 100;

    // player.x = (Math.random() * mapWidth);
    // player.y = (Math.random() * mapHeight);
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");

    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
