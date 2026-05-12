import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { saveHistory, getHistory } from "../services/history.service";

export const addHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;

    const { deviceType, hostName, ip, title, type } = req.body;

    const id = await saveHistory({
      deviceType,
      hostName,
      ip,
      title,
      type,
    });

    return res.status(201).json({
      message: "History saved",
      id,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to save history",
    });
  }
};

export const fetchHistory = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const data = await getHistory();

    return res.json({ history: data });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch history",
    });
  }
};
