import { Router } from "express";
import { receiveTrafficData, getLatestTraffic } from "../controllers/traffic.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

// Route to receive traffic data from Python script (protected for now, can be removed if not needed)
router.post("/traffic", requireFirebaseAuth, receiveTrafficData);

// Route to get latest traffic data for frontend (protected)
router.get("/traffic", requireFirebaseAuth, getLatestTraffic);

export default router;