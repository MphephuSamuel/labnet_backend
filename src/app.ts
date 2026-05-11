import express from "express";
import signupRoutes from "./routes/signup.routes";
import meRoutes from "./routes/me.routes";

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use(signupRoutes);
app.use(meRoutes);

// Test route

// Health/test endpoint
app.get("/test", (req, res) => {
  res.json({ status: "ok", message: "LabNet Backend is running" });
});

export default app;
