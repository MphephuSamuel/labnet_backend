import { Router } from "express";
import { 
  createAnomalyController, 
  getAnomalies,
  deleteAnomaly,
  updateAnomaly
} from "../controllers/anomaly.controller";
import { requireFirebaseAuth } from "../middleware/require-firebase-auth";

const router = Router();

router.post("/", requireFirebaseAuth, createAnomalyController);
router.get("/", requireFirebaseAuth, getAnomalies);
router.delete("/:id", requireFirebaseAuth, deleteAnomaly);
router.put("/:id", requireFirebaseAuth, updateAnomaly);

export default router;