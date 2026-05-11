import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { Session } from "../types/device";
import { saveSession, getAllSessions, getSessionsByDeviceId } from "../services/device.service";

export const addSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session: Session = req.body;
    const user = req.user;
    console.log("Received session:", session, "from user:", user?.uid);

    const sessionId = await saveSession(session);

    res.json({
      message: "Session saved successfully",
      sessionId,
      session,
      user,
    });
  } catch (error) {
    console.error("Error saving session:", error);
    res.status(500).json({
      message: "Failed to save session",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Return all sessions
export const getSessions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessions = await getAllSessions();
    res.json({
      sessions,
    });
  } catch (error) {
    console.error("Error retrieving sessions:", error);
    res.status(500).json({
      message: "Failed to retrieve sessions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Return sessions by deviceId
export const getSessionsByDevice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawDeviceId = req.params.deviceId;
const deviceId = Array.isArray(rawDeviceId)
  ? rawDeviceId[0]
  : rawDeviceId;
    if (!deviceId) {
      return res.status(400).json({ message: "Device ID is required" });
    }

    const sessions = await getSessionsByDeviceId(deviceId);
    res.json({
      sessions,
    });
  } catch (error) {
    console.error("Error retrieving sessions for device:", error);
    res.status(500).json({
      message: "Failed to retrieve sessions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};