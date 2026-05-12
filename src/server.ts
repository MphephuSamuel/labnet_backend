import "dotenv/config";
import app from "./app";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT || 5000);

console.log("🚀 Starting LabNet Backend...");
console.log(`📡 Port: ${PORT}`);

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  // When the python scanner sends an update
  socket.on("scanner_update", (data) => {
    // Broadcast to all other connected clients (like Flutter app)
    socket.broadcast.emit("network_update", data);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

console.log("🌐 Starting Express server with WebSockets...");
httpServer.listen(PORT, () => {
  console.log(`✅ LabNet Backend running on port ${PORT}`);
  console.log(`🔗 Scanner proxy endpoints available at http://localhost:${PORT}/api/{devices,summary,alerts,status,history}`);
  console.log(`🏠 Health check: http://localhost:${PORT}/test`);
});
