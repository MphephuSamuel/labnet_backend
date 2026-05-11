export interface TrafficPayload {
  ip: string;
  macHash: string;
  bytesSent: number;
  bytesReceived: number;
}

export interface TrafficRecord {
  bytesSent: number;
  bytesReceived: number;
  timestamp: Date;
}

export interface DeviceTrafficInfo {
  deviceId: string;
  ip: string;
  bytesSent: number;
  bytesReceived: number;
  timestamp: Date;
}