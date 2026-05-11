import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import admin from "../utils/firebase-admin";

// =========================
// ADD DEVICE (CREATE)
// =========================
export const addDevice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceType, deviceName, ip, mac, bandwidth, status } = req.body;

    const user = req.user;
    const db = admin.firestore();

    const deviceData = {
      deviceType,
      deviceName,
      ip,
      mac,
      bandwidth,
      status,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      userId: user?.uid,
    };

    const docRef = await db.collection("devices").add(deviceData);

    return res.status(201).json({
      message: "Device saved successfully",
      deviceId: docRef.id,
      device: deviceData,
    });
  } catch (error) {
    console.error("addDevice error:", error);
    return res.status(500).json({
      message: "Failed to save device",
    });
  }
};

// =========================
// GET ALL DEVICES FOR AUTHENTICATED USER
// =========================
export const getDevices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = admin.firestore();

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const snapshot = await db
      .collection("devices")
      .where("userId", "==", user.uid)
      .get();

    const devices: any[] = [];

    snapshot.forEach((doc) => {
      devices.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.json({
      devices,
    });
  } catch (error) {
    console.error("getDevices error:", error);
    return res.status(500).json({
      message: "Failed to fetch devices",
    });
  }
};
