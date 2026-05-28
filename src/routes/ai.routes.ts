import { Router } from "express";
import { queryAI } from "../controllers/ai.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

router.post("/ai/query", requireFirebaseAuth, queryAI);

export default router;
