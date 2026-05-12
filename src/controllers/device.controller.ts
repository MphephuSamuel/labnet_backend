import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { saveHistory } from "../services/history.service";

// =========================
// ADD DEVICE (CREATE)
// =========================
export const addDevice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceType, deviceName, ip, mac, bandwidth, status } = req.body;

    const user = req.user;

    const admin = initializeFirebaseAdmin();
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
    };

    // Check if a device with the same MAC already exists
    const existingDevice = await db.collection("devices").doc(mac).get();
    if (existingDevice.exists) {
      return res.status(400).json({
        message: "A device with this MAC address already exists.",
      });
    }

    // Use the MAC address as the document ID
    await db.collection("devices").doc(mac).set(deviceData);

    return res.status(201).json({
      message: "Device saved successfully",
      deviceId: mac,
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
    const admin = initializeFirebaseAdmin();
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

    snapshot.forEach((doc: any) => {
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

// =========================
// SYNC DEVICES
// =========================
export const syncDevices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const devices = req.body.devices; // Expecting an array of devices

    if (!Array.isArray(devices)) {
      return res.status(400).json({
        message: "Invalid devices format. Expected an array.",
      });
    }

    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();

    const batch = db.batch();
    const newDevices = [];

    for (const device of devices) {
      const { ip, mac, hostname, type, bandwidth, status } = device;

      const deviceRef = db.collection("devices").doc(mac);
      const existingDevice = await deviceRef.get();

      if (!existingDevice.exists) {
        const deviceData = {
          ip,
          mac,
          hostname: hostname || "N/A",
          type: type || "Unknown",
          bandwidth: bandwidth || 0,
          status: status || "inactive",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        };

        batch.set(deviceRef, deviceData);
        newDevices.push(deviceData);

        // Record history for the new device connection
        await saveHistory({
          type: "connection",
          title: "New Device Connected",
          deviceType: deviceData.type,
          hostName: deviceData.hostname,
          ip: deviceData.ip,
        });
      }
    }

    await batch.commit();

    return res.status(201).json({
      message: "Devices synced successfully",
      newDevices,
    });
  } catch (error) {
    console.error("syncDevices error:", error);
    return res.status(500).json({
      message: "Failed to sync devices",
    });
  }
};
