import express from "express";
import deviceRoutes from "./routes/device.routes";
import signupRoutes from "./routes/signup.routes";

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use(signupRoutes);
app.use("/devices", deviceRoutes);

// Test route

// Health/test endpoint
app.get("/test", (req, res) => {
  res.json({ status: "ok", message: "LabNet Backend is running" });
});

export default app;
