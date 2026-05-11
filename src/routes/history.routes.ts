import { Router } from "express";
import { addHistory, fetchHistory } from "../controllers/history.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

router.get("/", requireFirebaseAuth, fetchHistory);
router.post("/", requireFirebaseAuth, addHistory);

export default router;