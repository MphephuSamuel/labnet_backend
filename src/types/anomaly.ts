export type AnomalyType = "anomaly";

export type Severity = "low" | "medium" | "high";

export interface Anomaly {
  id?: string;
  deviceId: string;
  deviceType: string;
  hostName: string;
  ip: string;
  type: AnomalyType;
  severity: Severity;
  message: string;
  userId: string;
  createdAt?: any;
}