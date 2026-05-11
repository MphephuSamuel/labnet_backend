import admin from "firebase-admin";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { AggregatedTraffic } from "../types/traffic";

function getFirebaseAdmin() {
  return initializeFirebaseAdmin();
}

// Save aggregated traffic data to Firestore
export async function saveAggregatedTraffic(traffic: AggregatedTraffic): Promise<string> {
  const adminClient = getFirebaseAdmin();
  const db = admin.firestore();

  const docRef = await db.collection("aggregatedTraffic").add({
    ...traffic,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

// Get the latest aggregated traffic data from Firestore
export async function getLatestAggregatedTraffic(): Promise<AggregatedTraffic | null> {
  const adminClient = getFirebaseAdmin();
  const db = admin.firestore();

  const snapshot = await db.collection("aggregatedTraffic")
    .orderBy("timestamp", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return doc.data() as AggregatedTraffic;
}