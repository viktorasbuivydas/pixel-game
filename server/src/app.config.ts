import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { matchMaker } from "@colyseus/core";
import cors from "cors";

/**
 * Import your Room files
 */
import { MyRoom } from "./rooms/MyRoom";

export default config({
  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    gameServer.define("my_room", MyRoom);

    /**
     * Simulate latency for testing (in milliseconds)
     * Set SIMULATE_LATENCY environment variable to enable (e.g., SIMULATE_LATENCY=200)
     */
    const simulateLatency = process.env.SIMULATE_LATENCY
      ? parseInt(process.env.SIMULATE_LATENCY, 10)
      : 0;
    if (simulateLatency > 0) {
      gameServer.simulateLatency(simulateLatency);
      console.log(`[Server] Latency simulation enabled: ${simulateLatency}ms`);
    }
  },

  initializeExpress: (app) => {
    /**
     * Configure CORS to allow requests from the client
     */
    app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        credentials: true,
      })
    );

    /**
     * Bind your custom express routes here:
     * Read more: https://expressjs.com/en/starter/basic-routing.html
     */
    app.get("/hello_world", (req, res) => {
      res.send("It's time to kick ass and chew bubblegum!");
    });

    /**
     * Use @colyseus/playground
     * (It is not recommended to expose this route in a production environment)
     */
    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground());
    }

    /**
     * Use @colyseus/monitor
     * It is recommended to protect this route with a password
     * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
     */
    app.use("/monitor", monitor());
  },

  beforeListen: () => {},
});
