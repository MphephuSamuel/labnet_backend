import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { Anomaly } from "../types/anomaly";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

const admin = initializeFirebaseAdmin();
const db = admin.firestore();

// CREATE anomaly in Firestore
export const createAnomaly = async (data: Omit<Anomaly, "id" | "createdAt">) => {
  const ref = db.collection("anomalies").doc();

  const anomaly: Anomaly = {
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await ref.set(anomaly);

  return ref.id;
};