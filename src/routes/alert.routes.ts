import { Router } from "express";
import { addAlert, getAlerts } from "../controllers/alert.controller";

const router = Router();

// Add an alert
router.post("/alerts", addAlert);

// Get all alerts
router.get("/alerts", getAlerts);

export default router;
