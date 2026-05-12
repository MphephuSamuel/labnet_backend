import { Router } from "express";
import {
  addDevice,
  getDevices,
  syncDevices,
} from "../controllers/device.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

// Route to add a device (protected)
router.post("/devices", requireFirebaseAuth, addDevice);

// Route to get all devices (protected)
router.get("/devices", requireFirebaseAuth, getDevices);

// Sync devices
router.post("/devices/sync", syncDevices);

export default router;
