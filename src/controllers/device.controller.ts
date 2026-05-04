import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";

// Protected: Add device
export const addDevice = async (req: AuthenticatedRequest, res: Response) => {
  const device = req.body;
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const deviceRef = db.collection("devices").doc(); // Auto-generate ID
    await deviceRef.set({
      ...device,
      userId: user.uid,
      createdAt: new Date(),
    });
    return res.json({
      message: "Device added successfully",
      deviceId: deviceRef.id,
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to add device" });
  }
};

// Return list of devices for the authenticated user (protected)
export const getDevices = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const snapshot = await db.collection("devices").where("userId", "==", user.uid).get();
    const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json({ devices });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch devices" });
  }
};

// GET /devices/:id - return device details
export const getDevice = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const doc = await db.collection("devices").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Device not found" });
    }
    const deviceData = doc.data();
    // Check if the device belongs to the user
    if (deviceData?.userId !== user.uid) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.json({ device: { id, ...deviceData } });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch device" });
  }
};
