import express from "express";
import sessionRoutes from "./routes/session.routes";
import signupRoutes from "./routes/signup.routes";
import meRoutes from "./routes/me.routes";
import alertRoutes from "./routes/alert.routes";
import deviceRoutes from "./routes/device.routes";
import historyRoutes from "./routes/history.routes";
import anomalyRoutes from "./routes/anomaly.routes";
import trafficRoutes from "./routes/traffic.routes";
import analyticsRoutes from "./routes/analytics.routes"; // MAKE SURE THIS EXISTS
import cors from "cors";

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api", analyticsRoutes); // This might be failing
app.use("/api", trafficRoutes);
app.use("/api", alertRoutes);
app.use("/api", deviceRoutes);
app.use("/api", historyRoutes);
app.use("/sessions", sessionRoutes);
app.use("/anomalies", anomalyRoutes);
app.use(signupRoutes);
app.use(meRoutes);

// Test route
app.get("/test", (req, res) => {
  res.json({ status: "ok", message: "LabNet Backend is running" });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route ${req.url} not found` });
});

export default app;