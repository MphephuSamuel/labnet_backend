export type Severity = "low" | "medium" | "high" | "critical";

export interface Threat {
  id?: string;
  deviceId: string;
  deviceType?: string;
  hostName?: string;
  ip?: string;
  type: "threat";
  severity: Severity;
  message: string;
  userId: string;
  createdAt?: FirebaseFirestore.Timestamp;
}