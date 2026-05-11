import { Request, Response } from "express";
import { alertService } from "../services/alert.service";
import { Alert } from "../types/alert";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs
import { CreateAlert } from "../types/alert";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";

// Define AuthenticatedRequest as a temporary type alias
export type AuthenticatedRequest = Request & {
  user?: {
    uid: string;
    email?: string;
    [key: string]: any;
  };
};

// Add an alert
export const addAlert = async (req: Request, res: Response) => {
  const { type, deviceId, createdAt, description, hostName, severity } =
    req.body as CreateAlert;

  if (
    !type ||
    !deviceId ||
    !createdAt ||
    !description ||
    !hostName ||
    !severity
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const newAlert: Alert = {
    id: uuidv4(),
    type,
    deviceId,
    createdAt: new Date(createdAt),
    description,
    hostName,
    severity,
  };

  const alert = await alertService.addAlert(newAlert);
  res.status(201).json(alert);
};

// Retrieve all alerts for authenticated user
export const getAlerts = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const alertsSnapshot = await db
      .collection("alerts")
      .where("userId", "==", user.uid)
      .get();

    const alerts = alertsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return res.status(200).json(alerts);
  } catch (error) {
    console.error("Error retrieving alerts:", error);
    return res.status(500).json({ error: "Failed to retrieve alerts" });
  }
};
