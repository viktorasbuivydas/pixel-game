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

    // Handle username updates
    this.onMessage("set-username", (client, message) => {
      const player = this.state.players.get(client.id);
      if (player && message.username) {
        player.username = message.username;
        player.sessionId = client.sessionId;
        console.log(
          `Player ${client.sessionId} set username to: ${message.username}`
        );
      }
    });

    // Handle ping messages and respond with pong
    this.onMessage("ping", (client, message) => {
      console.log("Received ping from", client.sessionId, message);
      // Respond with pong containing the server timestamp
      const serverTime = Date.now();
      console.log("Sending pong with timestamp:", serverTime);
      client.send("pong", {
        ts: serverTime,
        type: "pong",
      });
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
    player.sessionId = client.sessionId;
    player.username =
      options?.username || `Player ${client.sessionId.slice(0, 6)}`;

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
