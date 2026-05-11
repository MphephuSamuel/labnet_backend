export interface Device {
  hostname: string;
  ip: string;
  mac: string;
  type: string;
  lastSeen: string; // timestamp
}

export interface Session {
  deviceId: string;
  connectedAt: string; // timestamp
  disconnectedAt: string; // timestamp
  bandwidth: number;
  anomaly: boolean;
}