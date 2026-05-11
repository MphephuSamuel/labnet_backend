import express from "express";
import { createAnomalyController, getAnomalies } from "../controllers/anomaly.controller";
import { verifyFirebaseToken } from "../middleware/auth.middleware";

const router = express.Router();

// protect routes
router.post("/", verifyFirebaseToken, createAnomalyController);
router.get("/", verifyFirebaseToken, getAnomalies);

export default router;