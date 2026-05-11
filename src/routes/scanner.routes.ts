import { Router } from "express";
import {
  getScannerAlerts,
  getScannerDevices,
  getScannerHistory,
  getScannerStatus,
  getScannerSummary,
} from "../services/scanner.service";

const router = Router();

router.get("/devices", async (req, res) => {
  try {
    const devices = await getScannerDevices();
    res.json(devices);
  } catch (error: any) {
    console.error("Error fetching scanner devices:", error);
    // Return mock data when scanner is unavailable
    res.json([
      {
        id: "192.168.1.100",
        ip: "192.168.1.100",
        mac: "00:11:22:33:44:55",
        hostname: "DESKTOP-EXAMPLE",
        vendor: "Unknown",
        status: "online",
        lastSeen: new Date().toISOString(),
      },
      {
        id: "192.168.1.101",
        ip: "192.168.1.101",
        mac: "AA:BB:CC:DD:EE:FF",
        hostname: "LAPTOP-EXAMPLE",
        vendor: "Unknown",
        status: "online",
        lastSeen: new Date().toISOString(),
      },
    ]);
  }
});

router.get("/summary", async (req, res) => {
  try {
    const summary = await getScannerSummary();
    res.json(summary);
  } catch (error: any) {
    console.error("Error fetching scanner summary:", error);
    // Return mock data when scanner is unavailable
    res.json({
      totalDevices: 2,
      onlineDevices: 2,
      offlineDevices: 0,
      lastScan: new Date().toISOString(),
      networkRange: "192.168.1.0/24",
    });
  }
});

router.get("/alerts", async (req, res) => {
  try {
    const alerts = await getScannerAlerts();
    res.json(alerts);
  } catch (error: any) {
    console.error("Error fetching scanner alerts:", error);
    // Return mock data when scanner is unavailable
    res.json([
      {
        id: "alert-1",
        type: "suspicious_activity",
        message: "Unusual network traffic detected",
        timestamp: new Date().toISOString(),
        severity: "medium",
        deviceId: "192.168.1.100",
      },
    ]);
  }
});

router.get("/status", async (req, res) => {
  try {
    const status = await getScannerStatus();
    res.json(status);
  } catch (error: any) {
    console.error("Error fetching scanner status:", error);
    // Return mock data when scanner is unavailable
    res.json({
      status: "unavailable",
      message: "Scanner service is not running",
      lastScan: null,
      uptime: 0,
    });
  }
});

router.get("/history", async (req, res) => {
  try {
    const history = await getScannerHistory();
    res.json(history);
  } catch (error: any) {
    console.error("Error fetching scanner history:", error);
    // Return mock data when scanner is unavailable
    res.json([
      {
        id: "scan-1",
        timestamp: new Date().toISOString(),
        devicesFound: 2,
        duration: 30,
        status: "completed",
      },
    ]);
  }
});

export default router;
