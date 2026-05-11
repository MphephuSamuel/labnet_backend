import { initializeFirebaseAdmin } from "../utils/firebase-admin";

export async function saveHistory(data: any) {
  const admin = initializeFirebaseAdmin();
  const db = admin.firestore();
  const ref = await db.collection("history").add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return ref.id;
}

export async function getHistory() {
  const admin = initializeFirebaseAdmin();
  const db = admin.firestore();
  const snapshot = await db.collection("history").orderBy("createdAt", "desc").get();

  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  }));
}