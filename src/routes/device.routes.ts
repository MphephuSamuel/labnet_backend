import { Router } from "express";
import { addDevice, getDevices } from "../controllers/device.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

// Protected: Get devices
router.get("/", requireFirebaseAuth, getDevices);

// Protected: Add device
router.post("/", requireFirebaseAuth, addDevice);

export default router;
