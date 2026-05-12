import { Router } from "express";
import {
  createThreatController,
  getThreats,
} from "../controllers/threat.controller";

import { verifyFirebaseToken } from "../middleware/auth.middleware";

const router = Router();

router.post("/", verifyFirebaseToken, createThreatController);

router.get("/", verifyFirebaseToken, getThreats);

export default router;