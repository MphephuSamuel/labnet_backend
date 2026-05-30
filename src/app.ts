import express from "express";
import sessionRoutes from "./routes/session.routes";
import signupRoutes from "./routes/signup.routes";
import meRoutes from "./routes/me.routes";
import alertRoutes from "./routes/alert.routes";
import deviceRoutes from "./routes/device.routes";
import historyRoutes from "./routes/history.routes";
import anomalyRoutes from "./routes/anomaly.routes";
import trafficRoutes from "./routes/traffic.routes";
import settingsRoutes from "./routes/settings.routes";

import analyticsRoutes from "./routes/analytics.routes";
import cors from "cors";

import aiRoutes from "./routes/ai.routes";


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
app.use(signupRoutes);
app.use(meRoutes);
app.use("/api", alertRoutes);
app.use("/sessions", sessionRoutes);
app.use("/api", deviceRoutes);
app.use("/api", deviceRoutes); // Add device routes
app.use("/api", historyRoutes);
app.use("/api", trafficRoutes); // Add traffic routes
app.use("/api/users/me", settingsRoutes); // Add settings routes
app.use("/api", aiRoutes);
//app.use("/api", historyRoutes);

// Test route
app.get("/test", (req, res) => {
  res.json({ status: "ok", message: "LabNet Backend is running" });
});

// Routes
app.use("/api", analyticsRoutes);
app.use("/api", trafficRoutes);
app.use("/api", alertRoutes);
app.use("/api", deviceRoutes);
app.use("/api", historyRoutes);
app.use("/sessions", sessionRoutes);
app.use("/anomalies", anomalyRoutes);
app.use(signupRoutes);
app.use(meRoutes);
app.use("/api/users/me", settingsRoutes);
app.use("/anomalies", anomalyRoutes);

// 404 handler
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route ${req.url} not found` });
});

export default app;

