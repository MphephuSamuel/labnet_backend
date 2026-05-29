import { NextFunction, Response } from "express";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { AuthenticatedRequest } from "../types/auth-request";

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Firebase token" });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const admin = initializeFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
    };

    return next();
  } catch {
    return res
      .status(401)
      .json({ message: "Invalid or expired Firebase token" });
  }
}
