import { Router } from "express";
import { addAlert, getAlerts } from "../controllers/alert.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

// Add an alert
router.post("/alerts", requireFirebaseAuth, addAlert);

// Get all alerts
router.get("/alerts", requireFirebaseAuth, getAlerts);

export default router;
