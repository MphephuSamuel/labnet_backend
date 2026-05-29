import "dotenv/config";
import app from "./app";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT || 3000);

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

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ LabNet Backend running on port ${PORT}`);
  console.log(`📍 Local access: http://localhost:${PORT}`);
  console.log(`📍 Network access: http://192.168.0.29:${PORT}`);
  console.log(`🏠 Health check: http://localhost:${PORT}/test`);
});