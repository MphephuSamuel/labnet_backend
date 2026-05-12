import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { Threat } from "../types/threat";

const admin = initializeFirebaseAdmin();
const db = admin.firestore();

export const createThreat = async (threat: Threat) => {
  const ref = await db.collection("threats").add({
    ...threat,
    createdAt: new Date(),
  });

  return ref.id;
};

export const getThreatsByUser = async (userId: string) => {
  const snapshot = await db
    .collection("threats")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  }));
};