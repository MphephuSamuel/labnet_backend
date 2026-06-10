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

    const docRef = await db.collection("anomalies").add(anomaly);
    
    console.log(`✅ Anomaly created for user ${user.uid}: ${message}`);

    return res.status(201).json({
      message: "Anomaly created",
      id: docRef.id,
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

    console.log(`📊 Fetching ALL anomalies (no user filter)`);

    // Get ALL anomalies without user filter
    const snapshot = await db
      .collection("anomalies")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const anomalies = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`📊 Found ${anomalies.length} anomalies total`);
    return res.json({ anomalies });
    
  } catch (error) {
    console.error("getAnomalies error:", error);
    
    // Fallback: without orderBy
    try {
      const snapshot = await db
        .collection("anomalies")
        .limit(100)
        .get();

      const anomalies = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(`📊 Found ${anomalies.length} anomalies total (fallback query)`);
      return res.json({ anomalies });
      
    } catch (fallbackError) {
      console.error("getAnomalies fallback error:", fallbackError);
      return res.json({ anomalies: [] });
    }
  }
};

export const deleteAnomaly = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const anomalyDoc = await db.collection("anomalies").doc(id).get();
    
    if (!anomalyDoc.exists) {
      return res.status(404).json({ message: "Anomaly not found" });
    }
    
    const anomalyData = anomalyDoc.data();
    
    // Check ownership for deletion
    if (anomalyData?.userId !== user.uid) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    await db.collection("anomalies").doc(id).delete();
    
    console.log(`✅ Anomaly ${id} deleted for user ${user.uid}`);
    
    return res.json({ message: "Anomaly deleted successfully" });
  } catch (error) {
    console.error("deleteAnomaly error:", error);
    return res.status(500).json({ message: "Failed to delete anomaly" });
  }
};

export const updateAnomaly = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, resolution } = req.body;
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const anomalyDoc = await db.collection("anomalies").doc(id).get();
    
    if (!anomalyDoc.exists) {
      return res.status(404).json({ message: "Anomaly not found" });
    }
    
    const anomalyData = anomalyDoc.data();
    
    // Check ownership for update
    if (anomalyData?.userId !== user.uid) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    if (status) updateData.status = status;
    if (resolution) updateData.resolution = resolution;
    
    await db.collection("anomalies").doc(id).update(updateData);
    
    console.log(`✅ Anomaly ${id} updated for user ${user.uid}`);
    
    return res.json({ message: "Anomaly updated successfully" });
  } catch (error) {
    console.error("updateAnomaly error:", error);
    return res.status(500).json({ message: "Failed to update anomaly" });
  }
};