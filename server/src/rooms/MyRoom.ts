import { Room, Client, Server } from "@colyseus/core";
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

    // Handle shooting events - broadcast to all clients
    this.onMessage("shoot", (client, message) => {
      // Broadcast the shooting event to all clients in the room
      this.broadcast("shoot", {
        ...message,
        sessionId: client.sessionId,
      });
    });

    // Handle damage events
    this.onMessage("damage", (client, message) => {
      const targetPlayer = this.state.players.get(message.targetSessionId);
      const attackerPlayer = this.state.players.get(client.sessionId);

      if (targetPlayer && attackerPlayer && targetPlayer.health > 0) {
        // Don't allow self-damage
        if (message.targetSessionId === client.sessionId) {
          return;
        }

        // Apply damage
        targetPlayer.health = Math.max(0, targetPlayer.health - message.damage);

        // Check if target was killed
        if (targetPlayer.health <= 0) {
          // Increment killer's score
          attackerPlayer.kills = (attackerPlayer.kills || 0) + 1;

          // Broadcast kill event
          this.broadcast("kill", {
            killerSessionId: client.sessionId,
            victimSessionId: message.targetSessionId,
            killerKills: attackerPlayer.kills,
          });

          console.log(
            `Player ${client.sessionId} killed ${message.targetSessionId}. Total kills: ${attackerPlayer.kills}`
          );
        }

        // Broadcast health update to all clients
        this.broadcast("health-update", {
          sessionId: message.targetSessionId,
          health: targetPlayer.health,
        });

        console.log(
          `Player ${message.targetSessionId} took ${message.damage} damage. Health: ${targetPlayer.health}`
        );
      }
    });

    // Handle respawn events
    this.onMessage("respawn", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Reset health to 100
        player.health = 100;

        // Broadcast health update
        this.broadcast("health-update", {
          sessionId: client.sessionId,
          health: 100,
        });

        console.log(`Player ${client.sessionId} respawned`);
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

    // Handle latency simulation updates
    this.onMessage("set-latency", (client, message) => {
      const latency = message.latency || 0;
      // Access the server instance to set latency simulation
      // Note: This affects all connections, not just this client
      const server = (this as any).server as Server | undefined;
      if (server && typeof (server as any).simulateLatency === "function") {
        (server as any).simulateLatency(latency);
        console.log(`[Server] Latency simulation updated to: ${latency}ms`);
      } else {
        console.warn(
          "[Server] Cannot set latency: server.simulateLatency not available"
        );
      }
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
    player.health = 100; // Initialize health to 100
    player.rotation = 0;
    player.gunRotation = 0;
    player.speed = 0;
    player.kills = 0; // Initialize kills to 0

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
