import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";

// GET /me - return authenticated user's profile
export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "User profile not found" });
    }
    return res.json({ profile: doc.data() });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch profile" });
  }
};
