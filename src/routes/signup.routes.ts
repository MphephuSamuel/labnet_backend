import { Router } from "express";
import { signup } from "../controllers/signup.controller";

const router = Router();

// No authentication required
router.post("/users/signup", signup);

export default router;
