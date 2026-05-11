import { Request, Response } from "express";
import { alertService } from "../services/alert.service";
import { Alert } from "../types/alert";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs
import { CreateAlert } from "../types/alert";

// Add an alert
export const addAlert = async (req: Request, res: Response) => {
  const { type, deviceId, createdAt, description, hostName, severity } =
    req.body as CreateAlert;

  if (
    !type ||
    !deviceId ||
    !createdAt ||
    !description ||
    !hostName ||
    !severity
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const newAlert: Alert = {
    id: uuidv4(),
    type,
    deviceId,
    createdAt: new Date(createdAt),
    description,
    hostName,
    severity,
  };

  const alert = await alertService.addAlert(newAlert);
  res.status(201).json(alert);
};

// Retrieve all alerts
export const getAlerts = async (req: Request, res: Response) => {
  try {
    const alerts = await alertService.getAlerts(); // Await the service call
    res.status(200).json(alerts); // Send the alerts as a JSON array
  } catch (error) {
    console.error("Error retrieving alerts:", error);
    res.status(500).json({ error: "Failed to retrieve alerts" });
  }
};
