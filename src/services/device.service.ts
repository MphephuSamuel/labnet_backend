import admin from "firebase-admin";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { Device, Session } from "../types/device";

function getFirebaseAdmin() {
  return initializeFirebaseAdmin();
}

// Save device to Firestore
export async function saveDevice(device: Device): Promise<string> {
  const adminClient = getFirebaseAdmin();
  const db = admin.firestore();

  const docRef = await db.collection("devices").add({
    ...device,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

// Get all devices from Firestore
export async function getAllDevices(): Promise<Device[]> {
  const adminClient = getFirebaseAdmin();
  const db = admin.firestore();

  const snapshot = await db.collection("devices").get();
  const devices: Device[] = [];
  snapshot.forEach((doc) => {
    devices.push(doc.data() as Device);
  });

  return devices;
}

// Save session to Firestore
export async function saveSession(session: Session): Promise<string> {
  const adminClient = getFirebaseAdmin();
  const db = admin.firestore();

  const docRef = await db.collection("sessions").add({
    ...session,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

// Get sessions by deviceId from Firestore
export async function getSessionsByDeviceId(deviceId: string): Promise<Session[]> {
  const adminClient = getFirebaseAdmin();
  const db = admin.firestore();

  const snapshot = await db.collection("sessions").where("deviceId", "==", deviceId).get();
  const sessions: Session[] = [];
  snapshot.forEach((doc) => {
    sessions.push(doc.data() as Session);
  });

  return sessions;
}

// Get all sessions from Firestore
export async function getAllSessions(): Promise<Session[]> {
  const adminClient = getFirebaseAdmin();
  const db = admin.firestore();

  const snapshot = await db.collection("sessions").get();
  const sessions: Session[] = [];
  snapshot.forEach((doc) => {
    sessions.push(doc.data() as Session);
  });

  return sessions;
}