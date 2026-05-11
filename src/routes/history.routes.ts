import { Router } from "express";
import { addHistory, fetchHistory } from "../controllers/history.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

router.get("/history", requireFirebaseAuth, fetchHistory);
router.post("/history", requireFirebaseAuth, addHistory);

export default router;
