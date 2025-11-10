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
      this.room = null;
    });

    this.room.onError((code, message) => {
      console.error("Room error:", code, message);
    });

    this.room.onMessage("*", (type, message) => {
      console.log("Received message:", type, message);
      // Handle messages here
    });
  }

  /**
   * Send a message to the room
   */
  send(type: string, message: any): void {
    if (!this.room) {
      console.warn("Cannot send message: not connected to a room");
      return;
    }
    this.room.send(type, message);
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
      // You might want to warn here.
      return;
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
    this.room.send("player-input", this.inputPayload);
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
}
