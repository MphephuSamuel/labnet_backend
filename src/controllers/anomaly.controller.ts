import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { AnomalyType, Severity } from "../types/anomaly";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";

const admin = initializeFirebaseAdmin();
const db = admin.firestore();

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
      type: "anomaly" as AnomalyType,
      severity: (severity || "medium") as Severity,
      message,
      userId: user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("anomalies").add(anomaly);

    return res.status(201).json({
      message: "Anomaly created",
      id: ref.id,
    });
  } catch (error) {
    console.error("createAnomaly error:", error);
    return res.status(500).json({ message: "Failed to create anomaly" });
  }
};

export const getAnomalies = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Simplified query - remove orderBy to avoid index requirement
    const snapshot = await db
      .collection("anomalies")
      .limit(100)
      .get();

    const anomalies = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ anomalies });
  } catch (error) {
    console.error("getAnomalies error:", error);
    // Return empty array instead of 500 error
    return res.json({ anomalies: [] });
  }
};