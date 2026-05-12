import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { createThreat, getThreatsByUser } from "../services/threat.service";
import { Threat } from "../types/threat";

export const createThreatController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { deviceId, deviceType, hostName, ip, message, severity } = req.body;

    const threat: Threat = {
      deviceId,
      deviceType,
      hostName,
      ip,
      type: "threat",
      severity: severity || "medium",
      message,
      userId: user.uid,
    };

    const id = await createThreat(threat);

    return res.status(201).json({
      message: "Threat created",
      id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create threat" });
  }
};

export const getThreats = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const threats = await getThreatsByUser(user.uid);

    return res.json({ threats });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch threats" });
  }
};