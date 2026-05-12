import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { AggregatedTraffic } from "../types/traffic";
import { saveAggregatedTraffic, getLatestAggregatedTraffic } from "../services/traffic.service";

// =========================
// RECEIVE TRAFFIC DATA FROM PYTHON SCRIPT
// =========================
export const receiveTrafficData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { numDevices, totalBandwidth, avgBandwidth, timestamp } = req.body;

    // Validate input
    if (typeof numDevices !== 'number' || typeof totalBandwidth !== 'number' || typeof avgBandwidth !== 'number') {
      return res.status(400).json({
        message: "Invalid data: numDevices, totalBandwidth, and avgBandwidth must be numbers",
      });
    }

    const trafficData: AggregatedTraffic = {
      numDevices,
      totalBandwidth,
      avgBandwidth,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    const docId = await saveAggregatedTraffic(trafficData);

    return res.status(201).json({
      message: "Traffic data saved successfully",
      id: docId,
    });
  } catch (error) {
    console.error("receiveTrafficData error:", error);
    return res.status(500).json({
      message: "Failed to save traffic data",
    });
  }
};

// =========================
// GET LATEST TRAFFIC DATA FOR FRONTEND
// =========================
export const getLatestTraffic = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const latestTraffic = await getLatestAggregatedTraffic();

    if (!latestTraffic) {
      return res.status(404).json({
        message: "No traffic data found",
      });
    }

    return res.status(200).json({
      traffic: latestTraffic,
    });
  } catch (error) {
    console.error("getLatestTraffic error:", error);
    return res.status(500).json({
      message: "Failed to fetch traffic data",
    });
  }
};