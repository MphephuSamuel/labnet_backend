export type HistoryType =
  | "connection"
  | "disconnection"
  | "anomaly"
  | "update"
  | "scan";

export interface History {
  deviceType: string;
  hostName: string;
  ip: string;
  title: string;
  type: HistoryType;
  createdAt: FirebaseFirestore.Timestamp;
  userId: string;
}