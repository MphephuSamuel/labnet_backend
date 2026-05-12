import { Request, Response } from "express";
import * as bandwidthService from "../services/bandwidth.service";

// CREATE
export const createBandwidth = async (req: Request, res: Response) => {
  try {
    const data = await bandwidthService.createBandwidth(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: "Failed to create bandwidth record" });
  }
};

// GET ALL
export const getAllBandwidth = async (_req: Request, res: Response) => {
  try {
    const data = await bandwidthService.getAllBandwidth();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bandwidth data" });
  }
};

// RANGE
export const getBandwidthByRange = async (req: Request, res: Response) => {
  try {
    const range = Array.isArray(req.params.range)
  ? req.params.range[0]
  : req.params.range;
    const data = await bandwidthService.getBandwidthByRange(range);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bandwidth range data" });
  }
};

// STATS
export const getBandwidthStats = async (_req: Request, res: Response) => {
  try {
    const stats = await bandwidthService.getBandwidthStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bandwidth stats" });
  }
};