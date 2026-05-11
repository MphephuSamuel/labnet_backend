import express from "express";
import deviceRoutes from "./routes/device.routes";
import signupRoutes from "./routes/signup.routes";
import meRoutes from "./routes/me.routes";
import scannerRoutes from "./routes/scanner.routes";

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use(signupRoutes);
app.use(meRoutes);
app.use("/devices", deviceRoutes);
app.use("/api", scannerRoutes);

// Health/test endpoint
app.get("/test", (req, res) => {
  res.json({ status: "ok", message: "LabNet Backend is running" });
});

export default app;
