import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { Settings, SecuritySettings, NotificationSettings, Whitelist, UserProfile, WhitelistItem } from "../types/settings";

// GET /api/users/me/settings - load current user's settings
export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const doc = await db.collection("users").doc(user.uid).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const userData = doc.data();
    const settings = userData?.settings || {
      biometricEnabled: true,
      themeMode: "dark",
      security: {
        anomalyDetectionEnabled: true,
        detectionSensitivity: 0.5,
        autoBlockThreats: false,
        simulationMode: false
      },
      notifications: {
        emailAlerts: true,
        pushNotifications: true
      }
    };

    return res.json({ settings });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to fetch settings" });
  }
};

// PUT /api/users/me/settings - save full settings object
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const settings: Settings = req.body;
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();

    await db.collection("users").doc(user.uid).set(
      {
        settings,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return res.json({ message: "Settings updated successfully", settings });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to update settings" });
  }
};

// PUT /api/users/me/settings/security - update security settings
export const updateSecuritySettings = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const securitySettings: SecuritySettings = req.body;
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();

    await db.collection("users").doc(user.uid).set(
      {
        "settings.security": securitySettings,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return res.json({ message: "Security settings updated successfully", securitySettings });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to update security settings" });
  }
};

// PUT /api/users/me/settings/notifications - update notification settings
export const updateNotificationSettings = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const notificationSettings: NotificationSettings = req.body;
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();

    await db.collection("users").doc(user.uid).set(
      {
        "settings.notifications": notificationSettings,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return res.json({ message: "Notification settings updated successfully", notificationSettings });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to update notification settings" });
  }
};

// PUT /api/users/me/profile - update profile information
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const profile: UserProfile = req.body;
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();

    await db.collection("users").doc(user.uid).set(
      {
        ...profile,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return res.json({ message: "Profile updated successfully", profile });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to update profile" });
  }
};

// GET /api/users/me/whitelist - load trusted IPs and MACs
export const getWhitelist = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const doc = await db.collection("users").doc(user.uid).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const userData = doc.data();
    const whitelist = userData?.whitelist || {
      trustedIpRanges: [],
      trustedMacAddresses: []
    };

    return res.json({ whitelist });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to fetch whitelist" });
  }
};

// POST /api/users/me/whitelist - add an item to whitelist
export const addToWhitelist = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { type, value, description } = req.body;
    
    if (!type || !value) {
      return res.status(400).json({ message: "Type and value are required" });
    }

    if (type !== "ip" && type !== "mac") {
      return res.status(400).json({ message: "Type must be 'ip' or 'mac'" });
    }

    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const doc = await db.collection("users").doc(user.uid).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const userData = doc.data();
    const whitelist = userData?.whitelist || {
      trustedIpRanges: [],
      trustedMacAddresses: []
    };

    if (type === "ip") {
      if (whitelist.trustedIpRanges.includes(value)) {
        return res.status(400).json({ message: "IP range already in whitelist" });
      }
      whitelist.trustedIpRanges.push(value);
    } else {
      if (whitelist.trustedMacAddresses.includes(value)) {
        return res.status(400).json({ message: "MAC address already in whitelist" });
      }
      whitelist.trustedMacAddresses.push(value);
    }

    await db.collection("users").doc(user.uid).set(
      {
        whitelist,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return res.json({ message: "Item added to whitelist successfully", whitelist });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to add to whitelist" });
  }
};

// DELETE /api/users/me/whitelist/:id - remove an item from whitelist
export const removeFromWhitelist = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user?.uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!type || (type !== "ip" && type !== "mac")) {
      return res.status(400).json({ message: "Valid type query parameter (ip or mac) is required" });
    }

    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    const doc = await db.collection("users").doc(user.uid).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const userData = doc.data();
    const whitelist = userData?.whitelist || {
      trustedIpRanges: [],
      trustedMacAddresses: []
    };

    if (type === "ip") {
      const index = whitelist.trustedIpRanges.indexOf(id);
      if (index === -1) {
        return res.status(404).json({ message: "IP range not found in whitelist" });
      }
      whitelist.trustedIpRanges.splice(index, 1);
    } else {
      const index = whitelist.trustedMacAddresses.indexOf(id);
      if (index === -1) {
        return res.status(404).json({ message: "MAC address not found in whitelist" });
      }
      whitelist.trustedMacAddresses.splice(index, 1);
    }

    await db.collection("users").doc(user.uid).set(
      {
        whitelist,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return res.json({ message: "Item removed from whitelist successfully", whitelist });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to remove from whitelist" });
  }
};
