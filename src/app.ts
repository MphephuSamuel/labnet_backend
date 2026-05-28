import express from "express";
import sessionRoutes from "./routes/session.routes";
import signupRoutes from "./routes/signup.routes";
import meRoutes from "./routes/me.routes";
// import scannerRoutes from "./routes/scanner.routes";
import alertRoutes from "./routes/alert.routes";
import deviceRoutes from "./routes/device.routes";
import historyRoutes from "./routes/history.routes";
import anomalyRoutes from "./routes/anomaly.routes";
import trafficRoutes from "./routes/traffic.routes";
import settingsRoutes from "./routes/settings.routes";
import aiRoutes from "./routes/ai.routes";

const app = express();

// Middleware
app.use(express.json());

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
app.use("/anomalies", anomalyRoutes);

// app.use("/api", scannerRoutes);

// Health/test endpoint
app.get("/test", (req, res) => {
  res.json({ status: "ok", message: "LabNet Backend is running" });
});

export default app;
