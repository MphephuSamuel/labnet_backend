import admin from "firebase-admin";
import { Bandwidth } from "../types/bandwidth";

const db = admin.firestore();
const bandwidthRef = db.collection("bandwidth");

// CREATE
export const createBandwidth = async (data: Bandwidth) => {
  const doc = await bandwidthRef.add(data);
  return { id: doc.id, ...data };
};

// GET ALL
export const getAllBandwidth = async () => {
  const snapshot = await bandwidthRef.orderBy("createdAt", "desc").get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// GET BY RANGE (Day/Week/Month/Year)
export const getBandwidthByRange = async (range: string) => {
  const snapshot = await bandwidthRef
    .where("range", "==", range)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// STATS (for frontend KPI cards)
export const getBandwidthStats = async () => {
  const snapshot = await bandwidthRef.get();

  let total = 0;
  let count = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    total += data.totalUsage || 0;
    count++;
  });

  return {
    avgBandwidth: count ? total / count : 0,
    totalRecords: count,
  };
};