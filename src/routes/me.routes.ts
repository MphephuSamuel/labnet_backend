import { Router } from "express";
import { getMe } from "../controllers/me.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

router.get("/me", requireFirebaseAuth, getMe);

export default router;
