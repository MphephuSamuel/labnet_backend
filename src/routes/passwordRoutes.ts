import { Router } from "express";
import {
  changePasswordHandler,
  requestPasswordResetHandler,
} from "../controllers/password.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

router.post("/users/password/forgot", requestPasswordResetHandler);
router.put("/users/me/password", requireFirebaseAuth, changePasswordHandler);

export default router;
