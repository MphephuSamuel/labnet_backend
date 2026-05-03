import { Router } from "express";
import { addDevice } from "../controllers/device.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

router.post("/", requireFirebaseAuth, addDevice);

export default router;
