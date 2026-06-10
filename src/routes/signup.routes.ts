import { Router } from "express";
import { signup } from "../controllers/signup.controller";
import { getUsers } from "../controllers/user.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

// No authentication required
router.post("/users/signup", signup);

// Requires Firebase authentication
router.get("/users", requireFirebaseAuth, getUsers);

export default router;
