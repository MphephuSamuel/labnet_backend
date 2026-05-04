import { Router } from "express";
import {
    ingestTraffic,
    getCurrentBandwidth
} from "../controllers/traffic.controllers";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

// Protected: Ingest traffic data
router.post("/", requireFirebaseAuth, ingestTraffic);

// Protected: Get current bandwidth
router.get("/current", requireFirebaseAuth, getCurrentBandwidth);

export default router;