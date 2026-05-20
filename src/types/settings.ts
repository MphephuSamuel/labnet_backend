export interface SecuritySettings {
  anomalyDetectionEnabled: boolean;
  detectionSensitivity: number;
  autoBlockThreats: boolean;
  simulationMode: boolean;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  pushNotifications: boolean;
}

export interface Settings {
  biometricEnabled: boolean;
  themeMode: "light" | "dark" | "auto";
  security: SecuritySettings;
  notifications: NotificationSettings;
}

export interface Whitelist {
  trustedIpRanges: string[];
  trustedMacAddresses: string[];
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
}

export interface WhitelistItem {
  id: string;
  type: "ip" | "mac";
  value: string;
  description?: string;
  createdAt: Date;
}
