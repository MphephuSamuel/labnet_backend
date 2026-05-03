import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";

export const addDevice = (req: AuthenticatedRequest, res: Response) => {
  const device = req.body;
  const user = req.user;
  console.log("Received device:", device, "from user:", user?.uid);
  res.json({
    message: "Device received successfully",
    device,
    user,
  });
};

// Return a sample list of devices (protected)
export const getDevices = (req: AuthenticatedRequest, res: Response) => {
  res.json({
    devices: [
      { id: 1, name: "Device A", status: "online" },
      { id: 2, name: "Device B", status: "offline" },
    ],
  });
};
