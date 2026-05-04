import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { TrafficPayload, DeviceTrafficInfo } from "../types/traffic";

// POST /api/traffic
export const ingestTraffic = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { ip, macHash, bytesSent, bytesReceived }: TrafficPayload = req.body;
    const user = req.user;
    
    console.log("Received traffic data:", { ip, macHash, bytesSent, bytesReceived }, "from user:", user?.uid);

    // Validate input
    if (!ip || !macHash || typeof bytesSent !== 'number' || typeof bytesReceived !== 'number') {
      res.status(400).json({ error: "Invalid traffic data: ip, macHash, bytesSent, and bytesReceived are required" });
      return;
    }

    if (bytesSent < 0 || bytesReceived < 0) {
      res.status(400).json({ error: "bytesSent and bytesReceived must be non-negative numbers" });
      return;
    }

    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const deviceRef = db.collection("devices").doc(macHash);

    // Ensure device exists
    await deviceRef.set(
      {
        ip,
        macHash,
        lastSeen: new Date(),
        createdAt: new Date(),
      },
      { merge: true }
    );

    // Store traffic
    await deviceRef.collection("traffic").add({
      bytesSent,
      bytesReceived,
      timestamp: new Date(),
    });

    // Run anomaly detection
   // await detectAnomaly(macHash);

    res.status(200).json({ message: "Traffic recorded" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/traffic/current
export const getCurrentBandwidth = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    console.log("Getting current bandwidth for user:", user?.uid);
    
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const devicesSnap = await db.collection("devices").get();

    const results: DeviceTrafficInfo[] = [];

    for (const doc of devicesSnap.docs) {
      const trafficSnap = await doc.ref
        .collection("traffic")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

      if (!trafficSnap.empty) {
        const latest = trafficSnap.docs[0].data();
        const deviceData = doc.data();

        results.push({
          deviceId: doc.id,
          ip: deviceData.ip || '',
          bytesSent: latest.bytesSent,
          bytesReceived: latest.bytesReceived,
          timestamp: latest.timestamp,
        });
      }
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};