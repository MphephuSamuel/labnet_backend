import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import admin, { db } from '../utils/firebase-admin';

const SETTINGS_PATH = path.join(__dirname, '../../settings.json');

function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { anomalyDetection: false };
  }
  const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
  return JSON.parse(data);
}

function writeSettings(settings: any) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export const updateAnomalyDetection = (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ message: 'Missing or invalid "enabled" boolean in body.' });
  }
  const settings = readSettings();
  settings.anomalyDetection = enabled;
  writeSettings(settings);
  return res.json({ message: `Anomaly detection set to ${enabled}` });
};

export const getAnomalyDetection = (req: Request, res: Response) => {
  const settings = readSettings();
  return res.json({ anomalyDetection: settings.anomalyDetection });
};

export const updateDetectionSensitivity = async (
  req: Request,
  res: Response
) => {

  try {

    const { level } = req.body;

    // Allowed values
    const allowedLevels = [
      'low',
      'medium',
      'high',
    ];

    // Validation
    if (!allowedLevels.includes(level)) {

      return res.status(400).json({
        success: false,
        error: 'Invalid sensitivity level',
      });

    }

    // Save to Firestore
    await db
      .collection('settings')
      .doc('main')
      .set(
        {
          detection_sensitivity: level,
        },
        { merge: true }
      );

    res.json({
      success: true,
      detection_sensitivity: level,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: 'Server error',
    });

  }
};

export const getDetectionSensitivity = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection('settings').doc('main').get();
    const data = doc.data() as { detection_sensitivity?: unknown } | undefined;

    const level = data?.detection_sensitivity;
    if (level !== 'low' && level !== 'medium' && level !== 'high') {
      return res.json({
        success: true,
        detection_sensitivity: 'medium',
      });
    }

    return res.json({
      success: true,
      detection_sensitivity: level,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

export const updateAutoBlockThreats = async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;

    // Validation
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Enabled must be true or false',
      });
    }

    // Save to Firestore
    await db
      .collection('settings')
      .doc('main')
      .set(
        {
          auto_block_threats: enabled,
        },
        { merge: true }
      );

    return res.json({
      success: true,
      auto_block_threats: enabled,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

export const getAutoBlockThreats = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection('settings').doc('main').get();
    const data = doc.data() as { auto_block_threats?: unknown } | undefined;

    const enabled = data?.auto_block_threats;
    if (typeof enabled !== 'boolean') {
      return res.json({
        success: true,
        auto_block_threats: false,
      });
    }

    return res.json({
      success: true,
      auto_block_threats: enabled,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

export const isValidCIDR = (cidr: string): boolean => {
  const regex =
    /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\/(?:[0-9]|[12]\d|3[0-2])$/;
  return regex.test(cidr);
};

type Whitelist = {
  ipRanges: string[];
  macAddresses?: string[];
};

const SECURITY_SETTINGS_DOC = db.collection('settings').doc('security');

export const getWhitelist = async (req: Request, res: Response) => {
  try {
    const snap = await SECURITY_SETTINGS_DOC.get();
    const data = snap.data() as { whitelist?: unknown } | undefined;
    const whitelist = (data?.whitelist ?? null) as Whitelist | null;

    return res.json({
      success: true,
      whitelist: whitelist ?? { ipRanges: [] },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

export const addIpRange = async (req: Request, res: Response) => {
  try {
    const { ipRange } = req.body as { ipRange?: unknown };
    if (typeof ipRange !== 'string' || !isValidCIDR(ipRange)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CIDR ipRange',
      });
    }

    const snap = await SECURITY_SETTINGS_DOC.get();
    const data = snap.data() as { whitelist?: Whitelist } | undefined;
    const currentWhitelist: Whitelist = data?.whitelist ?? { ipRanges: [] };
    const currentRanges = Array.isArray(currentWhitelist.ipRanges)
      ? currentWhitelist.ipRanges
      : [];

    const updatedRanges = Array.from(new Set([...currentRanges, ipRange]));
    const updatedWhitelist: Whitelist = {
      ...currentWhitelist,
      ipRanges: updatedRanges,
    };

    await SECURITY_SETTINGS_DOC.set(
      {
        whitelist: updatedWhitelist,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({
      success: true,
      whitelist: updatedWhitelist,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

export const removeIpRange = async (req: Request, res: Response) => {
  try {
    const { ipRange } = req.body as { ipRange?: unknown };
    if (typeof ipRange !== 'string' || !isValidCIDR(ipRange)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CIDR ipRange',
      });
    }

    const snap = await SECURITY_SETTINGS_DOC.get();
    const data = snap.data() as { whitelist?: Whitelist } | undefined;
    const currentWhitelist: Whitelist = data?.whitelist ?? { ipRanges: [] };
    const currentRanges = Array.isArray(currentWhitelist.ipRanges)
      ? currentWhitelist.ipRanges
      : [];

    const updatedRanges = currentRanges.filter((ip) => ip !== ipRange);
    const updatedWhitelist: Whitelist = {
      ...currentWhitelist,
      ipRanges: updatedRanges,
    };

    await SECURITY_SETTINGS_DOC.set(
      {
        whitelist: updatedWhitelist,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({
      success: true,
      whitelist: updatedWhitelist,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};
