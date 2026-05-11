import admin from "firebase-admin";

const db = admin.firestore();

export async function saveHistory(data: any) {
  const ref = await db.collection("history").add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return ref.id;
}

export async function getHistory() {
  const snapshot = await db.collection("history").orderBy("createdAt", "desc").get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}