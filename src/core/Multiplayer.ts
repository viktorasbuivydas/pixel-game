import { Client, Room } from "colyseus.js";
import type { MyRoomState } from "../../server/src/rooms/schema/MyRoomState";

/**
 * Multiplayer manager class for handling Colyseus client connections
 */
export class Multiplayer {
  private client: Client;
  private room: Room<MyRoomState> | null = null;
  private serverUrl: string;
  private inputPayload: {
    x: number;
    y: number;
    rotation: number;
    gunRotation: number;
    sessionId: string;
  } = {
    x: 0,
    y: 0,
    rotation: 0,
    gunRotation: 0,
    sessionId: "",
  };

  // Allow external listeners for onStateChange
  /** Array of listeners to be called on state change */
  private stateChangeListeners: Array<(state: MyRoomState) => void> = [];

  // Ping functionality
  private pingInterval: NodeJS.Timeout | number | null = null;
  private lastPingTime: number = 0;
  private lastPingPerf: DOMHighResTimeStamp = 0;
  private lastOffsets: number[] = [];
  private pingListeners: Array<(latency: number, timeOffset: number) => void> =
    [];
  private static readonly TIME_OFFSET_SAMPLES = 5;

  constructor(serverUrl: string = "http://localhost:2567") {
    this.serverUrl = serverUrl;
    this.client = new Client(serverUrl);
  }

  /**
   * Register a listener for room state changes
   */
  onStateChange(cb: (state: MyRoomState) => void): void {
    this.stateChangeListeners.push(cb);
    // Optionally, if already in a room, immediately call cb with the current state
    if (this.room && this.room.state) {
      cb(this.room.state);
    }
  }

  /**
   * Remove a previously added state change listener.
   * @param cb The callback to remove.
   */
  offStateChange(cb: (state: MyRoomState) => void): void {
    this.stateChangeListeners = this.stateChangeListeners.filter(
      (fn) => fn !== cb
    );
  }

  /**
   * Call all registered state change listeners.
   */
  private emitStateChange(state: MyRoomState): void {
    for (const listener of this.stateChangeListeners) {
      try {
        listener(state);
      } catch (e) {
        // Don't let one bad listener break state propagation
        console.error("Error in onStateChange listener:", e);
      }
    }
  }

  /**
   * Join or create a room. If a room exists, join it; otherwise, create a new one.
   */
  async joinOrCreate(
    roomName: string = "my_room",
    options?: any
  ): Promise<Room<MyRoomState>> {
    try {
      this.room = await this.client.joinOrCreate<MyRoomState>(
        roomName,
        options
      );
      this.setupRoomHandlers();
      return this.room;
    } catch (error) {
      console.error("Failed to join or create room:", error);
      throw error;
    }
  }

  /**
   * Create a new room.
   */
  async create(
    roomName: string = "my_room",
    options?: any
  ): Promise<Room<MyRoomState>> {
    try {
      this.room = await this.client.create<MyRoomState>(roomName, options);
      this.setupRoomHandlers();
      return this.room;
    } catch (error) {
      console.error("Failed to create room:", error);
      throw error;
    }
  }

  /**
   * Join an existing room by name.
   */
  async join(
    roomName: string = "my_room",
    options?: any
  ): Promise<Room<MyRoomState>> {
    try {
      this.room = await this.client.join<MyRoomState>(roomName, options);
      this.setupRoomHandlers();
      return this.room;
    } catch (error) {
      console.error("Failed to join room:", error);
      throw error;
    }
  }

  /**
   * Join a room by its ID.
   */
  async joinById(roomId: string, options?: any): Promise<Room<MyRoomState>> {
    try {
      this.room = await this.client.joinById<MyRoomState>(roomId, options);
      this.setupRoomHandlers();
      return this.room;
    } catch (error) {
      console.error("Failed to join room by ID:", error);
      throw error;
    }
  }

  /**
   * Reconnect to a room using session ID and room ID.
   */
  async reconnect(
    roomId: string,
    sessionId: string
  ): Promise<Room<MyRoomState>> {
    try {
      this.room = await this.client.reconnect<MyRoomState>(
        roomId as any,
        sessionId as any
      );
      this.setupRoomHandlers();
      return this.room;
    } catch (error) {
      console.error("Failed to reconnect to room:", error);
      throw error;
    }
  }

  /**
   * Setup event handlers for the room
   */
  private setupRoomHandlers(): void {
    if (!this.room) return;

    this.room.onStateChange((state) => {
      console.log("Room state changed:", state);
      // Call external listeners
      this.emitStateChange(state);
    });

    this.room.onLeave((code) => {
      console.log("Left room with code:", code);
      this.stopPing();
      this.room = null;
    });

    this.room.onError((code, message) => {
      console.error("Room error:", code, message);
    });

    // Setup ping/pong handler BEFORE the catch-all handler
    // This ensures the specific handler is registered first
    this.room.onMessage("pong", (data: any) => {
      console.log("Received pong:", data);
      if (!data || typeof data.ts !== "number") {
        console.warn("Invalid pong message:", data);
        return;
      }
      const serverTime = data.ts;
      const latency = performance.now() - this.lastPingPerf;

      // Calculate the current time offset
      // https://en.wikipedia.org/wiki/Network_Time_Protocol#Clock_synchronization_algorithm
      const timeOffset =
        (2 * serverTime -
          Math.round(this.lastPingTime) -
          Math.round(Date.now())) /
        2.0;

      // Store the last few time offsets to average them
      this.lastOffsets.push(timeOffset);
      if (this.lastOffsets.length > Multiplayer.TIME_OFFSET_SAMPLES) {
        this.lastOffsets.shift();
      }

      // Sort the offsets and take the middle one
      let values = this.lastOffsets.slice().sort();
      if (values.length > 3) {
        values = values.slice(1, -1);
      }

      // Average the remaining offsets
      const average =
        values.length > 0
          ? Math.floor(
              values.reduce((acc, val) => acc + val, 0) / values.length
            )
          : 0;

      // Notify listeners
      this.emitPingUpdate(latency, average);

      // If we don't have enough samples (at startup), send another ping
      if (this.lastOffsets.length < Multiplayer.TIME_OFFSET_SAMPLES) {
        this.sendPing();
      }
    });

    // Catch-all message handler (after specific handlers)
    this.room.onMessage("*", (type, message) => {
      // Skip pong messages as they're handled above
      if (type !== "pong") {
        console.log("Received message:", type, message);
      }
    });

    // Start ping interval
    this.startPing();
  }

  /**
   * Send a message to the room
   */
  send(type: string, message: any): void {
    if (!this.room) {
      console.warn("Cannot send message: not connected to a room");
      return;
    }
    if (!this.isConnected()) {
      console.warn("Cannot send message: WebSocket connection is closed");
      return;
    }
    try {
      this.room.send(type, message);
    } catch (error) {
      console.warn("Error sending message:", error);
    }
  }

  /**
   * Send player movement input (position/rotation/gunRotation) to the server
   */
  sendPlayerInput(
    x: number,
    y: number,
    rotation: number,
    gunRotation: number,
    sessionId?: string
  ): void {
    if (!this.room) {
      return;
    }
    if (!this.isConnected()) {
      return; // Silently skip if connection is closed
    }
    this.inputPayload.x = x;
    this.inputPayload.y = y;
    this.inputPayload.rotation = rotation;
    this.inputPayload.gunRotation = gunRotation;
    // Set sessionId if provided, else get from current session
    if (sessionId) {
      this.inputPayload.sessionId = sessionId;
    } else {
      this.inputPayload.sessionId = this.getSessionId() || "";
    }
    // Send the payload to the server
    try {
      this.room.send("player-input", this.inputPayload);
    } catch (error) {
      // Silently handle errors when connection is closed
      // The connection check should prevent this, but catch just in case
    }
  }

  /**
   * Leave the current room
   */
  leave(consented: boolean = true): void {
    if (this.room) {
      this.room.leave(consented);
      this.room = null;
    }
  }

  /**
   * Get the current room
   */
  getRoom(): Room<MyRoomState> | null {
    return this.room;
  }

  /**
   * Check if connected to a room
   */
  isConnected(): boolean {
    return this.room !== null && this.room.connection.isOpen;
  }

  /**
   * Get the client instance
   */
  getClient(): Client & { sessionId?: string } & { sessionId?: string } {
    // Augment type with sessionId for convenience (see below)
    // But the sessionId actually comes from the joined Room, not the Client
    // For legacy-code compatibility, we provide sessionId here

    // If the user never joined a room, sessionId will not be available
    // So we attach it if we have a joined room
    const clientWithSession = this.client as Client & { sessionId?: string };
    // Prefer sessionId from the current room
    if (this.room && this.room.sessionId) {
      clientWithSession.sessionId = this.room.sessionId;
    }
    return clientWithSession;
  }

  /**
   * Get the current sessionId of the player/client
   */
  getSessionId(): string | undefined {
    if (this.room && this.room.sessionId) return this.room.sessionId;
    return undefined;
  }

  /**
   * Start sending ping messages
   */
  private startPing(): void {
    this.sendPing();
    this.pingInterval = setInterval(() => this.sendPing(), 3000);
  }

  /**
   * Stop sending ping messages
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send a ping message to the server
   */
  private sendPing(): void {
    if (!this.room) return;
    if (!this.isConnected()) {
      // Stop ping if connection is closed
      this.stopPing();
      return;
    }

    try {
      this.lastPingPerf = performance.now();
      this.lastPingTime = Date.now();
      console.log("Sending ping:", this.lastPingTime);
      this.room.send("ping", {
        ts: this.lastPingTime,
        type: "ping",
      });
    } catch (error) {
      // Connection closed, stop pinging
      console.warn("Error sending ping:", error);
      this.stopPing();
    }
  }

  /**
   * Register a listener for ping updates
   */
  onPingUpdate(cb: (latency: number, timeOffset: number) => void): void {
    this.pingListeners.push(cb);
  }

  /**
   * Remove a ping update listener
   */
  offPingUpdate(cb: (latency: number, timeOffset: number) => void): void {
    this.pingListeners = this.pingListeners.filter((fn) => fn !== cb);
  }

  /**
   * Emit ping update to all listeners
   */
  private emitPingUpdate(latency: number, timeOffset: number): void {
    for (const listener of this.pingListeners) {
      try {
        listener(latency, timeOffset);
      } catch (e) {
        console.error("Error in onPingUpdate listener:", e);
      }
    }
  }
}
