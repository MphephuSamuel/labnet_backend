import express from "express";
import sessionRoutes from "./routes/session.routes";
import signupRoutes from "./routes/signup.routes";
import meRoutes from "./routes/me.routes";

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use(signupRoutes);
app.use(meRoutes);
app.use("/sessions", sessionRoutes);

// Test route

// Health/test endpoint
app.get("/test", (req, res) => {
  res.json({ status: "ok", message: "LabNet Backend is running" });
});

export default app;
