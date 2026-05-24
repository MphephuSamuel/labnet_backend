import { Router } from "express";
import { getAnalytics } from "../controllers/analytics.controller";

const router = Router();

router.get("/analytics", getAnalytics);

export default router;