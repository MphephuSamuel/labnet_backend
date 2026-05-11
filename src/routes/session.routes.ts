import { Router } from "express";
import { addSession, getSessions, getSessionsByDevice } from "../controllers/session.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

// Protected: Get all sessions
router.get("/", requireFirebaseAuth, getSessions);

// Protected: Get sessions by device ID
router.get("/device/:deviceId", requireFirebaseAuth, getSessionsByDevice);

// Protected: Add session
router.post("/", requireFirebaseAuth, addSession);

export default router;