import { Router } from "express";
import {
  createBandwidth,
  getAllBandwidth,
  getBandwidthByRange,
  getBandwidthStats,
} from "../controllers/bandwidth.controller";

import { verifyFirebaseToken } from "../middleware/auth.middleware";

const router = Router();

// CREATE
router.post("/", verifyFirebaseToken, createBandwidth);

// GET ALL
router.get("/", verifyFirebaseToken, getAllBandwidth);

// STATS
router.get("/stats", verifyFirebaseToken, getBandwidthStats);

// RANGE FILTER
router.get("/range/:range", verifyFirebaseToken, getBandwidthByRange);

export default router;