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
    res.status(502).json({ error: "Scanner service unavailable", detail: error?.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const summary = await getScannerSummary();
    res.json(summary);
  } catch (error: any) {
    console.error("Error fetching scanner summary:", error);
    res.status(502).json({ error: "Scanner service unavailable", detail: error?.message });
  }
});

router.get("/alerts", async (req, res) => {
  try {
    const alerts = await getScannerAlerts();
    res.json(alerts);
  } catch (error: any) {
    console.error("Error fetching scanner alerts:", error);
    res.status(502).json({ error: "Scanner service unavailable", detail: error?.message });
  }
});

router.get("/status", async (req, res) => {
  try {
    const status = await getScannerStatus();
    res.json(status);
  } catch (error: any) {
    console.error("Error fetching scanner status:", error);
    res.status(502).json({ error: "Scanner service unavailable", detail: error?.message });
  }
});

router.get("/history", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  try {
    const history = await getScannerHistory(query);
    res.json(history);
  } catch (error: any) {
    console.error("Error fetching scanner history:", error);
    res.status(502).json({ error: "Scanner service unavailable", detail: error?.message });
  }
});

export default router;
