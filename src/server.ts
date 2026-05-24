import "dotenv/config";
import app from "./app";
import { createServer } from "http";
import { Server } from "socket.io";

// Change port to 3001 or any available port
const PORT = Number(process.env.PORT || 3001);

console.log("🚀 Starting LabNet Backend...");
console.log(`📡 Port: ${PORT}`);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);
  socket.on("scanner_update", (data) => {
    socket.broadcast.emit("network_update", data);
  });
  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

console.log("🌐 Starting Express server with WebSockets...");

// Bind to all network interfaces
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ LabNet Backend running on port ${PORT}`);
  console.log(`📍 Local access: http://localhost:${PORT}`);
  console.log(`📍 Network access: http://192.168.0.24:${PORT}`);
  console.log(`🔗 Scanner endpoints: http://localhost:${PORT}/api/{devices,summary,alerts,status,history}`);
  console.log(`🏠 Health check: http://localhost:${PORT}/test`);
});