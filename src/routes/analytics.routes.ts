import { Router } from "express";
import { getAnalytics } from "../controllers/analytics.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

router.get("/analytics", requireFirebaseAuth, getAnalytics);

export default router;