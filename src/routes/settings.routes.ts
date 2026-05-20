import { Router } from "express";
import {
  getSettings,
  updateSettings,
  updateSecuritySettings,
  updateNotificationSettings,
  updateProfile,
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist
} from "../controllers/settings.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

// Settings endpoints
router.get("/settings", requireFirebaseAuth, getSettings);
router.put("/settings", requireFirebaseAuth, updateSettings);
router.put("/settings/security", requireFirebaseAuth, updateSecuritySettings);
router.put("/settings/notifications", requireFirebaseAuth, updateNotificationSettings);

// Profile endpoint
router.put("/profile", requireFirebaseAuth, updateProfile);

// Whitelist endpoints
router.get("/whitelist", requireFirebaseAuth, getWhitelist);
router.post("/whitelist", requireFirebaseAuth, addToWhitelist);
router.delete("/whitelist/:id", requireFirebaseAuth, removeFromWhitelist);

export default router;
