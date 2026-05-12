import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { createAnomaly } from "../services/anomaly.service";
import { AnomalyType, Severity } from "../types/anomaly";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";

const admin = initializeFirebaseAdmin();
const db = admin.firestore();

// CREATE ANOMALY
export const createAnomalyController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { deviceId, deviceType, hostName, ip, message, severity } = req.body;

    const anomaly = {
      deviceId,
      deviceType,
      hostName,
      ip,

      type: "anomaly" as AnomalyType, // IMPORTANT FIX
      severity: (severity || "medium") as Severity,

      message,
      userId: user.uid,
    };

    const id = await createAnomaly(anomaly);

    return res.status(201).json({
      message: "Anomaly created",
      id,
    });
  } catch (error) {
    console.error("createAnomaly error:", error);
    return res.status(500).json({ message: "Failed to create anomaly" });
  }
};

// GET ANOMALIES
export const getAnomalies = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const snapshot = await db
      .collection("anomalies")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

<<<<<<< HEAD
    const anomalies = snapshot.docs.map((doc: any) => ({
  id: doc.id,
  ...doc.data(),
}));
=======
    const anomalies = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));
>>>>>>> 43f2a2d2c360f29b05025e68e7c5d9b10da7f006

    return res.json({ anomalies });
  } catch (error) {
    console.error("getAnomalies error:", error);
    return res.status(500).json({ message: "Failed to fetch anomalies" });
  }
};
